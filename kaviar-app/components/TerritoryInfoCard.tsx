import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import TerritoryBadge from './TerritoryBadge';

interface TerritoryInfoCardProps {
  territoryInfo: {
    type: 'OFFICIAL' | 'FALLBACK_800M' | 'MANUAL' | null;
    neighborhood: {
      name: string;
      city?: string;
    };
    hasOfficialMap: boolean;
    virtualRadius?: number;
    minFee: number;
    maxFee: number;
    message: string;
  };
}

export default function TerritoryInfoCard({ territoryInfo }: TerritoryInfoCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Seu Território</Text>
        <TerritoryBadge type={territoryInfo.type} size="small" />
      </View>

      <View style={styles.neighborhoodInfo}>
        <Text style={styles.neighborhoodName}>{territoryInfo.neighborhood.name}</Text>
        {territoryInfo.neighborhood.city && (
          <Text style={styles.neighborhoodCity}>{territoryInfo.neighborhood.city}</Text>
        )}
      </View>

      <View style={styles.feeContainer}>
        <View style={styles.feeBox}>
          <Text style={styles.feeLabel}>Taxa Mínima</Text>
          <Text style={styles.feeValue}>{territoryInfo.minFee}%</Text>
        </View>
        <View style={styles.feeDivider} />
        <View style={styles.feeBox}>
          <Text style={styles.feeLabel}>Taxa Máxima</Text>
          <Text style={styles.feeValue}>{territoryInfo.maxFee}%</Text>
        </View>
      </View>

      <View style={styles.messageContainer}>
        <Text style={styles.messageIcon}>
          {territoryInfo.hasOfficialMap ? '✅' : '⚠️'}
        </Text>
        <Text style={styles.message}>{territoryInfo.message}</Text>
      </View>

      {territoryInfo.virtualRadius && (
        <View style={styles.radiusInfo}>
          <Text style={styles.radiusText}>
            📍 Raio virtual: {territoryInfo.virtualRadius}m
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  neighborhoodInfo: {
    marginBottom: 16,
  },
  neighborhoodName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginBottom: 4,
  },
  neighborhoodCity: {
    fontSize: 14,
    color: '#6B7280',
  },
  feeContainer: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  feeBox: {
    flex: 1,
    alignItems: 'center',
  },
  feeDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 12,
  },
  feeLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  feeValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  messageContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF5F0',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FF6B35',
  },
  messageIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  message: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  radiusInfo: {
    marginTop: 12,
    alignItems: 'center',
  },
  radiusText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
  },
});
