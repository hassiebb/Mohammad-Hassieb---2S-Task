import React, { useState } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { Palette, ThemeColors } from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  isPassword?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  required?: boolean;
}

export function Input({
  label,
  error,
  helperText,
  leftIcon,
  isPassword = false,
  containerStyle,
  inputStyle,
  required = false,
  ...textInputProps
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const secureTextEntry = isPassword && !isPasswordVisible;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          {required && <Text style={styles.requiredMark}>*</Text>}
        </View>
      )}

      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputFocused,
          Boolean(error) && styles.inputError,
          textInputProps.editable === false && styles.inputDisabled,
        ]}>
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={20}
            color={error ? ThemeColors.light.danger : isFocused ? Palette.primary : '#94A3B8'}
            style={styles.leftIcon}
          />
        )}

        <TextInput
          placeholderTextColor="#94A3B8"
          secureTextEntry={secureTextEntry}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          accessibilityLabel={label || textInputProps.placeholder}
          style={[styles.input, inputStyle]}
          {...textInputProps}
        />

        {isPassword && (
          <Pressable
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}
            style={styles.passwordToggle}
            hitSlop={8}>
            <Ionicons
              name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="#64748B"
            />
          </Pressable>
        )}
      </View>

      {Boolean(error) && (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle-outline" size={14} color={ThemeColors.light.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {!error && Boolean(helperText) && (
        <Text style={styles.helperText}>{helperText}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  requiredMark: {
    color: '#EF4444',
    marginLeft: 4,
    fontSize: 14,
    fontWeight: 'bold',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  inputFocused: {
    borderColor: Palette.primary,
    backgroundColor: '#FFFFFF',
  },
  inputError: {
    borderColor: ThemeColors.light.danger,
    backgroundColor: '#FFF8F8',
  },
  inputDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  leftIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    paddingVertical: 10,
  },
  passwordToggle: {
    padding: 4,
    marginLeft: 8,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    gap: 4,
  },
  errorText: {
    fontSize: 12,
    color: ThemeColors.light.danger,
    fontWeight: '500',
  },
  helperText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
});
