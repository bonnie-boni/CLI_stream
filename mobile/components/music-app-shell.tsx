import { PropsWithChildren } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WireframeTheme } from '@/constants/wireframe-theme';

type MusicAppShellProps = PropsWithChildren<{
  padded?: boolean;
}>;

export function MusicAppShell({ children, padded = true }: MusicAppShellProps) {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isTablet = width >= 768;
  const isDesktop = width >= 1100;
  const frameWidth = isWeb ? Math.min(1280, Math.max(360, width - 40)) : width;
  const horizontalPadding = padded ? (isDesktop ? 0 : isTablet ? 0 : 0) : 0;
  const verticalPadding = padded ? (isDesktop ? 0 : 0) : 0;

  return (
    
    <SafeAreaView style={styles.root}>
      <View style={styles.webBackdrop}>
        <View
          style={[
            styles.frame,
            { width: frameWidth },
            isWeb ? styles.webFrame : null,
            {
              paddingHorizontal: horizontalPadding,
              paddingTop: verticalPadding,
              paddingBottom: verticalPadding,
            },
          ]}>
          {children}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: WireframeTheme.bg,
  },
  webBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WireframeTheme.bg,
    paddingHorizontal: 8,
  },
  frame: {
    flex: 1,
    backgroundColor: WireframeTheme.bg,
  },
  webFrame: {
    borderWidth: 0,
    borderColor: 'rgba(255,255,255,0)',
    overflow: 'hidden',
  },
});
