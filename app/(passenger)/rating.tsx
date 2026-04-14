import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../src/components/Button';
import { apiClient } from '../../src/api/client';
import { authStore } from '../../src/auth/auth.store';
import { friendlyError } from '../../src/utils/errorMessage';
import { COLORS } from '../../src/config/colors';

const TAGS = ['Dirigiu bem', 'Simpático', 'Carro limpo', 'Conhece a região', 'Pontual'];

export default function Rating() {
  const router = useRouter();
  const { rideId, driverName, driverId } = useLocalSearchParams<{ rideId: string; driverName?: string; driverId?: string }>();
  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleSubmit = async () => {
    if (rating === 0) { Alert.alert('Avaliação', 'Selecione uma nota.'); return; }
    if (!rideId || !driverId) { router.replace('/(passenger)/map'); return; }
    const user = authStore.getUser();
    if (!user?.id) { router.replace('/(auth)/login'); return; }

    setSubmitting(true);
    try {
      await apiClient.post('/api/ratings', {
        rideId, raterId: user.id, ratedId: driverId, raterType: 'PASSENGER',
        score: rating,
        tags: selectedTags.length > 0 ? selectedTags.join(',') : undefined,
        comment: comment.trim() || undefined,
      });
      setSubmitted(true);
      setTimeout(() => router.replace('/(passenger)/map'), 1500);
    } catch (e: any) {
      if (e.response?.status === 409) {
        setSubmitted(true);
        setTimeout(() => router.replace('/(passenger)/map'), 1500);
      } else {
        Alert.alert('Erro', friendlyError(e, 'Não foi possível enviar a avaliação.'));
      }
    } finally { setSubmitting(false); }
  };

  if (submitted) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.center}>
          <Text style={{ fontSize: 48, marginBottom: 8 }}>🎉</Text>
          <Text style={s.thankYou}>Obrigado!</Text>
          <Text style={s.subText}>Sua avaliação ajuda a comunidade 🏘️</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.center}>
        <Text style={s.title}>Como foi a viagem{driverName ? `\ncom ${driverName}` : ''}?</Text>

        <View style={s.stars}>
          {[1, 2, 3, 4, 5].map((n) => (
            <TouchableOpacity key={n} onPress={() => setRating(n)} accessibilityRole="button" accessibilityLabel={`${n} estrela${n > 1 ? 's' : ''}`}>
              <Text style={s.star}>{n <= rating ? '⭐' : '☆'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.ratingLabel}>
          {rating === 0 ? 'Toque para avaliar' : `${rating} estrela${rating > 1 ? 's' : ''}`}
        </Text>

        {rating >= 4 && (
          <View style={s.tagsContainer}>
            <Text style={s.tagsTitle}>O que mais gostou?</Text>
            <View style={s.tagsRow}>
              {TAGS.map(tag => (
                <TouchableOpacity key={tag} style={[s.tag, selectedTags.includes(tag) && s.tagSelected]} onPress={() => toggleTag(tag)}>
                  <Text style={[s.tagText, selectedTags.includes(tag) && s.tagTextSelected]}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {rating > 0 && (
          <TextInput
            style={s.commentInput}
            placeholder="Algum comentário? (opcional)"
            placeholderTextColor={COLORS.textMuted}
            value={comment}
            onChangeText={setComment}
            maxLength={200}
            multiline={false}
          />
        )}

        <Button title="Enviar" variant="primary" onPress={handleSubmit} loading={submitting} disabled={submitting} />
        <Button title="Pular" variant="secondary" onPress={() => router.replace('/(passenger)/map')} style={{ marginTop: 8 }} disabled={submitting} />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center', marginBottom: 24, lineHeight: 30 },
  stars: { flexDirection: 'row', marginBottom: 12 },
  star: { fontSize: 44, marginHorizontal: 6 },
  ratingLabel: { fontSize: 15, color: COLORS.textSecondary, marginBottom: 20 },
  tagsContainer: { width: '100%', marginBottom: 16 },
  tagsTitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 10, textAlign: 'center' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  tag: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  tagSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.surfaceLight },
  tagText: { fontSize: 13, color: COLORS.textSecondary },
  tagTextSelected: { color: COLORS.primary, fontWeight: '600' },
  commentInput: { width: '100%', backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 14, fontSize: 15, color: COLORS.textPrimary, marginBottom: 20 },
  thankYou: { fontSize: 28, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
  subText: { fontSize: 16, color: COLORS.textSecondary },
});
