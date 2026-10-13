import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Palette } from '@/constants/colors';

export interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'large';
}

export function LoadingSpinner({ message = 'Loading...', size = 'large' }: LoadingSpinnerProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={Palette.primary} />
      {Boolean(message) && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  message: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
});
