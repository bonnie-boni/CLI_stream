import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import {
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

type Song = {
  id: string;
  title: string;
  artist: string;
  duration: string;
  thumbnail: string;
};

const queue: Song[] = [
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
    title: 'Calm Down',
    artist: 'Rema, Selena Gomez',
    duration: '3:59',
    thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/da/5c/0f/da5c0fe4-a5cc-e7ea-d035-84f06f93ca3e/886449968442.jpg/600x600bb.jpg',
  },
];

export default function PlayerScreen() {
  const [activeId, setActiveId] = useState(queue[0].id);
  const { width } = useWindowDimensions();

  const activeSong = queue.find((song) => song.id === activeId) ?? queue[0];
  const isTablet = width >= 760;
  const isDesktop = width >= 1100;

  return (
    <MusicAppShell>
      <ImageBackground source={{ uri: activeSong.thumbnail }} style={styles.playerCard} imageStyle={styles.playerCardImage}>
        <View style={styles.playerOverlay} />

        <View style={styles.headerRow}>
          <Text style={styles.nowPlaying}>NOW PLAYING</Text>
          <View style={styles.headerIcons}>
            <MaterialIcons name="favorite-border" size={20} color={WireframeTheme.textPrimary} />
            <MaterialIcons name="more-horiz" size={20} color={WireframeTheme.textPrimary} />
          </View>
        </View>

        <View style={[styles.mainBody, isTablet ? styles.mainBodyTablet : null]}>
          <View style={[styles.artPanel, isDesktop ? styles.artPanelDesktop : null]}>
            <Image source={{ uri: activeSong.thumbnail }} style={styles.coverArt} />
            <Text numberOfLines={1} style={styles.songTitle}>
              {activeSong.title}
            </Text>
            <Text numberOfLines={1} style={styles.songArtist}>
              {activeSong.artist}
            </Text>
          </View>

          <View style={[styles.controlsPanel, isDesktop ? styles.controlsPanelDesktop : null]}>
            <View style={styles.sliderRow}>
              <Text style={styles.timeText}>1:34</Text>
              <View style={styles.sliderTrack}>
                <View style={styles.sliderProgress} />
                <View style={styles.sliderThumb} />
              </View>
              <Text style={styles.timeText}>{activeSong.duration}</Text>
            </View>

            <View style={[styles.controlsRow, isTablet ? styles.controlsRowTablet : null]}>
              <Pressable style={styles.controlButton}>
                <MaterialIcons name="shuffle" size={22} color={WireframeTheme.textPrimary} />
              </Pressable>
              <Pressable style={styles.controlButton}>
                <MaterialIcons name="skip-previous" size={24} color={WireframeTheme.textPrimary} />
              </Pressable>
              <Pressable style={styles.playButton}>
                <MaterialIcons name="pause" size={30} color={WireframeTheme.textPrimary} />
              </Pressable>
              <Pressable style={styles.controlButton}>
                <MaterialIcons name="skip-next" size={24} color={WireframeTheme.textPrimary} />
              </Pressable>
              <Pressable style={styles.controlButton}>
                <MaterialIcons name="repeat" size={22} color={WireframeTheme.textPrimary} />
              </Pressable>
            </View>

            <Text style={styles.queueLabel}>UP NEXT</Text>
            <ScrollView style={styles.queueList} contentContainerStyle={styles.queueListContent}>
              {queue.map((song) => {
                const isActive = song.id === activeSong.id;

                return (
                  <Pressable
                    key={song.id}
                    style={[styles.queueItem, isActive ? styles.queueItemActive : null]}
                    onPress={() => setActiveId(song.id)}>
                    <Image source={{ uri: song.thumbnail }} style={styles.queueThumb} />
                    <View style={styles.queueTextWrap}>
                      <Text numberOfLines={1} style={styles.queueTitle}>
                        {song.title}
                      </Text>
                      <Text numberOfLines={1} style={styles.queueArtist}>
                        {song.artist}
                      </Text>
                    </View>
                    <Text style={styles.queueDuration}>{song.duration}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </ImageBackground>
    </MusicAppShell>
  );
}

const styles = StyleSheet.create({
  playerCard: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
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
    gap: 12,
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
    padding: 12,
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
