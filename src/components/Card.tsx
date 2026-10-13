import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

export interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  elevated?: boolean;
}

export function Card({ children, style, onPress, elevated = false }: CardProps) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          elevated && styles.elevated,
          pressed && styles.pressed,
          style,
        ]}>
        {children}
      </Pressable>
    );
  }

  return (
    <View style={[styles.card, elevated && styles.elevated, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 12,
  },
  elevated: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.995 }],
  },
});
