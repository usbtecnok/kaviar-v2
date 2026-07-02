import React from 'react';
import { Image, ImageSourcePropType, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type KaviarPremiumRailItem = {
  key: string;
  image: ImageSourcePropType;
  artworkReady: boolean;
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
  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={disabled ? 1 : 0.9}
      disabled={disabled}
      onPress={onPress}
    >
      <View style={[styles.scene, { backgroundColor: item.tint }]}>
        <View style={styles.artworkPlate}>
        <Image
          source={item.image}
          style={[styles.sticker, !item.artworkReady && styles.stickerMuted]}
          resizeMode="contain"
        />
        </View>
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
      <View style={[styles.ctaWrap, { borderColor: item.accent }]}>
        <Text style={[styles.cta, { color: item.accent }]}>{item.cta}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E6ED',
    backgroundColor: '#FFFFFF',
    padding: 10,
    shadowColor: '#121316',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  scene: {
    width: '100%',
    aspectRatio: 1.80,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8EAF0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
    overflow: 'hidden',
  },
  artworkPlate: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F7F9FC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sticker: {
    width: '96%',
    height: '96%',
  },
  stickerMuted: {
    opacity: 0.85,
  },
  title: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
    color: '#121316',
    marginBottom: 3,
    minHeight: 34,
  },
  description: {
    fontSize: 11,
    lineHeight: 15,
    color: '#5E6470',
    minHeight: 30,
  },
  ctaWrap: {
    marginTop: 6,
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: '#FFFCF4',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  cta: {
    fontSize: 10,
    fontWeight: '700',
  },
});
