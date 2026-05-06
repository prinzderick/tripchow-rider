import React from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  StyleSheet, ViewStyle, TextStyle,
} from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../theme';

// ── Button ────────────────────────────────────────────────────────────────────
interface BtnProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger' | 'success';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

export const Button: React.FC<BtnProps> = ({
  label, onPress, variant = 'primary', loading, disabled,
  fullWidth, size = 'md', style,
}) => {
  const bg = {
    primary: Colors.brand,
    ghost:   Colors.bg,
    danger:  Colors.danger,
    success: Colors.success,
  }[variant];

  const textCol = variant === 'ghost' ? Colors.text : '#fff';
  const pad = size === 'sm' ? 10 : size === 'lg' ? 16 : 13;
  const fontSize = size === 'sm' ? Typography.sm : size === 'lg' ? Typography.md : Typography.base;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.btn,
        { backgroundColor: bg, paddingVertical: pad, opacity: (disabled || loading) ? 0.5 : 1 },
        fullWidth && { width: '100%' },
        variant === 'ghost' && { borderWidth: 1.5, borderColor: Colors.border },
        style,
      ]}
    >
      {loading
        ? <ActivityIndicator color={textCol} size="small" />
        : <Text style={{ color: textCol, fontSize, fontFamily: `Manrope-Bold`, textAlign: 'center' }}>{label}</Text>}
    </TouchableOpacity>
  );
};

// ── Card ──────────────────────────────────────────────────────────────────────
export const Card: React.FC<{ children: React.ReactNode; style?: ViewStyle }> = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

// ── Divider ───────────────────────────────────────────────────────────────────
export const Divider: React.FC<{ style?: ViewStyle }> = ({ style }) => (
  <View style={[{ height: 1, backgroundColor: Colors.border }, style]} />
);

// ── Badge ─────────────────────────────────────────────────────────────────────
type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'brand';
const BADGE_COLORS: Record<BadgeVariant, { bg: string; text: string }> = {
  success: { bg: Colors.successLight, text: Colors.success },
  warning: { bg: Colors.warningLight, text: Colors.warning },
  danger:  { bg: Colors.dangerLight,  text: Colors.danger  },
  info:    { bg: '#DBEAFE',            text: '#1D4ED8'      },
  neutral: { bg: Colors.bg,           text: Colors.text2   },
  brand:   { bg: Colors.brandLight,   text: Colors.brand   },
};

export const Badge: React.FC<{ label: string; variant?: BadgeVariant; style?: ViewStyle }> = ({
  label, variant = 'neutral', style,
}) => {
  const c = BADGE_COLORS[variant];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }, style]}>
      <Text style={{ fontSize: 10, fontFamily: 'Manrope-Bold', color: c.text }}>{label}</Text>
    </View>
  );
};

// ── Loading ───────────────────────────────────────────────────────────────────
export const LoadingScreen: React.FC<{ message?: string }> = ({ message }) => (
  <View style={styles.loadingScreen}>
    <ActivityIndicator size="large" color={Colors.brand} />
    {message && <Text style={styles.loadingText}>{message}</Text>}
  </View>
);

// ── Money display ─────────────────────────────────────────────────────────────
export const Money: React.FC<{ kobo: number; style?: TextStyle; size?: number }> = ({
  kobo, style, size = Typography.md,
}) => {
  const n = kobo / 100;
  const formatted = n >= 1_000_000
    ? `₦${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
    ? `₦${(n / 1_000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}K`
    : `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 0 })}`;

  return (
    <Text style={[{ fontSize: size, fontFamily: 'Manrope-Bold', color: Colors.text }, style]}>
      {formatted}
    </Text>
  );
};

// ── Row item ──────────────────────────────────────────────────────────────────
export const RowItem: React.FC<{
  icon?: string;
  label: string;
  value?: string;
  onPress?: () => void;
  iconBg?: string;
}> = ({ icon, label, value, onPress, iconBg = Colors.bg }) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={!onPress}
    style={styles.rowItem}
    activeOpacity={0.7}
  >
    {icon && (
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
        <Text style={{ fontSize: 18 }}>{icon}</Text>
      </View>
    )}
    <Text style={styles.rowLabel}>{label}</Text>
    {value && <Text style={styles.rowValue}>{value}</Text>}
    {onPress && <Text style={{ color: Colors.text3, fontSize: 18 }}>›</Text>}
  </TouchableOpacity>
);

// ── Empty state ───────────────────────────────────────────────────────────────
export const EmptyState: React.FC<{
  icon?: string;
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
}> = ({ icon = '📭', title, subtitle, action }) => (
  <View style={styles.emptyState}>
    <Text style={{ fontSize: 48, marginBottom: 12 }}>{icon}</Text>
    <Text style={styles.emptyTitle}>{title}</Text>
    {subtitle && <Text style={styles.emptySubtitle}>{subtitle}</Text>}
    {action && (
      <Button label={action.label} onPress={action.onPress} size="sm" style={{ marginTop: 16 }} />
    )}
  </View>
);

// ── Section header ────────────────────────────────────────────────────────────
export const SectionHeader: React.FC<{ label: string }> = ({ label }) => (
  <Text style={styles.sectionHeader}>{label}</Text>
);

const styles = StyleSheet.create({
  btn: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: Typography.sm,
    color: Colors.text3,
    fontFamily: 'Manrope-Regular',
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
    fontSize: Typography.base,
    fontFamily: 'Manrope-SemiBold',
    color: Colors.text,
  },
  rowValue: {
    fontSize: Typography.sm,
    color: Colors.text3,
    fontFamily: 'Manrope-Regular',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
  },
  emptyTitle: {
    fontSize: Typography.lg,
    fontFamily: 'Manrope-Bold',
    color: Colors.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: Typography.sm,
    color: Colors.text3,
    fontFamily: 'Manrope-Regular',
    textAlign: 'center',
    lineHeight: 18,
  },
  sectionHeader: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
    color: Colors.text3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 8,
  },
});
