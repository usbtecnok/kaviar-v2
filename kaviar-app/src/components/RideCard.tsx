import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ride } from '../types/ride';

interface RideCardProps {
  ride: Ride;
}

// Componente RideCard (placeholder)
export const RideCard: React.FC<RideCardProps> = ({ ride }) => {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Corrida #{ride.id.slice(0, 8)}</Text>
      <Text>Origem: {ride.origin}</Text>
      <Text>Destino: {ride.destination}</Text>
      <Text>Status: {ride.status}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
});
