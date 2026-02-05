import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface BadgeCardProps {
  code: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress: number;
  threshold?: number;
}

export default function BadgeCard({
  code,
  name,
  description,
  icon,
  unlocked,
  progress,
  threshold,
}: BadgeCardProps) {
  return (
    <View style={[styles.card, unlocked && styles.cardUnlocked]}>
      <View style={styles.iconContainer}>
        <Text style={[styles.icon, !unlocked && styles.iconLocked]}>{icon}</Text>
        {unlocked && <View style={styles.unlockedBadge} />}
      </View>

      <View style={styles.content}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.description}>{description}</Text>

        {!unlocked && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, { width: `${progress}%` }]}
              />
            </View>
            <Text style={styles.progressText}>
              {progress}% {threshold && `/ ${threshold}%`}
            </Text>
          </View>
        )}

        {unlocked && (
          <View style={styles.unlockedLabel}>
            <Text style={styles.unlockedText}>✓ Desbloqueado</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardUnlocked: {
    borderColor: '#FF6B35',
    backgroundColor: '#FFF5F0',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    position: 'relative',
  },
  icon: {
    fontSize: 32,
  },
  iconLocked: {
    opacity: 0.3,
  },
  unlockedBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF6B35',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  unlockedLabel: {
    marginTop: 8,
  },
  unlockedText: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '600',
  },
});
