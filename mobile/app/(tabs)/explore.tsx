import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  Audio,
  InterruptionModeAndroid,
  InterruptionModeIOS,
  type AVPlaybackStatus,
  type AVPlaybackStatusSuccess,
} from 'expo-av';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { MusicAppShell } from '@/components/music-app-shell';
import { WireframeTheme } from '@/constants/wireframe-theme';
import { downloadSong, getPreloadedSongs, getSongStream, searchSongs, type SongDto } from '@/services/music-api';

const FALLBACK_THUMB =
  'https://images.unsplash.com/photo-1507838153414-b4b713384a76?auto=format&fit=crop&w=900&q=80';

function withFallbackThumb(url: string) {
  return url?.trim() ? url : FALLBACK_THUMB;
}

function formatDuration(seconds: number) {
  const total = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function PlayerScreen() {
  const [queue, setQueue] = useState<SongDto[]>([]);
  const [activeId, setActiveId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isResolvingStream, setIsResolvingStream] = useState(false);
  const [error, setError] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [shuffleOn, setShuffleOn] = useState(false);
  const [repeatOn, setRepeatOn] = useState(false);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(0);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const { width } = useWindowDimensions();

  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      shouldDuckAndroid: true,
      staysActiveInBackground: false,
      playThroughEarpieceAndroid: false,
    }).catch(() => {
      // Keep UI functional even if mode setup fails on some environments.
    });
  }, []);

  useEffect(() => {
    const loadQueue = async () => {
      try {
        setIsLoading(true);
        setError('');
        const songs = await getPreloadedSongs();
        const normalized = songs.map((song) => ({ ...song, thumbnail: withFallbackThumb(song.thumbnail) }));
        setQueue(normalized);
        if (normalized.length > 0) {
          setActiveId(normalized[0].id);
        }
      } catch (err) {
        try {
          const fallback = await searchSongs('Moji Shortbaba songs', 20);
          const normalized = fallback.map((song) => ({ ...song, thumbnail: withFallbackThumb(song.thumbnail) }));
          setQueue(normalized);
          setActiveId(normalized[0]?.id ?? '');
        } catch (fallbackErr) {
          setError(fallbackErr instanceof Error ? fallbackErr.message : 'Failed to load queue');
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadQueue();
  }, []);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync().catch(() => {
          // Ignore cleanup errors during unmount.
        });
      }
    };
  }, [sound]);

  const activeSong = useMemo(() => {
    return queue.find((song: SongDto) => song.id === activeId) ?? queue[0];
  }, [queue, activeId]);

  const isTablet = width >= 760;
  const isDesktop = width >= 1100;

  const activeIndex = queue.findIndex((song: SongDto) => song.id === activeSong?.id);

  const loadAndPlaySong = async (song: SongDto, autoPlay = true) => {
    try {
      setError('');
      setIsResolvingStream(true);

      if (sound) {
        await sound.unloadAsync();
      }

      const stream = await getSongStream(song.webpage_url);
      const newSound = new Audio.Sound();

      newSound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
        if (!status.isLoaded) {
          return;
        }

        const loadedStatus = status as AVPlaybackStatusSuccess;

        setIsPlaying(loadedStatus.isPlaying);
        setPositionMillis(loadedStatus.positionMillis ?? 0);
        setDurationMillis(loadedStatus.durationMillis ?? 0);

        if (loadedStatus.didJustFinish) {
          if (repeatOn && activeSong) {
            loadAndPlaySong(activeSong, true).catch(() => {
              setIsPlaying(false);
            });
            return;
          }

          setIsPlaying(false);
        }
      });

      await newSound.loadAsync(
        { uri: stream.stream_url },
        { shouldPlay: autoPlay, progressUpdateIntervalMillis: 300 },
      );

      setSound(newSound);
      setIsPlaying(autoPlay);
      setDurationMillis((stream.duration || song.duration) * 1000);
      setPositionMillis(0);
      setActiveId(song.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start playback');
    } finally {
      setIsResolvingStream(false);
    }
  };

  const onTogglePlay = async () => {
    if (!activeSong) {
      return;
    }

    if (!sound) {
      await loadAndPlaySong(activeSong, true);
      return;
    }

    const status = await sound.getStatusAsync();
    if (!status.isLoaded) {
      await loadAndPlaySong(activeSong, true);
      return;
    }

    if (status.isPlaying) {
      await sound.pauseAsync();
      setIsPlaying(false);
    } else {
      await sound.playAsync();
      setIsPlaying(true);
    }
  };

  const onNext = async () => {
    if (!queue.length) {
      return;
    }

    const nextIndex = shuffleOn
      ? Math.floor(Math.random() * queue.length)
      : activeIndex < 0
        ? 0
        : (activeIndex + 1) % queue.length;
    await loadAndPlaySong(queue[nextIndex], true);
  };

  const onPrev = async () => {
    if (!queue.length) {
      return;
    }

    const prevIndex = activeIndex <= 0 ? queue.length - 1 : activeIndex - 1;
    await loadAndPlaySong(queue[prevIndex], true);
  };

  const progress = durationMillis > 0 ? Math.min(1, positionMillis / durationMillis) : 0;
  const progressPercent = `${Math.max(0, Math.min(100, progress * 100))}%` as `${number}%`;
  const elapsedText = formatDuration(Math.floor(positionMillis / 1000));
  const durationText = formatDuration(Math.floor((durationMillis || (activeSong?.duration ?? 0) * 1000) / 1000));

  const onDownloadActive = async () => {
    if (!activeSong) {
      return;
    }

    try {
      setIsDownloading(true);
      await downloadSong(activeSong );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <MusicAppShell>
      <ImageBackground
        source={{ uri: activeSong?.thumbnail || FALLBACK_THUMB }}
        style={styles.playerCard}
        imageStyle={styles.playerCardImage}>
        <View style={styles.playerOverlay} />

        <View style={styles.headerRow}>
          <Text style={styles.nowPlaying}>NOW PLAYING</Text>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={WireframeTheme.textPrimary} />
            <Text style={styles.loadingText}>Loading queue...</Text>
          </View>
        ) : (
          <View style={[styles.mainBody, isTablet ? styles.mainBodyTablet : null]}>
            <View style={[styles.artPanel, isDesktop ? styles.artPanelDesktop : null]}>
              {activeSong ? (
                <>
                  <Image source={{ uri: activeSong.thumbnail }} style={styles.coverArt} />
                  <Text numberOfLines={1} style={styles.songTitle}>
                    {activeSong.title}
                  </Text>
                  <Text numberOfLines={1} style={styles.songArtist}>
                    {activeSong.artist}
                  </Text>
                </>
              ) : (
                <Text style={styles.loadingText}>No songs in queue</Text>
              )}
            </View>

            <View style={[styles.controlsPanel, isDesktop ? styles.controlsPanelDesktop : null]}>
              <View style={styles.sliderRow}>
                <Text style={styles.timeText}>{elapsedText}</Text>
                <View style={styles.sliderTrack}>
                  <View style={[styles.sliderProgress, { width: progressPercent }]} />
                  <View style={[styles.sliderThumb, { left: progressPercent }]} />
                </View>
                <Text style={styles.timeText}>{durationText}</Text>
              </View>

              <View style={[styles.controlsRow, isTablet ? styles.controlsRowTablet : null]}>
                <Pressable
                  style={[styles.controlButton, shuffleOn ? styles.controlButtonActive : null]}
                  onPress={() => setShuffleOn(!shuffleOn)}>
                  <MaterialIcons name="shuffle" size={22} color={shuffleOn ? '#7ed7ff' : WireframeTheme.textPrimary} />
                </Pressable>
                <Pressable style={styles.controlButton} onPress={onPrev}>
                  <MaterialIcons name="skip-previous" size={24} color={WireframeTheme.textPrimary} />
                </Pressable>
                <Pressable style={styles.playButton} onPress={onTogglePlay}>
                  <MaterialIcons
                    name={isResolvingStream ? 'hourglass-top' : isPlaying ? 'pause' : 'play-arrow'}
                    size={30}
                    color={WireframeTheme.textPrimary}
                  />
                </Pressable>
                <Pressable style={styles.controlButton} onPress={onNext}>
                  <MaterialIcons name="skip-next" size={24} color={WireframeTheme.textPrimary} />
                </Pressable>
                <Pressable
                  style={[styles.controlButton, repeatOn ? styles.controlButtonActive : null]}
                  onPress={() => setRepeatOn(!repeatOn)}>
                  <MaterialIcons name="repeat" size={22} color={repeatOn ? '#7ed7ff' : WireframeTheme.textPrimary} />
                </Pressable>
              </View>

              <Text style={styles.queueLabel}>UP NEXT</Text>
              <ScrollView style={styles.queueList} contentContainerStyle={styles.queueListContent}>
                {queue.map((song: SongDto) => {
                  const isActive = song.id === activeSong?.id;

                  return (
                    <Pressable
                      key={song.id}
                      style={[styles.queueItem, isActive ? styles.queueItemActive : null]}
                      onPress={() => loadAndPlaySong(song, true)}>
                      <Image source={{ uri: song.thumbnail }} style={styles.queueThumb} />
                      <View style={styles.queueTextWrap}>
                        <Text numberOfLines={1} style={styles.queueTitle}>
                          {song.title}
                        </Text>
                        <Text numberOfLines={1} style={styles.queueArtist}>
                          {song.artist}
                        </Text>
                      </View>
                      <Text style={styles.queueDuration}>{formatDuration(song.duration)}</Text>
                      <Pressable onPress={onDownloadActive} hitSlop={8}>
                    {isDownloading ? (
                        <ActivityIndicator size="small" color={WireframeTheme.textPrimary} />
                    ) : (
                        <MaterialIcons name="download" size={20} color={WireframeTheme.textPrimary} />
                    )}
                    </Pressable>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        )}
      </ImageBackground>
    </MusicAppShell>
  );
}

const styles = StyleSheet.create({
  playerCard: {
    flex: 1,
    borderRadius: 0,
    overflow: 'hidden',
    borderWidth: 0,
    borderColor: WireframeTheme.border,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
  },
  playerCardImage: {
    opacity: 0.45,
  },
  playerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 18, 36, 0.72)',
  },
  headerRow: {
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  nowPlaying: {
    color: WireframeTheme.textPrimary,
    letterSpacing: 1,
    fontWeight: '700',
    fontSize: 12,
  },
  headerIcons: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    zIndex: 2,
    color: '#ffd0d0',
    fontSize: 12,
    marginTop: 6,
  },
  loadingWrap: {
    zIndex: 2,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    color: WireframeTheme.textSecondary,
  },
  mainBody: {
    zIndex: 2,
    flex: 1,
    marginTop: 14,
    gap: 14,
  },
  mainBodyTablet: {
    flexDirection: 'row',
  },
  artPanel: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.24)',
    backgroundColor: 'rgba(9, 31, 58, 0.52)',
    padding: 0,
    alignItems: 'center',
  },
  artPanelDesktop: {
    flex: 1,
    justifyContent: 'center',
  },
  coverArt: {
    width: 238,
    height: 238,
    maxWidth: '100%',
    borderRadius: 20,
  },
  songTitle: {
    color: WireframeTheme.textPrimary,
    fontSize: 24,
    fontWeight: '700',
    marginTop: 12,
  },
  songArtist: {
    color: WireframeTheme.textSecondary,
    marginTop: 5,
    marginBottom: 2,
  },
  controlsPanel: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.24)',
    backgroundColor: 'rgba(8, 27, 50, 0.64)',
    padding: 12,
  },
  controlsPanelDesktop: {
    flex: 1.2,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timeText: {
    color: WireframeTheme.textSecondary,
    fontSize: 12,
    width: 36,
    textAlign: 'center',
  },
  sliderTrack: {
    flex: 1,
    height: 5,
    borderRadius: 5,
    backgroundColor: '#97a7bf',
    justifyContent: 'center',
  },
  sliderProgress: {
    width: '42%',
    height: 5,
    borderRadius: 5,
    backgroundColor: '#ffffff',
  },
  sliderThumb: {
    position: 'absolute',
    left: '42%',
    marginLeft: -6,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ffffff',
  },
  controlsRow: {
    marginTop: 20,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  controlsRowTablet: {
    paddingHorizontal: 10,
  },
  controlButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonActive: {
    backgroundColor: 'rgba(126, 215, 255, 0.18)',
    borderColor: 'rgba(126, 215, 255, 0.52)',
  },
  playButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  queueLabel: {
    color: WireframeTheme.textPrimary,
    fontWeight: '700',
    letterSpacing: 0.8,
    fontSize: 12,
  },
  queueList: {
    marginTop: 8,
    flex: 1,
  },
  queueListContent: {
    paddingBottom: 8,
    gap: 8,
  },
  queueItem: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  queueItemActive: {
    borderColor: '#ffffff',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  queueThumb: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  queueTextWrap: {
    flex: 1,
  },
  queueTitle: {
    color: WireframeTheme.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  queueArtist: {
    color: WireframeTheme.textSecondary,
    marginTop: 2,
    fontSize: 12,
  },
  queueDuration: {
    color: WireframeTheme.textSecondary,
    fontSize: 11,
  },
});
