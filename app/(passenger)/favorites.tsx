import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

interface Favorite {
  id: string;
  label: string;
  type: string;
  lat: number;
  lng: number;
  created_at: string;
}

export default function Favorites() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form
  const [label, setLabel] = useState('');
  const [type, setType] = useState('OTHER');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      setLoading(true);
      const token = ''; // TODO: Get from auth context/storage
      
      const response = await fetch(`${API_URL}/api/passenger/favorites`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const data = await response.json();
      
      if (data.success) {
        setFavorites(data.favorites);
      } else if (response.status === 403) {
        Alert.alert('Recurso Indisponível', data.error || 'Feature not available');
      } else {
        Alert.alert('Erro', data.error || 'Erro ao carregar favoritos');
      }
    } catch (error) {
      console.error('Erro ao carregar favoritos:', error);
      Alert.alert('Erro', 'Não foi possível carregar favoritos');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      setLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Erro', 'Permissão de localização negada');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setLocation({
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
      });
      
      Alert.alert('Sucesso', 'Localização atual capturada');
    } catch (error) {
      console.error('Erro ao obter localização:', error);
      Alert.alert('Erro', 'Não foi possível obter localização');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFavorite = async () => {
    if (!label.trim()) {
      Alert.alert('Erro', 'Digite um nome para o favorito');
      return;
    }
    
    if (!location) {
      Alert.alert('Erro', 'Capture a localização primeiro');
      return;
    }

    try {
      setLoading(true);
      const token = ''; // TODO: Get from auth context/storage
      
      const response = await fetch(`${API_URL}/api/passenger/favorites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          label: label.trim(),
          type,
          lat: location.lat,
          lng: location.lng,
        }),
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert('Sucesso', 'Favorito adicionado!');
        setShowAddForm(false);
        setLabel('');
        setType('OTHER');
        setLocation(null);
        loadFavorites();
      } else if (response.status === 403) {
        Alert.alert('Recurso Indisponível', data.error || 'Feature not available');
      } else {
        Alert.alert('Erro', data.error || 'Erro ao adicionar favorito');
      }
    } catch (error) {
      console.error('Erro ao adicionar favorito:', error);
      Alert.alert('Erro', 'Não foi possível adicionar favorito');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (id: string) => {
    Alert.alert(
      'Remover Favorito',
      'Tem certeza que deseja remover este favorito?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const token = ''; // TODO: Get from auth context/storage
              
              const response = await fetch(`${API_URL}/api/passenger/favorites/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });

              const data = await response.json();

              if (data.success) {
                Alert.alert('Sucesso', 'Favorito removido');
                loadFavorites();
              } else {
                Alert.alert('Erro', data.error || 'Erro ao remover favorito');
              }
            } catch (error) {
              console.error('Erro ao remover favorito:', error);
              Alert.alert('Erro', 'Não foi possível remover favorito');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (loading && favorites.length === 0) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Meus Favoritos</Text>
          <Text style={styles.subtitle}>Até 3 endereços</Text>
        </View>

        {/* Lista de Favoritos */}
        {favorites.map((fav) => (
          <View key={fav.id} style={styles.favoriteCard}>
            <View style={styles.favoriteIcon}>
              <Ionicons
                name={
                  fav.type === 'HOME' ? 'home' :
                  fav.type === 'WORK' ? 'briefcase' :
                  'location'
                }
                size={24}
                color="#FF6B35"
              />
            </View>
            <View style={styles.favoriteInfo}>
              <Text style={styles.favoriteLabel}>{fav.label}</Text>
              <Text style={styles.favoriteCoords}>
                {fav.lat.toFixed(4)}, {fav.lng.toFixed(4)}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => handleRemoveFavorite(fav.id)}
            >
              <Ionicons name="trash-outline" size={20} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        ))}

        {/* Botão Adicionar */}
        {!showAddForm && (
          <TouchableOpacity
            style={[styles.addButton, favorites.length >= 3 && styles.addButtonDisabled]}
            onPress={() => setShowAddForm(true)}
            disabled={favorites.length >= 3}
          >
            <Ionicons name="add-circle-outline" size={24} color="#FFF" />
            <Text style={styles.addButtonText}>
              {favorites.length >= 3 ? 'Limite atingido (3/3)' : 'Adicionar Favorito'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Formulário de Adicionar */}
        {showAddForm && (
          <View style={styles.form}>
            <Text style={styles.formTitle}>Novo Favorito</Text>

            <Text style={styles.label}>Nome</Text>
            <TextInput
              style={styles.input}
              value={label}
              onChangeText={setLabel}
              placeholder="Ex: Casa, Trabalho, Metrô"
              maxLength={50}
            />

            <Text style={styles.label}>Tipo</Text>
            <View style={styles.typeButtons}>
              <TouchableOpacity
                style={[styles.typeButton, type === 'HOME' && styles.typeButtonActive]}
                onPress={() => setType('HOME')}
              >
                <Ionicons name="home" size={20} color={type === 'HOME' ? '#FFF' : '#666'} />
                <Text style={[styles.typeButtonText, type === 'HOME' && styles.typeButtonTextActive]}>
                  Casa
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.typeButton, type === 'WORK' && styles.typeButtonActive]}
                onPress={() => setType('WORK')}
              >
                <Ionicons name="briefcase" size={20} color={type === 'WORK' ? '#FFF' : '#666'} />
                <Text style={[styles.typeButtonText, type === 'WORK' && styles.typeButtonTextActive]}>
                  Trabalho
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.typeButton, type === 'OTHER' && styles.typeButtonActive]}
                onPress={() => setType('OTHER')}
              >
                <Ionicons name="location" size={20} color={type === 'OTHER' ? '#FFF' : '#666'} />
                <Text style={[styles.typeButtonText, type === 'OTHER' && styles.typeButtonTextActive]}>
                  Outro
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Localização</Text>
            <TouchableOpacity style={styles.locationButton} onPress={getCurrentLocation}>
              <Ionicons name="navigate" size={20} color="#FF6B35" />
              <Text style={styles.locationButtonText}>
                {location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'Usar minha localização atual'}
              </Text>
            </TouchableOpacity>

            <View style={styles.formButtons}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => {
                  setShowAddForm(false);
                  setLabel('');
                  setType('OTHER');
                  setLocation(null);
                }}
              >
                <Text style={styles.buttonSecondaryText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary]}
                onPress={handleAddFavorite}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Salvando...' : 'Salvar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  favoriteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  favoriteIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF5F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  favoriteInfo: {
    flex: 1,
  },
  favoriteLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  favoriteCoords: {
    fontSize: 12,
    color: '#999',
  },
  removeButton: {
    padding: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B35',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  addButtonDisabled: {
    backgroundColor: '#CCC',
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  form: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 12,
    marginTop: 12,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    color: '#333',
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  typeButtonActive: {
    backgroundColor: '#FF6B35',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#666',
  },
  typeButtonTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F0',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF6B35',
    gap: 8,
  },
  locationButtonText: {
    flex: 1,
    fontSize: 14,
    color: '#FF6B35',
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#FF6B35',
  },
  buttonSecondary: {
    backgroundColor: '#F5F5F5',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonSecondaryText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
});
