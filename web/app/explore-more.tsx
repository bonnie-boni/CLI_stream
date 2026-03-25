import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { AppNavbar } from '@/components/app-navbar';

type FeaturedApp = {
  id: string;
  name: string;
  description: string;
  installNpm: string;
  installWinget: string;
  warning: string;
  icon: keyof typeof MaterialIcons.glyphMap;
};

const FEATURED_APPS: FeaturedApp[] = [
  {
    id: 'cli-music',
    name: 'CLI Music',
    description:
      'Terminal-based music player with YouTube search, offline downloads, and smart playlists. Perfect for scripting and automation.',
    installNpm: 'npm install -g cli-music',
    installWinget: 'winget install BonnieBoni.CliMusic',
    warning:
      'Requires Python 3.8+, ffmpeg for audio conversion, and internet for initial YouTube searches. Downloads stored locally.',
    icon: 'music-note',
  },
  {
    id: 'stream-cli',
    name: 'Stream CLI',
    description:
      'Advanced streaming and audio processing toolkit. Includes batch downloads, format conversion, and playlist management from various sources.',
    installNpm: 'npm install -g stream-cli',
    installWinget: 'winget install BonnieBoni.StreamCli',
    warning:
      'heavy resource usage during batch processing. Requires 2GB+ disk space. Audio processing may take time on older systems.',
    icon: 'stream',
  },
];

const SOCIAL_LINKS = [
  {
    id: 'github',
    name: 'GitHub',
    url: 'https://github.com',
    icon: 'code' as keyof typeof MaterialIcons.glyphMap,
  },
  {
    id: 'twitter',
    name: 'X (Twitter)',
    url: 'https://x.com',
    icon: 'share' as keyof typeof MaterialIcons.glyphMap,
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    url: 'https://linkedin.com',
    icon: 'business-center' as keyof typeof MaterialIcons.glyphMap,
  },
  {
    id: 'instagram',
    name: 'Instagram',
    url: 'https://instagram.com',
    icon: 'photo-camera' as keyof typeof MaterialIcons.glyphMap,
  },
];

export default function ExploreMoreScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  const handleCopyCommand = async (command: string) => {
    try {
      await navigator.clipboard.writeText(command);
      alert('Command copied to clipboard!');
    } catch {
      // Fallback for non-web environments
    }
  };

  const handleSocialLink = (url: string) => {
    Linking.openURL(url).catch(() => {
      alert('Could not open link');
    });
  };

  return (
    <View style={styles.page}>
      <AppNavbar />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Header Section */}
        <View style={[styles.headerSection, isWide ? styles.headerSectionWide : null]}>
          <Text style={styles.heading}>Explore More</Text>
          <Text style={styles.subheading}>
            Discover other CLI tools and applications from the ecosystem. Install and manage them with ease.
          </Text>
        </View>

        {/* Featured Apps Section */}
        <View style={[styles.section, isWide ? styles.sectionWide : null]}>
          <Text style={styles.sectionTitle}>Featured Applications</Text>

          {FEATURED_APPS.map((app) => (
            <View key={app.id} style={styles.appCard}>
              <View style={styles.appHeader}>
                <View style={styles.appIconWrap}>
                  <MaterialIcons name={app.icon} size={32} color="#3b82f6" />
                </View>
                <View style={styles.appInfo}>
                  <Text style={styles.appName}>{app.name}</Text>
                  <Text style={styles.appDescription}>{app.description}</Text>
                </View>
              </View>

              <View style={styles.installs}>
                <View style={styles.installMethod}>
                  <Pressable
                    style={styles.copyButton}
                    onPress={() => handleCopyCommand(app.installNpm)}>
                    <MaterialIcons name="content-copy" size={16} color="#ffffff" />
                    <Text style={styles.copyButtonText}>NPM</Text>
                  </Pressable>
                  <Text style={styles.commandText} numberOfLines={1}>
                    {app.installNpm}
                  </Text>
                </View>

                <View style={styles.installMethod}>
                  <Pressable
                    style={styles.copyButton}
                    onPress={() => handleCopyCommand(app.installWinget)}>
                    <MaterialIcons name="content-copy" size={16} color="#ffffff" />
                    <Text style={styles.copyButtonText}>WinGet</Text>
                  </Pressable>
                  <Text style={styles.commandText} numberOfLines={1}>
                    {app.installWinget}
                  </Text>
                </View>
              </View>

              <View style={styles.warningBox}>
                <MaterialIcons name="warning" size={18} color="#d97706" />
                <Text style={styles.warningText}>{app.warning}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Social Links Section */}
        <View style={[styles.section, isWide ? styles.sectionWide : null]}>
          <Text style={styles.sectionTitle}>Follow & Connect</Text>
          <Text style={styles.sectionDescription}>
            Stay updated with new releases, features, and community discussions.
          </Text>

          <View style={styles.socialGrid}>
            {SOCIAL_LINKS.map((social) => (
              <Pressable
                key={social.id}
                style={styles.socialCard}
                onPress={() => handleSocialLink(social.url)}>
                <MaterialIcons name={social.icon} size={28} color="#3b82f6" />
                <Text style={styles.socialName}>{social.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={[styles.footer, isWide ? styles.footerWide : null]}>
          <Text style={styles.footerText}>© 2026 CLI Music. Open source and community-driven.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  headerSection: {
    marginBottom: 24,
  },
  headerSectionWide: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 12,
  },
  heading: {
    color: '#111827',
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 8,
  },
  subheading: {
    color: '#6b7280',
    fontSize: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionWide: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 12,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
  },
  sectionDescription: {
    color: '#6b7280',
    fontSize: 14,
    marginBottom: 12,
  },
  appCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
  },
  appHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  appIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appInfo: {
    flex: 1,
  },
  appName: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  appDescription: {
    color: '#6b7280',
    fontSize: 13,
    lineHeight: 18,
  },
  installs: {
    gap: 10,
    marginBottom: 12,
  },
  installMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f3f4f6',
    padding: 10,
    borderRadius: 6,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
  },
  copyButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  commandText: {
    flex: 1,
    color: '#374151',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  warningBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#fef3c7',
    padding: 10,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  warningText: {
    flex: 1,
    color: '#78350f',
    fontSize: 12,
    lineHeight: 16,
  },
  socialGrid: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  socialCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  socialName: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    marginTop: 32,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    alignItems: 'center',
  },
  footerWide: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  footerText: {
    color: '#9ca3af',
    fontSize: 12,
  },
});
