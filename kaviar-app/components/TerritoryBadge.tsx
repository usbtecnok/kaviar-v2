import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface TerritoryBadgeProps {
  type: 'OFFICIAL' | 'FALLBACK_800M' | 'MANUAL' | null;
  size?: 'small' | 'medium' | 'large';
}

export default function TerritoryBadge({ type, size = 'medium' }: TerritoryBadgeProps) {
  const getConfig = () => {
    switch (type) {
      case 'OFFICIAL':
        return {
          label: 'Território Oficial',
          icon: '✅',
          color: '#10B981',
          bgColor: '#D1FAE5',
        };
      case 'FALLBACK_800M':
        return {
          label: 'Virtual 800m',
          icon: '⚠️',
          color: '#F59E0B',
          bgColor: '#FEF3C7',
        };
      case 'MANUAL':
        return {
          label: 'Manual',
          icon: '📍',
          color: '#6B7280',
          bgColor: '#F3F4F6',
        };
      default:
        return {
          label: 'Não Configurado',
          icon: '❌',
          color: '#EF4444',
          bgColor: '#FEE2E2',
        };
    }
  };

  const config = getConfig();
  const sizeStyles = {
    small: { fontSize: 12, padding: 6 },
    medium: { fontSize: 14, padding: 8 },
    large: { fontSize: 16, padding: 10 },
  };

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: config.bgColor },
        { padding: sizeStyles[size].padding },
      ]}
    >
      <Text style={styles.icon}>{config.icon}</Text>
      <Text
        style={[
          styles.label,
          { color: config.color, fontSize: sizeStyles[size].fontSize },
        ]}
      >
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: 6,
  },
  label: {
    fontWeight: '600',
  },
});
