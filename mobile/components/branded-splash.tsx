import { StyleSheet, Text, View } from 'react-native';

export function BrandedSplash() {
  return (
    <View style={styles.root}>
      <View style={styles.glowOne} />
      <View style={styles.glowTwo} />
      <View style={styles.centerCard}>
        <Text style={styles.brand}>BMusic</Text>
        <Text style={styles.tagline}>Music comes to life</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#06162d',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  glowOne: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    top: -90,
    right: -70,
    backgroundColor: '#17375f',
    opacity: 0.5,
  },
  glowTwo: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    bottom: -70,
    left: -40,
    backgroundColor: '#4b607d',
    opacity: 0.35,
  },
  centerCard: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'rgba(15,39,72,0.72)',
    borderRadius: 20,
    paddingHorizontal: 34,
    paddingVertical: 22,
    alignItems: 'center',
  },
  brand: {
    color: '#ffffff',
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tagline: {
    marginTop: 6,
    color: '#c4cfdf',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
});
