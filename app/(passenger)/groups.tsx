import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
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

type GroupPost = {
  id: string;
  group_id: string;
  title: string;
  body: string;
  category: string;
  is_pinned: boolean;
  status: string;
  published_at: string;
  expires_at?: string | null;
  read_count?: number;
  is_read_by_me?: boolean;
  read_at?: string | null;
};

const GROUP_POST_CATEGORY_LABELS: Record<string, string> = {
  general: 'Geral',
  important: 'Importante',
  schedule: 'Horário',
  meeting_point: 'Ponto de encontro',
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
  const params = useLocalSearchParams<{ inviteCode?: string }>();
  const normalizedInviteCode = useMemo(
    () => String(params?.inviteCode || '').trim().toUpperCase().replace(/\s+/g, ''),
    [params?.inviteCode]
  );
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [code, setCode] = useState('');
  const [groups, setGroups] = useState<Membership[]>([]);
  const [invite, setInvite] = useState<InvitePreview | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [groupPosts, setGroupPosts] = useState<GroupPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsError, setPostsError] = useState('');
  const [postMarkingId, setPostMarkingId] = useState('');
  const lastAutoFilledCode = useRef<string>('');

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (selectedGroupId) {
      loadGroupPosts(selectedGroupId);
      return;
    }

    setGroupPosts([]);
    setPostsError('');
  }, [selectedGroupId]);

  useEffect(() => {
    if (!normalizedInviteCode) return;

    setCode((currentCode) => {
      const canReplace = currentCode.trim() === '' || currentCode === lastAutoFilledCode.current;
      if (!canReplace) return currentCode;
      lastAutoFilledCode.current = normalizedInviteCode;
      return normalizedInviteCode;
    });
  }, [normalizedInviteCode]);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const data = await passengerApi.getMyGroups();
      setGroups(data);
      setSelectedGroupId((currentGroupId) => currentGroupId || data[0]?.group?.id || '');
    } catch {
      Alert.alert('Erro', 'Nao foi possivel carregar seus grupos agora.');
    } finally {
      setLoading(false);
    }
  };

  const loadGroupPosts = async (groupId: string) => {
    if (!groupId) return;

    try {
      setPostsLoading(true);
      setPostsError('');
      const data = await passengerApi.getGroupPosts(groupId);
      setGroupPosts(data);
    } catch {
      setGroupPosts([]);
      setPostsError('Não foi possível carregar os comunicados.');
    } finally {
      setPostsLoading(false);
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

  const selectedGroup = useMemo(
    () => groups.find((membership) => membership.group.id === selectedGroupId) || null,
    [groups, selectedGroupId]
  );

  const sortedGroupPosts = useMemo(() => {
    return [...groupPosts].sort((left, right) => {
      if (left.is_pinned !== right.is_pinned) return left.is_pinned ? -1 : 1;
      return new Date(right.published_at).getTime() - new Date(left.published_at).getTime();
    });
  }, [groupPosts]);

  const markPostAsRead = async (postId: string) => {
    if (!selectedGroupId) return;

    try {
      setPostMarkingId(postId);
      await passengerApi.markGroupPostAsRead(selectedGroupId, postId);
      setGroupPosts((currentPosts) =>
        currentPosts.map((post) => {
          if (post.id !== postId) return post;

          const alreadyRead = !!post.is_read_by_me;
          return {
            ...post,
            is_read_by_me: true,
            read_at: post.read_at || new Date().toISOString(),
            read_count: typeof post.read_count === 'number' && !alreadyRead ? post.read_count + 1 : post.read_count,
          };
        })
      );
    } catch {
      Alert.alert('Erro', 'Não foi possível marcar o comunicado como ciente.');
    } finally {
      setPostMarkingId('');
    }
  };

  const renderGroup = ({ item }: { item: Membership }) => {
    const isSelected = selectedGroupId === item.group.id;

    return (
      <TouchableOpacity
        style={[styles.card, isSelected && styles.cardSelected]}
        onPress={() => setSelectedGroupId(item.group.id)}
        activeOpacity={0.85}
      >
        <Text style={styles.groupName}>{item.group.public_name}</Text>
        {!!item.group.description && <Text style={styles.groupDescription}>{item.group.description}</Text>}
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>Papel: {item.role}</Text>
          <Text style={styles.metaText}>Status: {item.status}</Text>
        </View>
        <Text style={styles.metaText}>Entrada: {formatDate(item.joined_at)}</Text>
      </TouchableOpacity>
    );
  };

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

      <View style={styles.muralBox}>
        <Text style={styles.sectionTitle}>Mural do Grupo</Text>
        {!selectedGroup ? (
          <Text style={styles.emptyMuralText}>Selecione um grupo para ver os comunicados.</Text>
        ) : postsLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        ) : postsError ? (
          <Text style={styles.errorText}>{postsError}</Text>
        ) : sortedGroupPosts.length === 0 ? (
          <Text style={styles.emptyMuralText}>Nenhum comunicado no momento.</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {sortedGroupPosts.map((post) => (
              <View key={post.id} style={[styles.postCard, post.is_pinned && styles.postCardPinned]}>
                <View style={styles.postHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.postTitle}>{post.title}</Text>
                    <View style={styles.postMetaRow}>
                      <Text style={styles.postMetaChip}>{GROUP_POST_CATEGORY_LABELS[post.category] || post.category}</Text>
                      <Text style={styles.postMetaText}>{formatDate(post.published_at)}</Text>
                      {typeof post.read_count === 'number' && <Text style={styles.postMetaText}>Cientes: {post.read_count}</Text>}
                    </View>
                  </View>
                  {post.is_read_by_me ? <Text style={styles.readBadge}>Ciente</Text> : null}
                </View>
                <Text style={styles.postBody}>{post.body}</Text>
                {!post.is_read_by_me && (
                  <TouchableOpacity
                    style={styles.readBtn}
                    onPress={() => markPostAsRead(post.id)}
                    disabled={postMarkingId === post.id}
                  >
                    {postMarkingId === post.id ? <ActivityIndicator color="#111" /> : <Text style={styles.readBtnText}>Marcar como ciente</Text>}
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}
      </View>
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
  cardSelected: { borderColor: COLORS.primary, backgroundColor: '#161922' },
  groupName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  groupDescription: { color: COLORS.textSecondary, marginTop: 4, marginBottom: 4 },
  muralBox: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 12, marginTop: 6, marginBottom: 12 },
  emptyMuralText: { color: COLORS.textMuted, fontSize: 13 },
  errorText: { color: '#FCA5A5', fontSize: 13 },
  postCard: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 12, backgroundColor: COLORS.background },
  postCardPinned: { borderColor: COLORS.primary },
  postHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  postTitle: { color: COLORS.textPrimary, fontWeight: '700', fontSize: 14 },
  postMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  postMetaChip: { color: COLORS.primary, fontSize: 11, fontWeight: '700' },
  postMetaText: { color: COLORS.textMuted, fontSize: 11 },
  readBadge: { color: '#BFF0D0', fontWeight: '700', fontSize: 12, marginLeft: 8 },
  postBody: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 8, marginBottom: 10 },
  readBtn: { minHeight: 40, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  readBtnText: { color: '#111', fontWeight: '800' },
});
