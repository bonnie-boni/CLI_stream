import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { MusicAppShell } from '@/components/music-app-shell';

type Playlist = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  songCount: number;
};

const PLAYLISTS: Playlist[] = [
  { id: '1', title: 'Moji Favorites', subtitle: 'Most played tracks this month', icon: 'favorite', songCount: 28 },
  { id: '2', title: 'Worship Session', subtitle: 'Calm and uplifting songs', icon: 'church', songCount: 32 },
  { id: '3', title: 'Morning Drive', subtitle: 'Bright afro-gospel vibes', icon: 'directions-car', songCount: 19 },
  { id: '4', title: 'Offline Downloads', subtitle: 'Tracks stored on your device', icon: 'download-done', songCount: 44 },
  { id: '5', title: 'Mix Queue', subtitle: 'Automatic smart queue', icon: 'queue-music', songCount: 17 },
];

export default function PlaylistsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return PLAYLISTS;
    }

    return PLAYLISTS.filter((list) => `${list.title} ${list.subtitle}`.toLowerCase().includes(q));
  }, [query]);

  return (
    <MusicAppShell>
      <View style={styles.page}>
        <View style={[styles.mainPane, isDesktop ? styles.mainPaneDesktop : null]}>
          <Text style={styles.heading}>Your Library</Text>
          <Text style={styles.subheading}>Build playlists, keep downloads, and jump back into your favorite artists.</Text>

          <View style={styles.searchBar}>
            <MaterialIcons name="search" size={19} color="#9eb0ce" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search playlists"
              placeholderTextColor="#7f90ad"
              style={styles.searchInput}
            />
            <Pressable style={styles.addButton}>
              <MaterialIcons name="add" size={18} color="#ffffff" />
            </Pressable>
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <Pressable style={styles.card} onPress={() => router.push('/(tabs)')}>
                <View style={styles.iconWrap}>
                  <MaterialIcons name={item.icon} size={22} color="#f4f8ff" />
                </View>
                <View style={styles.cardTextWrap}>
                  <Text numberOfLines={1} style={styles.cardTitle}>
                    {item.title}
                  </Text>
                  <Text numberOfLines={1} style={styles.cardSubtitle}>
                    {item.subtitle}
                  </Text>
                </View>
                <View style={styles.countWrap}>
                  <Text style={styles.countText}>{item.songCount}</Text>
                  <Text style={styles.countLabel}>Songs</Text>
                </View>
              </Pressable>
            )}
          />
        </View>

        {isDesktop ? (
          <View style={styles.desktopPane}>
            <Text style={styles.desktopPaneTitle}>Quick Actions</Text>
            <Pressable style={styles.quickAction} onPress={() => router.push('/(tabs)')}>
              <MaterialIcons name="search" size={18} color="#45b5ff" />
              <Text style={styles.quickActionText}>Find more Moji songs</Text>
            </Pressable>
            <Pressable style={styles.quickAction} onPress={() => router.push('/(tabs)/explore')}>
              <MaterialIcons name="play-circle-filled" size={18} color="#45b5ff" />
              <Text style={styles.quickActionText}>Open full player</Text>
            </Pressable>
            <Pressable style={styles.quickAction}>
              <MaterialIcons name="download" size={18} color="#45b5ff" />
              <Text style={styles.quickActionText}>Manage downloads</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </MusicAppShell>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#070a10',
  },
  mainPane: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  mainPaneDesktop: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  heading: {
    color: '#f3f8ff',
    fontSize: 30,
    fontWeight: '800',
  },
  subheading: {
    marginTop: 4,
    color: '#9ba9c1',
    maxWidth: 620,
    fontSize: 13,
  },
  searchBar: {
    marginTop: 12,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1d2738',
    backgroundColor: '#111725',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#eff5ff',
    fontSize: 15,
  },
  addButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1f8cff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingTop: 10,
    paddingBottom: 24,
    gap: 8,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1b2534',
    backgroundColor: '#0f1622',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1a314d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextWrap: {
    flex: 1,
  },
  cardTitle: {
    color: '#f3f8ff',
    fontWeight: '700',
    fontSize: 16,
  },
  cardSubtitle: {
    marginTop: 3,
    color: '#96a7c2',
    fontSize: 12,
  },
  countWrap: {
    alignItems: 'flex-end',
    minWidth: 54,
  },
  countText: {
    color: '#45b5ff',
    fontWeight: '700',
    fontSize: 16,
  },
  countLabel: {
    color: '#8ea0bb',
    fontSize: 11,
  },
  desktopPane: {
    width: 320,
    borderLeftWidth: 1,
    borderLeftColor: '#1b2534',
    backgroundColor: '#0d131f',
    padding: 18,
    gap: 10,
  },
  desktopPaneTitle: {
    color: '#f3f8ff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  quickAction: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#223148',
    backgroundColor: '#121b2a',
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  quickActionText: {
    color: '#d8e4f6',
    fontWeight: '600',
  },
});
