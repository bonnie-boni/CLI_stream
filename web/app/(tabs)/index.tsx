import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import { MusicAppShell } from '@/components/music-app-shell';
import { getPreloadedSongs, searchSongs, type SongDto } from '@/services/music-api';

const FALLBACK_THUMB =
  'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=600&q=80';

function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds || 0));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function SearchScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const titleSize = width >= 900 ? 38 : width >= 640 ? 26 : 20;

  const [query, setQuery] = useState('moji short baba songs');
  const [songs, setSongs] = useState<SongDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    const loadPreloaded = async () => {
      try {
        setIsLoading(true);
        setError('');
        const preloaded = await getPreloadedSongs(controller.signal);
        setSongs(preloaded);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError(err instanceof Error ? err.message : 'Failed to load songs');
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadPreloaded();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSongs([]);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        setIsLoading(true);
        setError('');
        const data = await searchSongs(trimmed, 20, controller.signal);
        setSongs(data);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError(err instanceof Error ? err.message : 'Search failed');
        }
      } finally {
        setIsLoading(false);
      }
    }, 240);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  return (
    <MusicAppShell>
      <View style={styles.page}>
        <View style={[styles.container, isWide ? styles.containerWide : null]}>
          <View style={styles.searchBar}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search song"
              placeholderTextColor="#8e8f95"
              style={styles.searchInput}
            />
            <MaterialIcons name="search" size={20} color="#8e8f95" />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <FlatList
            data={songs}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => (
              <Pressable
                style={styles.songRow}
                onPress={() =>
                  router.push({
                    pathname: '/(tabs)/explore',
                    params: {
                      id: item.id,
                      title: item.title,
                      artist: item.artist,
                      duration: String(item.duration),
                      webpage_url: item.webpage_url,
                      thumbnail: item.thumbnail || FALLBACK_THUMB,
                    },
                  })
                }>
                <Image source={{ uri: item.thumbnail || FALLBACK_THUMB }} style={styles.thumb} />
                <View style={styles.rowText}>
                  <Text numberOfLines={2} style={[styles.title, { fontSize: titleSize, lineHeight: titleSize + 4 }]}>
                    {item.title}
                  </Text>
                  <Text style={styles.duration}>Duration: {formatDuration(item.duration)}</Text>
                </View>
                <MaterialIcons name="chevron-right" size={22} color="#b8b8be" />
              </Pressable>
            )}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                {isLoading ? (
                  <>
                    <ActivityIndicator size="small" color="#3b82f6" />
                    <Text style={styles.emptyText}>Loading songs...</Text>
                  </>
                ) : (
                  <Text style={styles.emptyText}>No songs found.</Text>
                )}
              </View>
            }
          />
        </View>
      </View>
    </MusicAppShell>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#e7e7ea',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 860,
    alignSelf: 'center',
  },
  containerWide: {
    paddingTop: 8,
  },
  searchBar: {
    height: 42,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#c9c9cf',
    backgroundColor: '#f7f7f8',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: '#17181c',
    fontSize: 16,
  },
  listContent: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#cdced4',
    backgroundColor: '#efeff2',
  },
  separator: {
    height: 1,
    backgroundColor: '#d6d7dd',
  },
  songRow: {
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 92,
  },
  thumb: {
    width: 112,
    height: 72,
    borderRadius: 2,
    backgroundColor: '#c8cad1',
  },
  rowText: {
    flex: 1,
    gap: 8,
  },
  title: {
    color: '#12131a',
    fontFamily: 'Georgia',
  },
  duration: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#d0d0d5',
    backgroundColor: '#f7f7f8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 14,
    color: '#1f2330',
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyText: {
    color: '#4e5362',
    fontSize: 14,
  },
  errorText: {
    marginTop: 8,
    color: '#b42318',
    fontSize: 13,
  },
});
