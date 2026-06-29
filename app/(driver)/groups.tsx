import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS } from '../../src/config/colors';
import { driverApi } from '../../src/api/driver.api';

type DriverMembership = {
  id: string;
  role: string;
  status: string;
  joined_at?: string | null;
  group: {
    id: string;
    public_name: string;
    status: string;
    community_id?: string | null;
    neighborhood_id?: string | null;
    territory_id?: string | null;
  };
};

function formatDate(value?: string | null) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString('pt-BR');
  } catch {
    return value;
  }
}

export default function DriverGroupsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<DriverMembership[]>([]);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const data = await driverApi.getMyGroups();
      setGroups(data);
    } catch {
      Alert.alert('Erro', 'Nao foi possivel carregar seus grupos.');
    } finally {
      setLoading(false);
    }
  };

  const renderGroup = ({ item }: { item: DriverMembership }) => (
    <View style={styles.card}>
      <Text style={styles.groupName}>{item.group.public_name}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.metaText}>Papel: {item.role}</Text>
        <Text style={styles.metaText}>Status: {item.status}</Text>
      </View>
      <Text style={styles.metaText}>Entrada: {formatDate(item.joined_at)}</Text>
      <Text style={styles.metaText}>Territorio: {item.group.territory_id || '-'}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Grupos KAVIAR</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={styles.helperText}>Visualizacao apenas leitura. O fluxo de corrida nao foi alterado.</Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : groups.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="people-outline" size={42} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>Nenhum grupo vinculado ao seu perfil.</Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.id}
          renderItem={renderGroup}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  helperText: { color: COLORS.textSecondary, fontSize: 12, marginBottom: 10 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: COLORS.textMuted, marginTop: 8 },
  card: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 12, marginBottom: 10 },
  groupName: { color: COLORS.textPrimary, fontWeight: '700', fontSize: 15 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  metaText: { color: COLORS.textSecondary, marginTop: 2, fontSize: 12 },
});
