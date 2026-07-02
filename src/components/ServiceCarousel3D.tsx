/**
 * ServiceCarousel3D
 *
 * Carrossel 3D orbital premium — genérico para 3 ou 4 itens.
 *
 * - Card ativo centralizado e em destaque
 * - Cards laterais imediatos com profundidade (scale + opacity + translateX)
 * - Cards a 2+ posições de distância ficam ocultos (opacity 0)
 * - Toque no card lateral → avança para o centro
 * - Toque no card central → navega
 * - Swipe horizontal via PanResponder
 * - Dots de paginação clicáveis
 * - Sem autoplay
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
  items: ServiceItem[];           // 3 ou 4 itens
  onNavigate: (route: string) => void;
};

// ─── Constantes visuais ───────────────────────────────────────────────────────

const CARD_WIDTH  = 108;
const CARD_HEIGHT = 76;
const LATERAL_OFFSET = 100;   // translateX dos cards vizinhos imediatos
const SWIPE_THRESHOLD = 40;   // px mínimos para contar como swipe

// Retorna os valores de transformação para um offset relativo ao card ativo.
// offset: -1 (vizinho esquerdo), 0 (ativo), +1 (vizinho direito), ±2 (oculto)
function configForOffset(offset: number) {
  if (offset === 0)  return { scale: 1.00, opacity: 1.00, translateX: 0,                 zIndex: 10 };
  if (offset === -1) return { scale: 0.82, opacity: 0.72, translateX: -LATERAL_OFFSET,   zIndex: 2  };
  if (offset === 1)  return { scale: 0.82, opacity: 0.72, translateX:  LATERAL_OFFSET,   zIndex: 2  };
  // ±2 ou mais: oculto atrás do card lateral, não interfere visualmente
  return            { scale: 0.70, opacity: 0.00, translateX: offset < 0 ? -LATERAL_OFFSET * 1.6 : LATERAL_OFFSET * 1.6, zIndex: 0 };
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function ServiceCarousel3D({ items, onNavigate }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const count = items.length;

  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);

  // Posição fracionária do carrossel: 0 = primeiro card ativo, n-1 = último
  const position = useRef(new Animated.Value(0)).current;

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
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8,
      onPanResponderRelease: (_, { dx }) => {
        const current = activeIndexRef.current;
        if (dx < -SWIPE_THRESHOLD && current < count - 1) animateTo(current + 1);
        else if (dx > SWIPE_THRESHOLD && current > 0)     animateTo(current - 1);
      },
    })
  ).current;

  // ─── Renderização ─────────────────────────────────────────────────────────

  return (
    <View style={styles.wrapper} {...panResponder.panHandlers}>
      <View style={[styles.stage, { width: screenWidth - 40 }]}>
        {items.map((item, index) => {
          const isActive = index === activeIndex;

          // Para cada posição alvo possível (0..count-1), calcula o offset relativo
          const inputRange = Array.from({ length: count }, (_, i) => i);

          const translateXOutput = inputRange.map((activePos) =>
            configForOffset(index - activePos).translateX
          );
          const scaleOutput = inputRange.map((activePos) =>
            configForOffset(index - activePos).scale
          );
          const opacityOutput = inputRange.map((activePos) =>
            configForOffset(index - activePos).opacity
          );
          const zIndexForPos = inputRange.map((activePos) =>
            configForOffset(index - activePos).zIndex
          );

          // zIndex não pode ser animado — usamos o valor discreto do estado atual
          const offsetNow = index - activeIndex;
          const currentZIndex = configForOffset(offsetNow).zIndex;

          const translateX = position.interpolate({ inputRange, outputRange: translateXOutput, extrapolate: 'clamp' });
          const scale      = position.interpolate({ inputRange, outputRange: scaleOutput,     extrapolate: 'clamp' });
          const opacity    = position.interpolate({ inputRange, outputRange: opacityOutput,   extrapolate: 'clamp' });

          return (
            <Animated.View
              key={item.key}
              style={[
                styles.cardWrapper,
                {
                  zIndex: currentZIndex,
                  transform: [{ translateX }, { scale }],
                  opacity,
                },
              ]}
            >
              <TouchableOpacity
                style={[styles.card, isActive && styles.cardActive]}
                activeOpacity={isActive ? 0.82 : 1}
                onPress={() => {
                  if (!isActive) {
                    animateTo(index);
                  } else {
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
                {isActive && <View style={styles.activeDot} />}
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>

      {/* Dots de paginação */}
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
              style={[styles.dot, index === activeIndex && styles.dotActive]}
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

  stage: {
    height: CARD_HEIGHT + 16,
    alignItems: 'center',
    justifyContent: 'center',
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
