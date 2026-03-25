import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

export function AppNavbar() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  return (
    <>
        <View style={[styles.navbar, isWide ? styles.navbarWide : null]}>
        <View style={styles.navContent}>
            <View style={styles.brandWrap}>
            <MaterialIcons name="music-note" size={24} color="#1e293b" />
            <Text style={styles.brandText}>cli-music web</Text>
            </View>

            <View style={styles.navLinks}>
            <Pressable
                style={styles.navLink}
                onPress={() => router.push('/(tabs)')}>
                <Text style={styles.navLinkText}>Music</Text>
            </Pressable>
            <Pressable
                style={styles.navLink}
                onPress={() => router.push('/explore-more')}>
                <Text style={styles.navLinkText}>Explore More</Text>
            </Pressable>
            </View>
        </View>
        </View>
    </>
  );
}

const styles = StyleSheet.create({
  navbar: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  navbarWide: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  navContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: 1280,
    alignSelf: 'center',
    width: '100%',
  },
  brandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandText: {
    color: '#1e293b',
    fontSize: 18,
    fontWeight: '700',
  },
  navLinks: {
    flexDirection: 'row',
    gap: 18,
  },
  navLink: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  navLinkText: {
    color: '#4b5563',
    fontSize: 14,
    fontWeight: '600',
  },
});
