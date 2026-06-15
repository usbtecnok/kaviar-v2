import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { COLORS } from '../../config/colors';

interface Props {
  height?: number;
  width?: number | string;
}

/** Skeleton/loading seguro — ActivityIndicator sobre superfície escura. */
export function SkeletonLoader({ height = 60, width = '100%' }: Props) {
  return (
    <View style={[styles.container, { height, width: width as number }]}>
      <ActivityIndicator color={COLORS.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
