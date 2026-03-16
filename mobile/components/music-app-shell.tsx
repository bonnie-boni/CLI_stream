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
  const maxPhoneWidth = 430;
  const frameWidth = isWeb ? Math.min(maxPhoneWidth, Math.max(360, width - 32)) : width;

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.webBackdrop}>
        <View
          style={[
            styles.frame,
            { width: frameWidth },
            isWeb ? styles.webFrame : null,
            padded ? styles.padded : null,
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
  },
  frame: {
    flex: 1,
    backgroundColor: WireframeTheme.bg,
  },
  webFrame: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: WireframeTheme.border,
    overflow: 'hidden',
  },
  padded: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
  },
});
