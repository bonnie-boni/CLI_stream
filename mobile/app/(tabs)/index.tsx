import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { MusicAppShell } from '@/components/music-app-shell';
import { WireframeTheme } from '@/constants/wireframe-theme';
import { downloadSong, getPreloadedSongs, searchSongs, type SongDto } from '@/services/music-api';

type Song = SongDto & { durationLabel: string };

type FilterTab = 'Videos' | 'Songs' | 'Playlists' | 'Folders' | 'Artists' | 'Albums';

const FILTERS: FilterTab[] = ['Videos', 'Songs', 'Playlists', 'Folders', 'Artists', 'Albums'];
const FALLBACK_THUMB =
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=80';

function formatDuration(seconds: number) {
  const total = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function normalizeSongs(input: SongDto[]): Song[] {
  return input.map((song) => ({
    ...song,
    thumbnail: song.thumbnail?.trim() ? song.thumbnail : FALLBACK_THUMB,
    durationLabel: formatDuration(song.duration),
  }));
}

export default function TracksScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const [activeFilter, setActiveFilter] = useState<FilterTab>('Songs');
  const [query, setQuery] = useState('Moji Shortbaba songs');
  const [songs, setSongs] = useState<Song[]>([]);
  const [selectedSongId, setSelectedSongId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    const run = async () => {
      try {
        setIsLoading(true);
        setError('');
        const preloaded = await getPreloadedSongs(controller.signal);
        const mapped = normalizeSongs(preloaded);
        setSongs(mapped);
        setSelectedSongId(mapped[0]?.id ?? '');
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError('Using live search. Preloaded songs unavailable.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    run();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        setIsLoading(true);
        setError('');
        const results = await searchSongs(trimmed, 18, controller.signal);
        const mapped = normalizeSongs(results);
        setSongs(mapped);
        setSelectedSongId((prev) => (mapped.some((song) => song.id === prev) ? prev : (mapped[0]?.id ?? '')));
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError(err instanceof Error ? err.message : 'Search failed');
        }
      } finally {
        setIsLoading(false);
      }
    }, 220);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  const selectedSong = useMemo(() => {
    return songs.find((song) => song.id === selectedSongId) ?? songs[0];
  }, [songs, selectedSongId]);

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

  const renderSongRow = ({ item, index }: { item: Song; index: number }) => {
    const isActive = item.id === selectedSong?.id;
    const isDownloading = downloadingId === item.id;

    return (
      <Pressable style={[styles.songRow, isActive ? styles.songRowActive : null]} onPress={() => setSelectedSongId(item.id)}>
        <View style={styles.rowIndexWrap}>
          <Text style={styles.rowIndex}>{index + 1}</Text>
        </View>
        <Image source={{ uri: item.thumbnail }} style={styles.thumb} />
        <View style={styles.rowTextWrap}>
          <Text numberOfLines={1} style={[styles.rowTitle, isActive ? styles.rowTitleActive : null]}>
            {item.title}
          </Text>
          <Text numberOfLines={1} style={styles.rowArtist}>
            {item.artist}
          </Text>
        </View>
        <Text style={styles.rowDuration}>{item.durationLabel}</Text>
        <Pressable onPress={() => onDownload(item)} style={styles.rowIconButton}>
          {isDownloading ? (
            <ActivityIndicator size="small" color={WireframeTheme.textPrimary} />
          ) : (
            <MaterialIcons name="download" size={20} color={WireframeTheme.textSecondary} />
          )}
        </Pressable>
      </Pressable>
    );
  };

  return (
    <MusicAppShell>
      <View style={styles.page}>
        <View style={[styles.contentPane, isDesktop ? styles.contentPaneDesktop : null]}>
          <View style={styles.searchBar}>
            <MaterialIcons name="search" size={19} color={WireframeTheme.textSecondary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search songs"
              placeholderTextColor={WireframeTheme.textSecondary}
              style={styles.searchInput}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {FILTERS.map((filter) => {
              const isActive = filter === activeFilter;
              return (
                <Pressable
                  key={filter}
                  style={[styles.chip, isActive ? styles.chipActive : null]}
                  onPress={() => setActiveFilter(filter)}>
                  <Text style={[styles.chipText, isActive ? styles.chipTextActive : null]}>{filter}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <FlatList
            data={songs}
            keyExtractor={(item) => item.id}
            renderItem={renderSongRow}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                {isLoading ? (
                  <>
                    <ActivityIndicator size="small" color={WireframeTheme.textPrimary} />
                    <Text style={styles.emptyText}>Loading songs...</Text>
                  </>
                ) : (
                  <Text style={styles.emptyText}>No songs found.</Text>
                )}
              </View>
            }
          />
        </View>

        {isDesktop ? (
          <View style={styles.desktopPane}>
            <Image source={{ uri: selectedSong?.thumbnail || FALLBACK_THUMB }} style={styles.desktopArtwork} />
            <Text numberOfLines={2} style={styles.desktopTitle}>
              {selectedSong?.title || 'Select a song'}
            </Text>
            <Text numberOfLines={1} style={styles.desktopArtist}>
              {selectedSong?.artist || 'Moji Shortbaba'}
            </Text>
            <Pressable style={styles.desktopPlay} onPress={() => router.push('/(tabs)/explore')}>
              <MaterialIcons name="play-arrow" size={22} color="#05080f" />
              <Text style={styles.desktopPlayText}>Open Player</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {!!selectedSong && (
        <View style={styles.miniPlayer}>
          <Image source={{ uri: selectedSong.thumbnail }} style={styles.miniCover} />
          <View style={styles.miniTextWrap}>
            <Text numberOfLines={1} style={styles.miniTitle}>
              {selectedSong.title}
            </Text>
            <Text numberOfLines={1} style={styles.miniArtist}>
              {selectedSong.artist}
            </Text>
          </View>
          <Pressable style={styles.miniIcon} onPress={() => router.push('/(tabs)/explore')}>
            <MaterialIcons name="play-arrow" size={24} color={WireframeTheme.textPrimary} />
          </Pressable>
          <Pressable style={styles.miniIcon} onPress={() => router.push('/(tabs)/explore')}>
            <MaterialIcons name="skip-next" size={24} color={WireframeTheme.textPrimary} />
          </Pressable>
        </View>
      )}
    </MusicAppShell>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#06090f',
    flexDirection: 'row',
  },
  contentPane: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  contentPaneDesktop: {
    paddingHorizontal: 24,
    paddingTop: 18,
  },
  searchBar: {
    height: 44,
    borderRadius: 12,
    backgroundColor: '#121722',
    borderWidth: 1,
    borderColor: '#222a3a',
    paddingHorizontal: 12,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
  },
  searchInput: {
    flex: 1,
    color: '#edf3ff',
    fontSize: 15,
  },
  chipsRow: {
    marginTop: 10,
    paddingBottom: 4,
    gap: 8,
  },
  chip: {
    backgroundColor: '#111723',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#202a3a',
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipActive: {
    backgroundColor: '#1e8fff',
    borderColor: '#1e8fff',
  },
  chipText: {
    color: '#c0cae0',
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#ffffff',
  },
  errorText: {
    marginTop: 6,
    color: '#ffb7b7',
    fontSize: 12,
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 110,
    gap: 6,
  },
  songRow: {
    backgroundColor: '#0e131d',
    borderWidth: 1,
    borderColor: '#1a2432',
    borderRadius: 12,
    paddingVertical: 7,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  songRowActive: {
    borderColor: '#3f6da3',
    backgroundColor: '#111b2a',
  },
  rowIndexWrap: {
    width: 22,
    alignItems: 'center',
  },
  rowIndex: {
    color: '#7f91ac',
    fontWeight: '700',
    fontSize: 12,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#1f2735',
  },
  rowTextWrap: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },
  rowTitle: {
    color: '#f4f8ff',
    fontWeight: '700',
    fontSize: 15,
  },
  rowTitleActive: {
    color: '#56b4ff',
  },
  rowArtist: {
    marginTop: 2,
    color: '#9daac2',
    fontSize: 12,
  },
  rowDuration: {
    color: '#9daac2',
    fontSize: 12,
    marginRight: 8,
  },
  rowIconButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniPlayer: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2d2730',
    backgroundColor: 'rgba(56, 28, 34, 0.94)',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  miniCover: {
    width: 46,
    height: 46,
    borderRadius: 10,
    backgroundColor: '#1b2432',
  },
  miniTextWrap: {
    flex: 1,
  },
  miniTitle: {
    color: '#f3f8ff',
    fontSize: 16,
    fontWeight: '700',
  },
  miniArtist: {
    marginTop: 2,
    color: '#a4b3cc',
    fontSize: 12,
  },
  miniIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1a2230',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    gap: 8,
  },
  emptyText: {
    color: '#98a6be',
  },
  desktopPane: {
    width: 360,
    borderLeftWidth: 1,
    borderLeftColor: '#1a2432',
    backgroundColor: '#0b1019',
    padding: 22,
  },
  desktopArtwork: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 18,
    backgroundColor: '#1b2432',
  },
  desktopTitle: {
    marginTop: 14,
    color: '#f4f8ff',
    fontWeight: '700',
    fontSize: 24,
  },
  desktopArtist: {
    marginTop: 6,
    color: '#9daac2',
    fontSize: 14,
  },
  desktopPlay: {
    marginTop: 16,
    borderRadius: 999,
    backgroundColor: '#46b9ff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  desktopPlayText: {
    color: '#041221',
    fontWeight: '700',
    fontSize: 14,
  },
});
