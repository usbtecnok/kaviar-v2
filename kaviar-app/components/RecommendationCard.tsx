import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface RecommendationCardProps {
  icon: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'tip';
  potentialSavings?: string;
}

export default function RecommendationCard({
  icon,
  title,
  message,
  type,
  potentialSavings,
}: RecommendationCardProps) {
  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          bgColor: '#D1FAE5',
          borderColor: '#10B981',
          textColor: '#065F46',
        };
      case 'warning':
        return {
          bgColor: '#FEF3C7',
          borderColor: '#F59E0B',
          textColor: '#92400E',
        };
      case 'tip':
        return {
          bgColor: '#DBEAFE',
          borderColor: '#3B82F6',
          textColor: '#1E40AF',
        };
      default:
        return {
          bgColor: '#F3F4F6',
          borderColor: '#6B7280',
          textColor: '#374151',
        };
    }
  };

  const typeStyles = getTypeStyles();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: typeStyles.bgColor,
          borderColor: typeStyles.borderColor,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={[styles.title, { color: typeStyles.textColor }]}>
          {title}
        </Text>
      </View>

      <Text style={[styles.message, { color: typeStyles.textColor }]}>
        {message}
      </Text>

      {potentialSavings && (
        <View style={styles.savingsContainer}>
          <Text style={[styles.savingsLabel, { color: typeStyles.textColor }]}>
            Economia Potencial:
          </Text>
          <Text style={[styles.savingsValue, { color: typeStyles.borderColor }]}>
            {potentialSavings}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    fontSize: 24,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  savingsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  savingsLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  savingsValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
