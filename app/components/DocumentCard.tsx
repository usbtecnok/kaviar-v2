import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';

interface DocumentCardProps {
  type: 'cpf' | 'rg' | 'cnh' | 'proofOfAddress' | 'vehiclePhoto' | 'backgroundCheck';
  label: string;
  status: 'pending' | 'selected' | 'uploaded' | 'verified' | 'rejected';
  uri?: string;
  rejectReason?: string;
  onPress: () => void;
}

const STATUS_CONFIG = {
  pending: { icon: '📄', color: '#999', text: 'Não enviado' },
  selected: { icon: '📸', color: '#2196F3', text: 'Selecionado' },
  uploaded: { icon: '⏳', color: '#FF9800', text: 'Em análise' },
  verified: { icon: '✅', color: '#4CAF50', text: 'Aprovado' },
  rejected: { icon: '❌', color: '#F44336', text: 'Rejeitado' },
};

export default function DocumentCard({ type, label, status, uri, rejectReason, onPress }: DocumentCardProps) {
  const config = STATUS_CONFIG[status];

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} disabled={status === 'verified'}>
      <View style={styles.header}>
        <Text style={styles.icon}>{config.icon}</Text>
        <View style={styles.info}>
          <Text style={styles.label}>{label}</Text>
          <Text style={[styles.status, { color: config.color }]}>{config.text}</Text>
        </View>
      </View>
      
      {uri && (
        <Image source={{ uri }} style={styles.preview} resizeMode="cover" />
      )}
      
      {rejectReason && (
        <View style={styles.rejectBox}>
          <Text style={styles.rejectText}>Motivo: {rejectReason}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 32,
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  status: {
    fontSize: 14,
    marginTop: 4,
  },
  preview: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginTop: 12,
  },
  rejectBox: {
    backgroundColor: '#FFEBEE',
    padding: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  rejectText: {
    color: '#C62828',
    fontSize: 12,
  },
});
