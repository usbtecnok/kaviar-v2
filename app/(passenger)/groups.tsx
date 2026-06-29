import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS } from '../../src/config/colors';
import { passengerApi } from '../../src/api/passenger.api';

type Membership = {
  id: string;
  role: string;
  status: string;
  invite_source?: string | null;
  joined_at?: string | null;
  group: {
    id: string;
    public_name: string;
    description?: string | null;
    status: string;
  };
};

type InvitePreview = {
  code: string;
  status: string;
  expires_at?: string | null;
  remaining_uses?: number | null;
  group?: {
    id: string;
    public_name: string;
    description?: string | null;
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

export default function PassengerGroupsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [code, setCode] = useState('');
  const [groups, setGroups] = useState<Membership[]>([]);
  const [invite, setInvite] = useState<InvitePreview | null>(null);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const data = await passengerApi.getMyGroups();
      setGroups(data);
    } catch {
      Alert.alert('Erro', 'Nao foi possivel carregar seus grupos agora.');
    } finally {
      setLoading(false);
    }
  };

  const checkInvite = async () => {
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      Alert.alert('Codigo obrigatorio', 'Digite um codigo de convite.');
      return;
    }

    try {
      const data = await passengerApi.getGroupInvite(normalized);
      setInvite(data);
    } catch (error: any) {
      const message = error?.response?.data?.error || 'Convite nao encontrado';
      setInvite(null);
      Alert.alert('Convite', message);
    }
  };

  const joinGroup = async () => {
    const normalized = code.trim().toUpperCase();
    if (!normalized) return;

    try {
      setJoining(true);
      await passengerApi.joinGroupByInvite(normalized);
      Alert.alert('Sucesso', 'Voce entrou no Grupo KAVIAR.');
      setCode('');
      setInvite(null);
      await loadGroups();
    } catch (error: any) {
      const message = error?.response?.data?.error || 'Nao foi possivel entrar no grupo';
      Alert.alert('Falha ao entrar', message);
    } finally {
      setJoining(false);
    }
  };

  const renderGroup = ({ item }: { item: Membership }) => (
    <View style={styles.card}>
      <Text style={styles.groupName}>{item.group.public_name}</Text>
      {!!item.group.description && <Text style={styles.groupDescription}>{item.group.description}</Text>}
      <View style={styles.metaRow}>
        <Text style={styles.metaText}>Papel: {item.role}</Text>
        <Text style={styles.metaText}>Status: {item.status}</Text>
      </View>
      <Text style={styles.metaText}>Entrada: {formatDate(item.joined_at)}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Meus Grupos KAVIAR</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.inviteBox}>
        <Text style={styles.sectionTitle}>Entrar com codigo de convite</Text>
        <View style={styles.inputRow}>
          <TextInput
            value={code}
            onChangeText={(value) => setCode(value.toUpperCase())}
            placeholder="Ex.: GKV-ABC123"
            placeholderTextColor={COLORS.textMuted}
            style={styles.input}
            autoCapitalize="characters"
          />
          <TouchableOpacity style={styles.secondaryBtn} onPress={checkInvite}>
            <Text style={styles.secondaryBtnText}>Validar</Text>
          </TouchableOpacity>
        </View>

        {invite && (
          <View style={styles.previewBox}>
            <Text style={styles.previewTitle}>{invite.group?.public_name || 'Grupo KAVIAR'}</Text>
            {!!invite.group?.description && <Text style={styles.previewDescription}>{invite.group.description}</Text>}
            <Text style={styles.metaText}>Status do convite: {invite.status}</Text>
            <Text style={styles.metaText}>Expira em: {formatDate(invite.expires_at)}</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={joinGroup} disabled={joining}>
              {joining ? <ActivityIndicator color="#111" /> : <Text style={styles.primaryBtnText}>Entrar no grupo</Text>}
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Text style={styles.sectionTitle}>Seus grupos</Text>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : groups.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="people-outline" size={42} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>Voce ainda nao participa de grupos.</Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.id}
          renderItem={renderGroup}
          contentContainerStyle={{ paddingBottom: 20 }}
          style={{ marginTop: 8 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
  inviteBox: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 12, marginBottom: 14 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { flex: 1, height: 44, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, color: COLORS.textPrimary, backgroundColor: COLORS.background },
  secondaryBtn: { height: 44, borderRadius: 10, borderWidth: 1, borderColor: COLORS.primary, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  secondaryBtnText: { color: COLORS.primary, fontWeight: '700' },
  previewBox: { marginTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10 },
  previewTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  previewDescription: { color: COLORS.textSecondary, marginTop: 4, marginBottom: 6 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  metaText: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  primaryBtn: { marginTop: 10, backgroundColor: COLORS.primary, borderRadius: 10, alignItems: 'center', justifyContent: 'center', height: 44 },
  primaryBtnText: { color: '#111', fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: COLORS.textMuted, marginTop: 8 },
  card: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 12, marginBottom: 10 },
  groupName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  groupDescription: { color: COLORS.textSecondary, marginTop: 4, marginBottom: 4 },
});
