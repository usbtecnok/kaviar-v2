import React, { useState } from 'react';
import { Image, ImageSourcePropType, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type KaviarPremiumRailItem = {
  key: string;
  image: ImageSourcePropType;
  artworkReady: boolean;
  fallbackIcon: keyof typeof Ionicons.glyphMap;
  fallbackEmoji: string;
  fallbackDetailEmoji: string;
  title: string;
  description: string;
  cta: string;
  tint: string;
  accent: string;
};

type KaviarPremiumRailCardProps = {
  item: KaviarPremiumRailItem;
  onPress: () => void;
  disabled?: boolean;
};

export function KaviarPremiumRailCard({ item, onPress, disabled = false }: KaviarPremiumRailCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const showArtwork = item.artworkReady && !imageFailed;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={disabled ? 1 : 0.9}
      disabled={disabled}
      onPress={onPress}
    >
      <View style={[styles.scene, { backgroundColor: item.tint }]}>
        {showArtwork ? (
          <Image
            source={item.image}
            style={styles.sticker}
            resizeMode="contain"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <>
            <Text style={styles.fallbackEmoji}>{item.fallbackEmoji}</Text>
            <View style={styles.fallbackBubble}>
              <Text style={styles.fallbackDetail}>{item.fallbackDetailEmoji}</Text>
            </View>
            <View style={styles.fallbackIconChip}>
              <Ionicons name={item.fallbackIcon} size={11} color={item.accent} />
            </View>
          </>
        )}
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description} numberOfLines={3}>{item.description}</Text>
      <View style={[styles.ctaWrap, { borderColor: item.accent }]}>
        <Text style={[styles.cta, { color: item.accent }]}>{item.cta}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 188,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8EBF0',
    backgroundColor: '#FFFFFF',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  scene: {
    width: 58,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8D9AA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
    position: 'relative',
  },
  sticker: {
    width: 46,
    height: 42,
  },
  fallbackEmoji: {
    fontSize: 24,
  },
  fallbackBubble: {
    position: 'absolute',
    right: -5,
    bottom: -5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E9EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackDetail: {
    fontSize: 10,
  },
  fallbackIconChip: {
    position: 'absolute',
    left: -5,
    top: -5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E9EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#121316',
    marginBottom: 4,
  },
  description: {
    fontSize: 11,
    lineHeight: 16,
    color: '#5E6470',
    minHeight: 48,
  },
  ctaWrap: {
    marginTop: 8,
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: '#FFFBF0',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cta: {
    fontSize: 10,
    fontWeight: '700',
  },
});
