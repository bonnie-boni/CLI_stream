import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMemo, useState } from 'react';
import {
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

type Song = {
  id: string;
  title: string;
  artist: string;
  duration: string;
  thumbnail: string;
};

const songs: Song[] = [
  {
    id: '1',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    duration: '3:20',
    thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/95/65/22/9565227f-ac53-ec92-f2de-a28ea22f69f3/20UMGIM15598.rgb.jpg/600x600bb.jpg',
  },
  {
    id: '2',
    title: 'Levitating',
    artist: 'Dua Lipa',
    duration: '3:24',
    thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/d7/ac/6a/d7ac6aca-da6b-afcc-2a2c-3f6f6f6d4aa4/190295132410.jpg/600x600bb.jpg',
  },
  {
    id: '3',
    title: 'As It Was',
    artist: 'Harry Styles',
    duration: '2:47',
    thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/bf/45/25/bf4525ac-7864-f815-313d-f5ea63144ea9/886449990061.jpg/600x600bb.jpg',
  },
  {
    id: '4',
    title: 'Calm Down',
    artist: 'Rema, Selena Gomez',
    duration: '3:59',
    thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/da/5c/0f/da5c0fe4-a5cc-e7ea-d035-84f06f93ca3e/886449968442.jpg/600x600bb.jpg',
  },
  {
    id: '5',
    title: 'Golden Hour',
    artist: 'JVKE',
    duration: '3:29',
    thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/7f/26/32/7f263210-f0af-080b-26e4-7ff42eb95f4f/196922005662_Cover.jpg/600x600bb.jpg',
  },
  {
    id: '6',
    title: 'Die For You',
    artist: 'The Weeknd',
    duration: '4:20',
    thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/e5/27/18/e5271854-e8b0-44f6-f820-f5a364f5754c/15UMGIM24224.rgb.jpg/600x600bb.jpg',
  },
];

export default function TracksScreen() {
  const [query, setQuery] = useState('');
  const [selectedSongId, setSelectedSongId] = useState(songs[0].id);
  const { width } = useWindowDimensions();

  const columns = width >= 1220 ? 3 : width >= 780 ? 2 : 1;
  const isWide = width >= 900;

  const filteredSongs = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return songs;
    }

    return songs.filter((song) => {
      return (
        song.title.toLowerCase().includes(normalized) ||
        song.artist.toLowerCase().includes(normalized)
      );
    });
  }, [query]);

  const selectedSong =
    filteredSongs.find((song) => song.id === selectedSongId) ?? filteredSongs[0] ?? songs[0];

  return (
    <MusicAppShell>
      <ImageBackground source={{ uri: selectedSong.thumbnail }} style={styles.hero} imageStyle={styles.heroImage}>
        <View style={styles.heroOverlay} />
        <View style={styles.heroTopRow}>
          <Text style={styles.heroLabel}>SMART DISCOVERY</Text>
          <View style={styles.liveBadge}>
            <MaterialIcons name="multitrack-audio" size={14} color={WireframeTheme.textPrimary} />
            <Text style={styles.liveBadgeText}>Live Search</Text>
          </View>
        </View>
        <Text numberOfLines={1} style={styles.heroTitle}>
          Search. Preview. Play.
        </Text>
        <Text numberOfLines={2} style={styles.heroSubtitle}>
          Explore audio with visual thumbnails and switch seamlessly from search to playback.
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
        {!!query && (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <MaterialIcons name="close" size={20} color={WireframeTheme.textSecondary} />
          </Pressable>
        )}
      </View>

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Search Results</Text>
        <Text style={styles.sectionMeta}>{filteredSongs.length} tracks</Text>
      </View>

      <FlatList
        data={filteredSongs}
        key={`tracks-${columns}`}
        keyExtractor={(item) => item.id}
        numColumns={columns}
        columnWrapperStyle={columns > 1 ? styles.gridRow : undefined}
        contentContainerStyle={[styles.listContent, isWide ? styles.listWideContent : null]}
        renderItem={({ item }) => {
          const isActive = item.id === selectedSong.id;

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
              <Text style={styles.songDuration}>{item.duration}</Text>
              <MaterialIcons
                name={isActive ? 'pause-circle-filled' : 'play-circle-filled'}
                size={26}
                color={WireframeTheme.textPrimary}
              />
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No matching tracks found.</Text>
            <Text style={styles.emptySubtitle}>Try another keyword or artist name.</Text>
          </View>
        }
      />

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
    marginBottom: 10,
  },
  searchInput: {
    color: WireframeTheme.textPrimary,
    flex: 1,
    fontSize: 15,
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
  listContent: {
    paddingBottom: 14,
    gap: 10,
  },
  listWideContent: {
    paddingBottom: 20,
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
  emptyState: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyTitle: {
    color: WireframeTheme.textPrimary,
    fontWeight: '700',
  },
  emptySubtitle: {
    marginTop: 4,
    color: WireframeTheme.textSecondary,
  },
});
