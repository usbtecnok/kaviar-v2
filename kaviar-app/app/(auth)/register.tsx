import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Tela de registro (placeholder)
export default function Register() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Registro</Text>
      <Text>Tela de registro - Lógica será implementada</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
});
