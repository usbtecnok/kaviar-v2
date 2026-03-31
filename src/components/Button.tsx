import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { COLORS } from '../config/colors';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'outline';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  style?: ViewStyle;
  disabled?: boolean;
  loading?: boolean;
}

const BG: Record<ButtonVariant, string> = {
  primary: COLORS.primary,
  secondary: COLORS.accent,
  danger: COLORS.danger,
  success: COLORS.success,
  outline: 'transparent',
};

const TEXT_COLOR: Record<ButtonVariant, string> = {
  primary: COLORS.textDark,
  secondary: COLORS.textDark,
  danger: '#FFFFFF',
  success: '#FFFFFF',
  outline: COLORS.primary,
};

export const Button: React.FC<ButtonProps> = ({
  title, onPress, variant = 'primary', style, disabled, loading,
}) => (
  <TouchableOpacity
    style={[
      styles.button,
      { backgroundColor: BG[variant] },
      variant === 'outline' && styles.outline,
      disabled && styles.disabled,
      style,
    ]}
    onPress={onPress}
    disabled={disabled || loading}
    activeOpacity={0.8}
    accessibilityRole="button"
    accessibilityLabel={title}
    accessibilityState={{ disabled: disabled || loading }}
  >
    {loading ? (
      <ActivityIndicator color={TEXT_COLOR[variant]} />
    ) : (
      <Text style={[styles.text, { color: TEXT_COLOR[variant] }]}>{title}</Text>
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  outline: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  disabled: {
    opacity: 0.45,
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
