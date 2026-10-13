import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Palette } from '@/constants/colors';
import { validatePhoneNumber } from '@/lib/validation';

export interface CustomerPhoneModalProps {
  visible: boolean;
  currentPhone: string;
  customerName: string;
  isSaving: boolean;
  serverError?: string | null;
  onSave: (phone: string) => Promise<boolean>;
  onClose: () => void;
}

export function CustomerPhoneModal({
  visible,
  currentPhone,
  customerName,
  isSaving,
  serverError,
  onSave,
  onClose,
}: CustomerPhoneModalProps) {
  const [phone, setPhone] = useState(currentPhone);
  const [error, setError] = useState<string | undefined>();
  const [prevPhone, setPrevPhone] = useState(currentPhone);

  if (currentPhone !== prevPhone) {
    setPrevPhone(currentPhone);
    setPhone(currentPhone);
    setError(undefined);
  }

  const handleSave = async () => {
    const validation = validatePhoneNumber(phone);
    if (!validation.isValid) {
      setError(validation.error);
      return;
    }

    const success = await onSave(phone);
    if (success) {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.modalCard}>
          <View style={styles.headerRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="call-outline" size={20} color={Palette.primary} />
            </View>
            <View style={styles.headerTextCol}>
              <Text style={styles.modalTitle}>Update Phone Number</Text>
              <Text style={styles.modalSubtitle} numberOfLines={1}>
                {customerName}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Close dialog">
              <Ionicons name="close" size={22} color="#94A3B8" />
            </Pressable>
          </View>

          <View style={styles.body}>
            <Input
              label="Phone Number"
              placeholder="+1 (555) 000-0000"
              value={phone}
              onChangeText={(text) => {
                setPhone(text);
                if (error) setError(undefined);
              }}
              keyboardType="phone-pad"
              autoFocus
              error={error || serverError || undefined}
              helperText="Standard international format (+country code, digits)"
              leftIcon="call-outline"
              required
            />
          </View>

          <View style={styles.actionsRow}>
            <Button
              title="Cancel"
              onPress={onClose}
              variant="outline"
              size="md"
              style={styles.cancelBtn}
            />
            <Button
              title="Save Phone"
              onPress={handleSave}
              variant="primary"
              size="md"
              loading={isSaving}
              style={styles.saveBtn}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Palette.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextCol: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  body: {
    marginVertical: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  cancelBtn: {
    flex: 1,
  },
  saveBtn: {
    flex: 1,
  },
});
