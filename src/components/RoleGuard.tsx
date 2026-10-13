import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/features/auth/use-auth';
import { Button } from './Button';
import { useRouter } from 'expo-router';

export interface RoleGuardProps {
  children: React.ReactNode;
}

export function RoleGuard({ children }: RoleGuardProps) {
  const { user } = useAuth();
  const router = useRouter();

  if (!user?.isInternalUser) {
    return (
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <Ionicons name="shield-outline" size={42} color="#DC2626" />
        </View>

        <Text style={styles.title}>Access Restricted</Text>
        <Text style={styles.subtitle}>Internal Sales Team Only</Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            Sales order quotations and confirmation are restricted to internal sales representatives and managers.
          </Text>
          <Text style={styles.roleText}>
            Current Role: <Text style={styles.roleValue}>{user?.role || 'Guest / Portal'}</Text>
          </Text>
          <Text style={styles.noticeText}>
            * Server-side authorization is mandatory for real Odoo integration. Application-level guards protect mobile workflows.
          </Text>
        </View>

        <Button
          title="Switch to Internal Account"
          onPress={() => router.push('/(app)/(tabs)/profile')}
          variant="outline"
          size="md"
          style={styles.switchBtn}
        />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#DC2626',
    marginBottom: 20,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    width: '100%',
    maxWidth: 400,
    gap: 12,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  roleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  roleValue: {
    color: '#DC2626',
    textTransform: 'uppercase',
  },
  noticeText: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
    lineHeight: 16,
  },
  switchBtn: {
    width: '100%',
    maxWidth: 320,
  },
});
