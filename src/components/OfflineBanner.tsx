import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { COLORS } from '../config/colors';

export function OfflineBanner() {
  const { isConnected } = useNetworkStatus();
  const wasDisconnected = useRef(false);
  const [showReconnecting, setShowReconnecting] = React.useState(false);
  const translateY = useRef(new Animated.Value(-50)).current;

  useEffect(() => {
    if (!isConnected) {
      wasDisconnected.current = true;
      setShowReconnecting(false);
      Animated.timing(translateY, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    } else if (wasDisconnected.current) {
      setShowReconnecting(true);
      const timer = setTimeout(() => {
        Animated.timing(translateY, { toValue: -50, duration: 300, useNativeDriver: true }).start(() => {
          wasDisconnected.current = false;
          setShowReconnecting(false);
        });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isConnected, translateY]);

  if (isConnected && !showReconnecting && !wasDisconnected.current) return null;

  return (
    <Animated.View style={[styles.container, showReconnecting && styles.reconnecting, { transform: [{ translateY }] }]}>
      <Text style={styles.text}>
        {showReconnecting ? 'Reconectado ✓' : 'Sem internet'}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.danger,
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
    zIndex: 9999,
  },
  reconnecting: {
    backgroundColor: COLORS.success,
  },
  text: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
