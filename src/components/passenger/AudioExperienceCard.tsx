import React, { useState, useRef, useEffect } from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';
import { PremiumCard } from './PremiumCard';
import { COLORS } from '../../config/colors';

interface Props {
  icon: string;
  title: string;
  subtitle: string;
  audioSource: number; // require('...') asset
  durationLabel?: string;
  category?: string;
}

export function AudioExperienceCard({ icon, title, subtitle, audioSource, durationLabel, category }: Props) {
  const [playing, setPlaying] = useState(false);
  const sound = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    return () => { sound.current?.unloadAsync().catch(() => {}); };
  }, []);

  const toggle = async () => {
    try {
      if (playing && sound.current) {
        await sound.current.pauseAsync();
        setPlaying(false);
        return;
      }
      if (sound.current) {
        await sound.current.playAsync();
        setPlaying(true);
        return;
      }
      const { sound: s } = await Audio.Sound.createAsync(
        audioSource,
        { shouldPlay: true },
        (status) => { if (status.isLoaded && status.didJustFinish) setPlaying(false); },
      );
      sound.current = s;
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  };

  return (
    <PremiumCard icon={icon} title={title}>
      <Text style={s.subtitle}>{subtitle}</Text>
      <View style={s.row}>
        <TouchableOpacity style={s.btn} onPress={toggle} activeOpacity={0.7}>
          <Text style={s.btnText}>{playing ? '⏸ Pausar' : '▶ Ouvir'}</Text>
        </TouchableOpacity>
        {durationLabel ? <Text style={s.duration}>{durationLabel}</Text> : null}
        {category ? <Text style={s.category}>{category}</Text> : null}
      </View>
    </PremiumCard>
  );
}

const s = StyleSheet.create({
  subtitle: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  btn: { backgroundColor: COLORS.primary, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14 },
  btnText: { fontSize: 13, fontWeight: '700', color: COLORS.textDark },
  duration: { fontSize: 11, color: COLORS.textMuted },
  category: { fontSize: 11, color: COLORS.primary, fontWeight: '600' },
});
