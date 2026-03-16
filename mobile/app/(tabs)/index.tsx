import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { MusicAppShell } from '@/components/music-app-shell';
import { WireframeTheme } from '@/constants/wireframe-theme';

type Song = {
  id: string;
  title: string;
  artist: string;
  duration: string;
  color: string;
};

const songs: Song[] = [
  { id: '1', title: 'Unholy', artist: 'Sam Smith, Kim Petras', duration: '2:36', color: '#3d5a9a' },
  { id: '2', title: "I\'m Good", artist: 'David Guetta, Bebe Rexha', duration: '2:55', color: '#4f6fd8' },
  { id: '3', title: 'As It Was', artist: 'Harry Styles', duration: '2:47', color: '#8b8f9c' },
  { id: '4', title: 'La Bachata', artist: 'Manuel Turizo', duration: '2:43', color: '#ef9132' },
  { id: '5', title: 'Tit Me Pregunto', artist: 'Bad Bunny', duration: '4:03', color: '#4eb5aa' },
  { id: '6', title: 'Under The Influence', artist: 'Chris Brown', duration: '3:04', color: '#6d6f7f' },
  { id: '7', title: "Ain\'t Worried", artist: 'OneRepublic', duration: '2:28', color: '#3b7fcd' },
];

const tabs = ['Tracks', 'Playlists', 'Import'] as const;

export default function TracksScreen() {
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
            <Text style={[styles.segmentText, idx === 0 && styles.segmentTextActive]}>{tab}</Text>
            {idx === 0 ? <View style={styles.activeLine} /> : null}
          </Pressable>
        ))}
        <View style={styles.rowMenuIcon}>
          <MaterialIcons name="menu" size={18} color={WireframeTheme.textSecondary} />
        </View>
      </View>

      <View style={styles.headerRow}>
        <MaterialIcons name="drag-handle" size={18} color={WireframeTheme.textSecondary} />
        <Text style={styles.headerDate}>Date</Text>
        <Text style={styles.headerName}>Name</Text>
        <MaterialIcons name="shuffle" size={18} color={WireframeTheme.textSecondary} />
      </View>

      <FlatList
        data={songs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.songList}
        renderItem={({ item }) => (
          <View style={styles.songRow}>
            <View style={[styles.cover, { backgroundColor: item.color }]} />
            <View style={styles.songTextWrap}>
              <Text numberOfLines={1} style={styles.songTitle}>
                {item.title}
              </Text>
              <Text numberOfLines={1} style={styles.songArtist}>
                {item.artist}
              </Text>
            </View>
            <Text style={styles.songDuration}>{item.duration}</Text>
            <MaterialIcons name="more-vert" size={18} color={WireframeTheme.textSecondary} />
          </View>
        )}
      />

      <View style={styles.miniPlayer}>
        <View style={styles.miniCover} />
        <View style={styles.songTextWrap}>
          <Text numberOfLines={1} style={styles.songTitle}>
            The Weeknd - Die For You
          </Text>
          <Text numberOfLines={1} style={styles.songArtist}>
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
    marginBottom: 8,
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: WireframeTheme.border,
    paddingVertical: 8,
    marginBottom: 8,
  },
  headerDate: {
    color: WireframeTheme.textSecondary,
    marginLeft: 8,
    marginRight: 20,
    fontSize: 12,
    width: 42,
  },
  headerName: {
    color: WireframeTheme.textSecondary,
    fontSize: 12,
    flex: 1,
  },
  songList: {
    paddingBottom: 10,
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2531',
  },
  cover: {
    width: 36,
    height: 36,
    borderRadius: 6,
  },
  songTextWrap: {
    flex: 1,
  },
  songTitle: {
    color: WireframeTheme.textPrimary,
    fontWeight: '600',
    fontSize: 13,
  },
  songArtist: {
    color: WireframeTheme.textSecondary,
    marginTop: 2,
    fontSize: 11,
  },
  songDuration: {
    color: WireframeTheme.textSecondary,
    fontSize: 11,
    marginRight: 4,
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
