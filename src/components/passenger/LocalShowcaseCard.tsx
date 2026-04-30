import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Linking } from 'react-native';
import { apiClient } from '../../api/client';
import { COLORS } from '../../config/colors';

export interface ShowcaseItem {
  id: string;
  icon: string;
  title: string;
  description: string;
  cta_label: string;
  cta_url: string;
}

const INTERVAL = 12000;

interface Props {
  rideId?: string | null;
}

export function LocalShowcaseCard({ rideId }: Props) {
  const [items, setItems] = useState<ShowcaseItem[]>([]);
  const [idx, setIdx] = useState(0);
  const opacity = useRef(new Animated.Value(1)).current;
  const exposedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    apiClient.get('/api/passengers/me/showcase')
      .then(({ data }) => setItems(data.data || []))
      .catch(() => {});
  }, []);

  // Register exposure when item becomes visible
  useEffect(() => {
    if (!items.length) return;
    const item = items[idx % items.length];
    if (!item?.id || exposedRef.current.has(item.id)) return;
    exposedRef.current.add(item.id);
    apiClient.post(`/api/passengers/me/showcase/${item.id}/exposure`, { ride_id: rideId || undefined }).catch(() => {});
  }, [idx, items.length]);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(() => {
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => {
        setIdx(i => (i + 1) % items.length);
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();
      });
    }, INTERVAL);
    return () => clearInterval(timer);
  }, [items.length]);

  if (!items.length) return null;

  const item = items[idx % items.length];

  const handleCTA = () => {
    if (item?.id) {
      apiClient.post(`/api/passengers/me/showcase/${item.id}/click`, { ride_id: rideId || undefined }).catch(() => {});
    }
    Linking.openURL(item.cta_url);
  };

  return (
    <View style={s.card}>
      <View style={s.border} />
      <View style={s.content}>
        <Text style={s.badge}>📍 Vitrine Local</Text>
        <View style={s.header}>
          <Text style={s.icon}>{item.icon}</Text>
          <Text style={s.title}>{item.title}</Text>
        </View>
        <Animated.View style={{ opacity }}>
          <Text style={s.text}>{item.description}</Text>
          <TouchableOpacity style={s.cta} onPress={handleCTA} activeOpacity={0.7}>
            <Text style={s.ctaText}>{item.cta_label}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row', backgroundColor: '#12120a', borderRadius: 12,
    marginBottom: 10, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(200,168,78,0.2)',
  },
  border: { width: 4, backgroundColor: 'rgba(200,168,78,0.5)' },
  content: { flex: 1, padding: 12 },
  badge: { fontSize: 9, fontWeight: '700', color: 'rgba(200,168,78,0.6)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  icon: { fontSize: 18 },
  title: { fontSize: 14, fontWeight: '800', color: '#C8A84E' },
  text: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17, marginBottom: 10 },
  cta: { alignSelf: 'flex-start', borderRadius: 8, paddingVertical: 7, paddingHorizontal: 14, borderWidth: 1.5, borderColor: COLORS.primary, backgroundColor: 'transparent' },
  ctaText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
});
