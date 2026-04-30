import React, { useState, useEffect, useRef } from 'react';
import { Text, StyleSheet, Animated } from 'react-native';
import { PremiumCard } from './PremiumCard';
import { COLORS } from '../../config/colors';

const SLIDES = [
  { icon: '💬', title: 'Conheça o KAVIAR', text: 'Uma plataforma feita para aproximar passageiros e motoristas da própria comunidade, com mais confiança, privacidade e cuidado.' },
  { icon: '🏢', title: 'USB Tecnok', text: 'KAVIAR é uma iniciativa da USB Tecnok Manutenção e Instalação de Computadores Ltda, conectando tecnologia e serviço local.' },
];

const INTERVAL = 8000;

/** Card institucional rotativo. Quando audioSource for adicionado no futuro, pode migrar para AudioExperienceCard. */
export function InstitutionalCard() {
  const [idx, setIdx] = useState(0);
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setInterval(() => {
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        setIdx(i => (i + 1) % SLIDES.length);
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      });
    }, INTERVAL);
    return () => clearInterval(timer);
  }, []);

  const slide = SLIDES[idx];

  return (
    <PremiumCard icon={slide.icon} title={slide.title}>
      <Animated.View style={{ opacity }}>
        <Text style={s.text}>{slide.text}</Text>
      </Animated.View>
    </PremiumCard>
  );
}

const s = StyleSheet.create({
  text: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },
});
