import React from 'react';
import {View, Text, Pressable, StyleSheet} from 'react-native';
import {useAppKit} from '@reown/appkit-react-native';
import {colors, radii, fontSizes, fontWeights, shadows, spacing} from '../theme';

export default function WalletConnectScreen() {
  const {open} = useAppKit();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Logo */}
        <View style={styles.logo}>
          <Text style={styles.logoText}>BC</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>Connect your wallet</Text>
        <Text style={styles.subtitle}>
          Securely enter your encrypted inbox.
        </Text>

        {/* Connect Button */}
        <Pressable
          style={({pressed}) => [
            styles.connectButton,
            pressed && styles.connectButtonPressed,
          ]}
          onPress={() => open()}>
          <Text style={styles.connectButtonText}>Connect Wallet</Text>
        </Pressable>

        {/* Footer */}
        <View style={styles.divider} />
        <Text style={styles.footer}>
          Self-custodial. No account required.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingVertical: 40,
    paddingHorizontal: 32,
    alignItems: 'center',
    ...shadows.card,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logoText: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    letterSpacing: 3,
    color: colors.foreground,
  },
  title: {
    fontSize: fontSizes.xxl,
    fontWeight: fontWeights.semibold,
    color: colors.foreground,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSizes.md,
    color: colors.mutedForeground,
    marginBottom: spacing.xxl,
    textAlign: 'center',
  },
  connectButton: {
    width: '100%',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: 14,
    alignItems: 'center',
    ...shadows.card,
  },
  connectButtonPressed: {
    opacity: 0.85,
    transform: [{translateY: -1}],
  },
  connectButtonText: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.accent,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginTop: spacing.xxl,
    marginBottom: spacing.lg,
  },
  footer: {
    fontSize: fontSizes.xs,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
});
