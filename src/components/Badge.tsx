import React from 'react';
import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { getStatusConfig } from '@/lib/formatters';
import { SalesOrderStatus } from '@/types/sales-order';

export interface BadgeProps {
  label: string;
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  status?: SalesOrderStatus;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function Badge({
  label,
  backgroundColor,
  textColor,
  borderColor,
  status,
  size = 'md',
  style,
  textStyle,
}: BadgeProps) {
  let bg = backgroundColor || '#F1F5F9';
  let color = textColor || '#475569';
  let border = borderColor || '#CBD5E1';
  let displayLabel = label;

  if (status) {
    const config = getStatusConfig(status);
    bg = config.bg;
    color = config.text;
    border = config.border;
    displayLabel = label || config.label;
  }

  return (
    <View
      style={[
        styles.badge,
        styles[`size_${size}`],
        { backgroundColor: bg, borderColor: border },
        style,
      ]}>
      <Text style={[styles.text, styles[`textSize_${size}`], { color }, textStyle]}>
        {displayLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  size_sm: {
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  size_md: {
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  text: {
    fontWeight: '600',
  },
  textSize_sm: {
    fontSize: 11,
  },
  textSize_md: {
    fontSize: 12,
  },
});
