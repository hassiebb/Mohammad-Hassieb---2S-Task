import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  ViewStyle,
} from 'react-native';
import { Palette, ThemeColors } from '@/constants/colors';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  leftIcon,
  rightIcon,
  accessibilityLabel,
  accessibilityHint,
}: ButtonProps) {
  const isInteractive = !loading && !disabled;

  return (
    <Pressable
      onPress={isInteractive ? onPress : undefined}
      disabled={!isInteractive}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !isInteractive, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        pressed && isInteractive && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? Palette.primary : '#FFFFFF'}
        />
      ) : (
        <>
          {leftIcon && <>{leftIcon}</>}
          <Text
            style={[
              styles.textBase,
              styles[`text_${variant}`],
              styles[`textSize_${size}`],
              disabled && styles.textDisabled,
              textStyle,
            ]}>
            {title}
          </Text>
          {rightIcon && <>{rightIcon}</>}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    gap: 8,
  },
  primary: {
    backgroundColor: Palette.primary,
  },
  secondary: {
    backgroundColor: Palette.secondary,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Palette.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: ThemeColors.light.danger,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    backgroundColor: '#E2E8F0',
    borderColor: '#CBD5E1',
    opacity: 0.7,
  },
  size_sm: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  size_md: {
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  size_lg: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  textBase: {
    fontWeight: '600',
    textAlign: 'center',
  },
  text_primary: {
    color: '#FFFFFF',
  },
  text_secondary: {
    color: '#FFFFFF',
  },
  text_outline: {
    color: Palette.primary,
  },
  text_ghost: {
    color: Palette.primary,
  },
  text_danger: {
    color: '#FFFFFF',
  },
  textDisabled: {
    color: '#94A3B8',
  },
  textSize_sm: {
    fontSize: 13,
  },
  textSize_md: {
    fontSize: 15,
  },
  textSize_lg: {
    fontSize: 17,
  },
});
