import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { MusicAppShell } from '@/components/music-app-shell';
import { WireframeTheme } from '@/constants/wireframe-theme';
import { downloadSong, searchSongs, type SongDto } from '@/services/music-api';

type Song = SongDto & { durationLabel: string };

const FALLBACK_THUMB =
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=900&q=80';

function formatDuration(seconds: number) {
  const total = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function withFallbackThumb(url: string) {
  return url?.trim() ? url : FALLBACK_THUMB;
}

export default function TracksScreen() {
  const [query, setQuery] = useState('Moji ShortBaba - songs');
  const [songs, setSongs] = useState<Song[]>([]);
  const [selectedSongId, setSelectedSongId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState('');
  const { width } = useWindowDimensions();

  const columns = width >= 1220 ? 3 : width >= 780 ? 2 : 1;

  useEffect(() => {
    const timeout = setTimeout(async () => {
      try {
        setIsLoading(true);
        setError('');

        const results = await searchSongs(query || 'Moji ShortBaba', 30);
        const mapped = results.map((song) => ({
          ...song,
          thumbnail: withFallbackThumb(song.thumbnail),
          durationLabel: formatDuration(song.duration),
        }));

        setSongs(mapped);
        if (mapped.length > 0) {
          setSelectedSongId((prev) => prev || mapped[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load songs');
      } finally {
        setIsLoading(false);
      }
    }, 350);

    return () => clearTimeout(timeout);
  }, [query]);

  const selectedSong = useMemo(() => {
    return songs.find((song) => song.id === selectedSongId) ?? songs[0];
  }, [songs, selectedSongId]);

  const heroThumb = selectedSong?.thumbnail || FALLBACK_THUMB;

  const onDownload = async (song: Song) => {
    try {
      setDownloadingId(song.id);
      await downloadSong(song);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setDownloadingId('');
    }
  };

  return (
    <MusicAppShell>
      <ImageBackground source={{ uri: heroThumb }} style={styles.hero} imageStyle={styles.heroImage}>
        <View style={styles.heroOverlay} />
        <View style={styles.heroTopRow}>
          <Text style={styles.heroLabel}>LIVE FROM CLI_MUSIC</Text>
          <View style={styles.liveBadge}>
            <MaterialIcons name="cloud-done" size={14} color={WireframeTheme.textPrimary} />
            <Text style={styles.liveBadgeText}>Synced</Text>
          </View>
        </View>
        <Text numberOfLines={1} style={styles.heroTitle}>
          Search. Play. Download.
        </Text>
        <Text numberOfLines={2} style={styles.heroSubtitle}>
          Search for your favorite songs, download them directly to your device, and enjoy seamless playback—all in one app.
        </Text>
      </ImageBackground>

      <View style={styles.searchWrap}>
        <MaterialIcons name="search" size={20} color={WireframeTheme.textSecondary} />
        <TextInput
          placeholder="Search songs or artists"
          placeholderTextColor={WireframeTheme.textSecondary}
          value={query}
          onChangeText={setQuery}
          style={styles.searchInput}
        />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Search Results</Text>
        <Text style={styles.sectionMeta}>{songs.length} tracks</Text>
      </View>

      {isLoading ? (
        <View style={styles.centeredState}>
          <ActivityIndicator size="small" color={WireframeTheme.textPrimary} />
          <Text style={styles.stateText}>Fetching songs...</Text>
        </View>
      ) : (
        <FlatList
          data={songs}
          key={`tracks-${columns}`}
          keyExtractor={(item) => item.id}
          numColumns={columns}
          columnWrapperStyle={columns > 1 ? styles.gridRow : undefined}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isActive = item.id === selectedSong?.id;
            const isDownloading = downloadingId === item.id;

            return (
              <Pressable
                style={[styles.card, columns > 1 ? styles.cardGrid : null, isActive ? styles.cardActive : null]}
                onPress={() => setSelectedSongId(item.id)}>
                <Image source={{ uri: item.thumbnail }} style={styles.cardBackground} resizeMode="cover" />
                <View style={styles.cardOverlay} />
                <Image source={{ uri: item.thumbnail }} style={styles.coverArt} />
                <View style={styles.cardTextWrap}>
                  <Text numberOfLines={1} style={styles.songTitle}>
                    {item.title}
                  </Text>
                  <Text numberOfLines={1} style={styles.songArtist}>
                    {item.artist}
                  </Text>
                </View>
                <Text style={styles.songDuration}>{item.durationLabel}</Text>
                <Pressable onPress={() => onDownload(item)} hitSlop={8}>
                  {isDownloading ? (
                    <ActivityIndicator size="small" color={WireframeTheme.textPrimary} />
                  ) : (
                    <MaterialIcons name="download" size={22} color={WireframeTheme.textPrimary} />
                  )}
                </Pressable>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={styles.centeredState}>
              <Text style={styles.stateText}>No matching tracks found.</Text>
            </View>
          }
        />
      )}

      {!!selectedSong && (
        <View style={styles.miniPlayer}>
          <Image source={{ uri: selectedSong.thumbnail }} style={styles.miniCover} />
          <View style={styles.cardTextWrap}>
            <Text numberOfLines={1} style={styles.songTitle}>
              {selectedSong.title}
            </Text>
            <Text numberOfLines={1} style={styles.songArtist}>
              {selectedSong.artist}
            </Text>
          </View>
          <MaterialIcons name="play-arrow" size={26} color={WireframeTheme.textPrimary} />
        </View>
      )}
    </MusicAppShell>
  );
}

const styles = StyleSheet.create({
  hero: {
    minHeight: 172,
    borderRadius: 20,
    overflow: 'hidden',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 12,
  },
  heroImage: {
    opacity: 0.52,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6, 22, 45, 0.62)',
  },
  heroTopRow: {
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroLabel: {
    color: WireframeTheme.textPrimary,
    fontWeight: '700',
    letterSpacing: 1,
    fontSize: 11,
  },
  liveBadge: {
    marginLeft: 'auto',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    backgroundColor: 'rgba(7, 27, 50, 0.62)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveBadgeText: {
    color: WireframeTheme.textPrimary,
    fontSize: 11,
    fontWeight: '600',
  },
  heroTitle: {
    zIndex: 2,
    color: WireframeTheme.textPrimary,
    fontSize: 30,
    fontWeight: '700',
    marginTop: 14,
  },
  heroSubtitle: {
    zIndex: 2,
    color: WireframeTheme.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    maxWidth: 560,
  },
  searchWrap: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: WireframeTheme.border,
    backgroundColor: WireframeTheme.panel,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  searchInput: {
    color: WireframeTheme.textPrimary,
    flex: 1,
    fontSize: 15,
  },
  errorText: {
    color: '#ffd0d0',
    fontSize: 12,
    marginBottom: 8,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 8,
  },
  sectionTitle: {
    color: WireframeTheme.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  sectionMeta: {
    marginLeft: 'auto',
    color: WireframeTheme.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  centeredState: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  stateText: {
    color: WireframeTheme.textSecondary,
    fontSize: 12,
  },
  listContent: {
    paddingBottom: 14,
    gap: 10,
  },
  gridRow: {
    gap: 10,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WireframeTheme.border,
    backgroundColor: WireframeTheme.panelElevated,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    overflow: 'hidden',
  },
  cardGrid: {
    flex: 1,
  },
  cardActive: {
    borderColor: '#9cb9df',
  },
  cardBackground: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.2,
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 28, 54, 0.78)',
  },
  coverArt: {
    width: 48,
    height: 48,
    borderRadius: 10,
    zIndex: 2,
  },
  cardTextWrap: {
    flex: 1,
    marginLeft: 10,
    zIndex: 2,
  },
  songTitle: {
    color: WireframeTheme.textPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
  songArtist: {
    color: WireframeTheme.textSecondary,
    marginTop: 2,
    fontSize: 12,
  },
  songDuration: {
    color: WireframeTheme.textSecondary,
    fontSize: 12,
    marginHorizontal: 8,
    zIndex: 2,
  },
  miniPlayer: {
    borderTopWidth: 1,
    borderColor: WireframeTheme.border,
    backgroundColor: '#0b1f3d',
    borderRadius: 16,
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniCover: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
});
