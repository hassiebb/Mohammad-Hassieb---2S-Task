import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search by name, phone, city...',
  onClear,
  style,
}: SearchBarProps) {
  const handleClear = () => {
    onChangeText('');
    onClear?.();
  };

  return (
    <View style={[styles.container, style]}>
      <Ionicons name="search-outline" size={18} color="#64748B" style={styles.icon} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        style={styles.input}
        autoCorrect={false}
        autoCapitalize="none"
        accessibilityRole="search"
        accessibilityLabel="Search input"
      />
      {Boolean(value) && (
        <Pressable
          onPress={handleClear}
          hitSlop={8}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Clear search text"
          style={styles.clearButton}>
          <Ionicons name="close-circle" size={18} color="#94A3B8" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 8,
  },
  clearButton: {
    padding: 2,
    marginLeft: 6,
  },
});
