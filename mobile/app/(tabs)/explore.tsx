import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, Text, View } from 'react-native';

import { MusicAppShell } from '@/components/music-app-shell';
import { WireframeTheme } from '@/constants/wireframe-theme';

const controls = ['shuffle', 'skip-previous', 'pause', 'skip-next', 'repeat'];

export default function PlayerScreen() {
  return (
    <MusicAppShell>
      <View style={styles.playerCard}>
        <View style={styles.headerRow}>
          <MaterialIcons name="keyboard-arrow-down" size={22} color="#2c313a" />
          <View style={styles.headerRight}>
            <MaterialIcons name="favorite-border" size={20} color="#2c313a" />
            <MaterialIcons name="more-horiz" size={20} color="#2c313a" />
          </View>
        </View>

        <Text style={styles.offlineText}>OFFLINE MUSIC</Text>
        <Text style={styles.speedText}>SL 1.20/MPH</Text>

        <View style={styles.turntableWrap}>
          <View style={styles.vinylOuter}>
            <View style={styles.vinylMid}>
              <View style={styles.vinylInner}>
                <Text style={styles.vinylLabel}>ALBUM</Text>
              </View>
            </View>
          </View>
          <View style={styles.arm} />
        </View>

        <Text numberOfLines={1} style={styles.songTitle}>
          Easy On Me (Official Video)
        </Text>
        <Text style={styles.artist}>Acid Ghost</Text>

        <View style={styles.sliderRow}>
          <Text style={styles.timeText}>1:34</Text>
          <View style={styles.sliderTrack}>
            <View style={styles.sliderProgress} />
            <View style={styles.sliderThumb} />
          </View>
          <Text style={styles.timeText}>5:02</Text>
        </View>

        <View style={styles.controlsRow}>
          {controls.map((name, idx) => (
            <View key={name} style={[styles.controlButton, idx === 2 && styles.playButton]}>
              <MaterialIcons name={name as keyof typeof MaterialIcons.glyphMap} size={20} color="#f4f8ff" />
            </View>
          ))}
        </View>
      </View>
    </MusicAppShell>
  );
}

const styles = StyleSheet.create({
  playerCard: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: WireframeTheme.playerMetalLight,
    borderWidth: 1,
    borderColor: WireframeTheme.playerMetalDark,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  offlineText: {
    color: '#1f232b',
    fontWeight: '700',
    marginTop: 6,
    letterSpacing: 0.6,
  },
  speedText: {
    color: '#6e7481',
    fontSize: 11,
    marginTop: 2,
    marginBottom: 10,
  },
  turntableWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
    minHeight: 240,
  },
  vinylOuter: {
    width: 242,
    height: 242,
    borderRadius: 121,
    backgroundColor: '#16181d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vinylMid: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 6,
    borderColor: '#2d313a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vinylInner: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#263141',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vinylLabel: {
    color: '#c5d1e4',
    fontWeight: '700',
    letterSpacing: 1,
    fontSize: 11,
  },
  arm: {
    position: 'absolute',
    right: 24,
    top: 28,
    width: 80,
    height: 6,
    borderRadius: 4,
    transform: [{ rotate: '35deg' }],
    backgroundColor: '#30353e',
  },
  songTitle: {
    color: '#1f232b',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 6,
  },
  artist: {
    color: '#636a78',
    marginTop: 4,
    marginBottom: 14,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeText: {
    color: '#5f6773',
    fontSize: 11,
  },
  sliderTrack: {
    flex: 1,
    height: 4,
    borderRadius: 4,
    backgroundColor: '#b9bec8',
    justifyContent: 'center',
  },
  sliderProgress: {
    width: '38%',
    height: 4,
    borderRadius: 4,
    backgroundColor: '#363c47',
  },
  sliderThumb: {
    position: 'absolute',
    left: '38%',
    marginLeft: -5,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#242933',
  },
  controlsRow: {
    marginTop: 26,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#222831',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#171b22',
  },
});
