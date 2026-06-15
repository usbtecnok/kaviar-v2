import React, { useState } from 'react';
import { Image, View, StyleSheet, ImageSourcePropType, ImageStyle, StyleProp } from 'react-native';
import { COLORS } from '../../config/colors';

interface Props {
  uri: string | null | undefined;
  fallback?: ImageSourcePropType;
  style?: StyleProp<ImageStyle>;
}

/** Imagem com fallback seguro para URI vazia ou erro de carregamento. */
export function ImageWithFallback({ uri, fallback, style }: Props) {
  const [error, setError] = useState(false);

  if (!uri || error) {
    if (fallback) {
      return <Image source={fallback} style={[styles.image, style]} />;
    }
    return <View style={[styles.image, styles.placeholder, style]} />;
  }

  return (
    <Image
      source={{ uri }}
      style={[styles.image, style]}
      onError={() => setError(true)}
    />
  );
}

const styles = StyleSheet.create({
  image: { width: 80, height: 80, borderRadius: 40 },
  placeholder: { backgroundColor: COLORS.surfaceLight },
});
