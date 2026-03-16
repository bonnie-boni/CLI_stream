import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { MusicAppShell } from '@/components/music-app-shell';
import { WireframeTheme } from '@/constants/wireframe-theme';

type Playlist = {
  id: string;
  title: string;
  count: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
};

const lists: Playlist[] = [
  { id: '1', title: 'Liked Songs', count: '7 Songs', icon: 'favorite', color: WireframeTheme.accentRed },
  { id: '2', title: 'Last Played', count: '12 Songs', icon: 'history', color: WireframeTheme.accentTeal },
  { id: '3', title: 'Most Played', count: '12 Songs', icon: 'star', color: WireframeTheme.accentYellow },
  { id: '4', title: 'feat. SIRUP', count: '15 Songs', icon: 'person', color: '#8da1bd' },
  { id: '5', title: 'PROIBIDO C.V DJ VULDO PARAISO', count: '104 Songs', icon: 'album', color: '#8a91a2' },
];

const tabs = ['Tracks', 'Playlists', 'Import'] as const;

export default function PlaylistsScreen() {
  return (
    <MusicAppShell>
      <View style={styles.searchBar}>
        <MaterialIcons name="search" size={18} color={WireframeTheme.textSecondary} />
        <TextInput
          placeholder="Find your favorite songs"
          placeholderTextColor={WireframeTheme.textSecondary}
          style={styles.searchInput}
        />
      </View>

      <View style={styles.segmentRow}>
        {tabs.map((tab, idx) => (
          <Pressable key={tab} style={styles.segmentButton}>
            <Text style={[styles.segmentText, idx === 1 && styles.segmentTextActive]}>{tab}</Text>
            {idx === 1 ? <View style={styles.activeLine} /> : null}
          </Pressable>
        ))}
        <View style={styles.rowMenuIcon}>
          <MaterialIcons name="menu" size={18} color={WireframeTheme.textSecondary} />
        </View>
      </View>

      <Pressable style={styles.newPlaylistButton}>
        <View style={styles.newIconWrap}>
          <MaterialIcons name="add" size={18} color={WireframeTheme.activeBlue} />
        </View>
        <Text style={styles.newPlaylistText}>New Playlist</Text>
      </Pressable>

      <FlatList
        data={lists}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={[styles.iconBox, { backgroundColor: item.color }]}>
              <MaterialIcons name={item.icon} size={16} color="#f6f9ff" />
            </View>
            <View style={styles.textWrap}>
              <Text numberOfLines={1} style={styles.title}>
                {item.title}
              </Text>
              <Text style={styles.count}>{item.count}</Text>
            </View>
          </View>
        )}
      />

      <View style={styles.miniPlayer}>
        <View style={styles.miniCover} />
        <View style={styles.textWrap}>
          <Text numberOfLines={1} style={styles.title}>
            The Weeknd - Die For You
          </Text>
          <Text numberOfLines={1} style={styles.count}>
            The Weeknd
          </Text>
        </View>
        <MaterialIcons name="play-arrow" size={24} color={WireframeTheme.textPrimary} />
      </View>
    </MusicAppShell>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: WireframeTheme.border,
    backgroundColor: WireframeTheme.panel,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  searchInput: {
    color: WireframeTheme.textPrimary,
    flex: 1,
    fontSize: 14,
  },
  segmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  segmentButton: {
    marginRight: 16,
    paddingBottom: 8,
  },
  segmentText: {
    color: WireframeTheme.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: WireframeTheme.textPrimary,
  },
  activeLine: {
    marginTop: 6,
    height: 2,
    borderRadius: 2,
    backgroundColor: WireframeTheme.activeBlue,
  },
  rowMenuIcon: {
    marginLeft: 'auto',
    paddingHorizontal: 6,
  },
  newPlaylistButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: WireframeTheme.border,
    backgroundColor: WireframeTheme.panel,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  newIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: WireframeTheme.activeBlueSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newPlaylistText: {
    color: WireframeTheme.activeBlue,
    fontWeight: '700',
  },
  listContainer: {
    paddingTop: 8,
    paddingBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2531',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  title: {
    color: WireframeTheme.textPrimary,
    fontWeight: '600',
    fontSize: 13,
  },
  count: {
    color: WireframeTheme.textSecondary,
    marginTop: 2,
    fontSize: 11,
  },
  miniPlayer: {
    borderTopWidth: 1,
    borderColor: WireframeTheme.border,
    backgroundColor: '#11151d',
    marginHorizontal: -14,
    marginBottom: -8,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  miniCover: {
    width: 34,
    height: 34,
    borderRadius: 6,
    backgroundColor: '#2a3346',
  },
});
