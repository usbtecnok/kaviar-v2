import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

const GOLD = 'rgba(200,168,78,';
const RINGS = [
  { delay: 0, size: 140 },
  { delay: 700, size: 210 },
  { delay: 1400, size: 280 },
];

export function RadarPulse() {
  return (
    <View style={s.container}>
      {RINGS.map((ring, i) => (
        <Ring key={i} delay={ring.delay} size={ring.size} />
      ))}
    </View>
  );
}

function Ring({ delay, size }: { delay: number; size: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 2400, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });
  const opacity = anim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.8, 0.4, 0] });

  return (
    <Animated.View
      style={[s.ring, {
        width: size, height: size, borderRadius: size / 2,
        transform: [{ scale }],
        opacity,
      }]}
    />
  );
}

const s = StyleSheet.create({
  container: { position: 'absolute', justifyContent: 'center', alignItems: 'center' },
  ring: { position: 'absolute', borderWidth: 2, borderColor: `${GOLD}0.65)`, backgroundColor: `${GOLD}0.06)` },
});
