import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { COLORS } from '../config/colors';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success';

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
  secondary: COLORS.warning,
  danger: COLORS.danger,
  success: COLORS.success,
};

export const Button: React.FC<ButtonProps> = ({
  title, onPress, variant = 'primary', style, disabled, loading,
}) => (
  <TouchableOpacity
    style={[styles.button, { backgroundColor: BG[variant] }, disabled && styles.disabled, style]}
    onPress={onPress}
    disabled={disabled || loading}
    accessibilityRole="button"
    accessibilityLabel={title}
    accessibilityState={{ disabled: disabled || loading }}
  >
    {loading ? (
      <ActivityIndicator color="#FFF" />
    ) : (
      <Text style={styles.text}>{title}</Text>
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
