import React, { useState, useEffect, useRef } from 'react';
import { Text, TouchableOpacity, StyleSheet, Animated, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { PremiumCard } from './PremiumCard';
import { COLORS } from '../../config/colors';

interface Slide { icon: string; title: string; text: string; cta: string; action: string }

const LOCAL_REFER: Record<string, { title: string; text: string }> = {
  'Furnas': { title: 'Indique motoristas de Furnas', text: 'Conhece um bom motorista em Furnas? Ajude o KAVIAR a fortalecer a rede local com mais confiança e qualidade.' },
  'Agrícola': { title: 'Expansão na Agrícola', text: 'Estamos ampliando nossa rede na Agrícola. Indique motoristas da região e ajude sua comunidade a se locomover melhor.' },
  'Mata Machado': { title: 'KAVIAR em Mata Machado', text: 'Ajude a fortalecer a mobilidade local em Mata Machado indicando motoristas de confiança e novas oportunidades.' },
};

function getLocalSlides(name?: string | null): Slide[] {
  const valid = name && name !== 'KAVIAR' ? name : null;
  const local = valid ? LOCAL_REFER[valid] : null;
  const refer: Slide = local
    ? { icon: '🤝', title: local.title, text: local.text, cta: 'Quero indicar', action: 'refer' }
    : valid
    ? { icon: '🤝', title: `Indique motoristas em ${valid}`, text: `Conhece um bom motorista em ${valid}? Sua indicação pode ajudar o KAVIAR a fortalecer a mobilidade local com mais confiança e qualidade.`, cta: 'Quero indicar', action: 'refer' }
    : { icon: '🤝', title: 'Indique motoristas para sua região', text: 'Conhece um bom motorista? Sua indicação pode ajudar o KAVIAR a crescer com mais qualidade na sua comunidade.', cta: 'Quero indicar', action: 'refer' };

  return [
    refer,
    { icon: '🗺️', title: 'Crie pacotes turísticos KAVIAR', text: 'Tem uma rota, passeio ou experiência local? O KAVIAR pode ajudar a transformar sua ideia em um pacote especial.', cta: 'Sugerir pacote', action: 'tourism' },
    { icon: '💼', title: 'Faça parte do KAVIAR', text: 'Ajude a conectar passageiros, motoristas e oportunidades locais. Seja um consultor KAVIAR e participe do crescimento da rede.', cta: 'Saiba mais', action: 'consultor' },
  ];
}

const INTERVAL = 10000;
const WA_TOURISM = 'https://wa.me/5521968648777?text=Ol%C3%A1%2C%20tenho%20uma%20ideia%20de%20pacote%20tur%C3%ADstico%20para%20o%20KAVIAR';

interface Props { neighborhoodName?: string | null }

export function KaviarOpportunityCard({ neighborhoodName }: Props) {
  const router = useRouter();
  const slides = getLocalSlides(neighborhoodName);
  const [idx, setIdx] = useState(0);
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setInterval(() => {
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => {
        setIdx(i => (i + 1) % slides.length);
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();
      });
    }, INTERVAL);
    return () => clearInterval(timer);
  }, []);

  const slide = slides[idx % slides.length];

  const handleCta = () => {
    if (slide.action === 'refer') router.push('/(passenger)/refer-driver');
    else if (slide.action === 'tourism') Linking.openURL(WA_TOURISM);
    else Linking.openURL('https://kaviar.com.br/#consultor');
  };

  return (
    <PremiumCard icon={slide.icon} title={slide.title}>
      <Animated.View style={{ opacity }}>
        <Text style={s.text}>{slide.text}</Text>
        <TouchableOpacity style={s.btn} onPress={handleCta} activeOpacity={0.7}>
          <Text style={s.btnText}>{slide.cta}</Text>
        </TouchableOpacity>
      </Animated.View>
    </PremiumCard>
  );
}

const s = StyleSheet.create({
  text: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17, marginBottom: 10 },
  btn: { alignSelf: 'flex-start', backgroundColor: COLORS.primary, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14 },
  btnText: { fontSize: 13, fontWeight: '700', color: COLORS.textDark },
});
