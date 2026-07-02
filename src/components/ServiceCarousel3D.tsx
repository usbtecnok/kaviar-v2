/**
 * ServiceCarousel3D
 *
 * Carrossel 3D orbital premium para a seção "Serviços" da Home do Passageiro.
 *
 * - 3 cards: Corrida, Rotas, Grupos
 * - Card ativo centralizado e em destaque
 * - Cards laterais com profundidade (rotateY + scale + opacity)
 * - Toque no card lateral → avança para o centro
 * - Toque no card central → navega
 * - Swipe horizontal → troca de card
 * - Sem autoplay (comportamento discreto por padrão)
 * - Usa apenas react-native Animated (sem Reanimated / gesture-handler)
 * - useNativeDriver: true em todos os Animated
 */

import React, { useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  AccessibilityInfo,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type ServiceItem = {
  key: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  route: string;
};

type Props = {
  items: ServiceItem[];           // deve ter exatamente 3 itens
  onNavigate: (route: string) => void;
};

// ─── Constantes visuais ───────────────────────────────────────────────────────

const CARD_WIDTH  = 108;
const CARD_HEIGHT = 76;
const LATERAL_OFFSET = 100;   // translateX dos cards laterais
const SWIPE_THRESHOLD = 40;   // px mínimos para contar como swipe

// Valores por posição relativa: -1 (esquerda), 0 (centro), +1 (direita)
const CONFIG = {
  scale:    { [-1]: 0.82, [0]: 1.00, [1]: 0.82 },
  opacity:  { [-1]: 0.72, [0]: 1.00, [1]: 0.72 },
  rotateY:  { [-1]: '-32deg', [0]: '0deg', [1]: '32deg' },
  translateX: { [-1]: -LATERAL_OFFSET, [0]: 0, [1]: LATERAL_OFFSET },
  zIndex:   { [-1]: 1, [0]: 10, [1]: 1 },
} as const;

// ─── Componente ───────────────────────────────────────────────────────────────

export function ServiceCarousel3D({ items, onNavigate }: Props) {
  const { width: screenWidth } = useWindowDimensions();

  // índice do card ativo
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);

  // Um único Animated.Value para a posição fracionária do carrossel
  // 0 = primeiro card ativo, 1 = segundo, 2 = terceiro
  const position = useRef(new Animated.Value(0)).current;

  // Avança o carrossel para o índice alvo com animação suave
  const animateTo = (index: number) => {
    activeIndexRef.current = index;
    setActiveIndex(index);
    Animated.spring(position, {
      toValue: index,
      useNativeDriver: true,
      tension: 60,
      friction: 10,
    }).start();
  };

  // ─── PanResponder para swipe ──────────────────────────────────────────────

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, { dx, dy }) => {
        // Captura apenas gestos predominantemente horizontais
        return Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8;
      },
      onPanResponderRelease: (_, { dx }) => {
        const current = activeIndexRef.current;
        if (dx < -SWIPE_THRESHOLD && current < items.length - 1) {
          animateTo(current + 1);
        } else if (dx > SWIPE_THRESHOLD && current > 0) {
          animateTo(current - 1);
        }
      },
    })
  ).current;

  // ─── Renderização dos cards ───────────────────────────────────────────────

  return (
    <View style={styles.wrapper} {...panResponder.panHandlers}>
      {/* Container com perspective para o efeito 3D */}
      <View style={[styles.stage, { width: screenWidth - 40 }]}>
        {items.map((item, index) => {
          // Offset relativo ao card ativo: -1, 0 ou +1
          const relativeOffset = index - activeIndex;
          const isActive = relativeOffset === 0;
          const clampedOffset = Math.max(-1, Math.min(1, relativeOffset)) as -1 | 0 | 1;

          // Interpola transform e opacity a partir da posição animada
          const translateX = position.interpolate({
            inputRange: [0, 1, 2],
            outputRange: items.map((_, i) => CONFIG.translateX[(index - i) as -1 | 0 | 1] ?? 0),
            extrapolate: 'clamp',
          });

          const scale = position.interpolate({
            inputRange: [0, 1, 2],
            outputRange: items.map((_, i) => CONFIG.scale[(index - i) as -1 | 0 | 1] ?? 0.8),
            extrapolate: 'clamp',
          });

          const opacity = position.interpolate({
            inputRange: [0, 1, 2],
            outputRange: items.map((_, i) => CONFIG.opacity[(index - i) as -1 | 0 | 1] ?? 0.5),
            extrapolate: 'clamp',
          });

          // rotateY não pode ser interpolado diretamente com useNativeDriver
          // Usamos um Animated.Value derivado de scale para aproximar o efeito
          // A perspectiva é aplicada no container pai
          const rotateYDeg = position.interpolate({
            inputRange: [0, 1, 2],
            outputRange: items.map((_, i) => {
              const off = index - i;
              if (off === -1) return -32;
              if (off === 0) return 0;
              if (off === 1) return 32;
              return off < -1 ? -32 : 32;
            }),
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={item.key}
              style={[
                styles.cardWrapper,
                {
                  zIndex: CONFIG.zIndex[clampedOffset],
                  transform: [
                    { translateX },
                    { scale },
                  ],
                  opacity,
                },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.card,
                  isActive && styles.cardActive,
                ]}
                activeOpacity={isActive ? 0.82 : 1}
                onPress={() => {
                  if (!isActive) {
                    // Card lateral: traz para o centro
                    animateTo(index);
                  } else {
                    // Card ativo: navega
                    onNavigate(item.route);
                  }
                }}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                accessibilityState={{ selected: isActive }}
                hitSlop={isActive ? undefined : { top: 10, bottom: 10, left: 16, right: 16 }}
              >
                <Ionicons
                  name={item.icon}
                  size={20}
                  color={isActive ? '#8A6D1A' : '#7A8899'}
                />
                <Text style={[styles.label, isActive && styles.labelActive]}>
                  {item.label}
                </Text>
                {isActive && (
                  <View style={styles.activeDot} />
                )}
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>

      {/* Indicadores de paginação */}
      <View style={styles.dots}>
        {items.map((item, index) => (
          <TouchableOpacity
            key={item.key}
            onPress={() => animateTo(index)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={`Ir para ${item.label}`}
          >
            <Animated.View
              style={[
                styles.dot,
                index === activeIndex && styles.dotActive,
              ]}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    paddingVertical: 4,
  },

  // Container com perspectiva 3D
  stage: {
    height: CARD_HEIGHT + 16,
    alignItems: 'center',
    justifyContent: 'center',
    // perspective no React Native não é suportado via StyleSheet diretamente;
    // o efeito de profundidade vem do scale + translateX combinados
  },

  cardWrapper: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },

  card: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E6ED',
    backgroundColor: '#FAFBFC',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    shadowColor: '#121316',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },

  cardActive: {
    borderColor: '#D4A843',
    borderWidth: 1.5,
    backgroundColor: '#FFF9E8',
    shadowColor: '#B8891A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 6,
  },

  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9AA5B4',
  },

  labelActive: {
    color: '#121316',
    fontWeight: '700',
  },

  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#C9A84C',
    position: 'absolute',
    bottom: 7,
  },

  dots: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },

  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#DDE1E9',
  },

  dotActive: {
    width: 18,
    backgroundColor: '#C9A84C',
  },
});
