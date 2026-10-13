import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '@/features/auth/use-auth';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Ionicons } from '@expo/vector-icons';
import { defaultCustomerCache, offlineCustomerService } from '@/services';

export default function ProfileTab() {
  const { user, logout } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    async function loadPending() {
      try {
        const userKey = await offlineCustomerService.getUserContextKey();
        const pending = await defaultCustomerCache.getPendingUpdates(userKey);
        setPendingCount(pending.length);
      } catch {
        // Ignore fetch error
      }
    }
    loadPending();
  }, []);

  const handleLogout = () => {
    if (pendingCount > 0) {
      Alert.alert(
        'Pending Offline Updates',
        `You have ${pendingCount} offline update${pendingCount === 1 ? '' : 's'} queued locally. Signing out will retain these changes in your local queue until you sign back in. Continue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Keep & Sign Out', style: 'destructive', onPress: logout },
        ]
      );
      return;
    }

    Alert.alert('Sign Out', 'Are you sure you want to sign out of 2S Egypt Sales?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'sales_manager':
        return 'Sales Manager';
      case 'sales_user':
        return 'Sales Representative';
      case 'portal_user':
        return 'Portal Client';
      default:
        return role || 'Sales Representative';
    }
  };

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '2S';

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* 2S Egypt User Identity Card */}
      <Card elevated style={styles.userCard}>
        <View style={styles.avatarRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>

          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name || 'Authorized User'}</Text>
            <Text style={styles.userEmail}>{user?.email || 'sales@2segypt.com'}</Text>
            <View style={styles.badgesRow}>
              <Badge
                label={getRoleLabel(user?.role)}
                backgroundColor="#F1F5F9"
                textColor="#0E1926"
                borderColor="#CBD5E1"
                size="sm"
              />
              <Badge
                label={user?.isInternalUser ? 'Internal Access' : 'Restricted Client'}
                backgroundColor={user?.isInternalUser ? '#ECFDF5' : '#FEF2F2'}
                textColor={user?.isInternalUser ? '#065F46' : '#991B1B'}
                borderColor={user?.isInternalUser ? '#A7F3D0' : '#FECACA'}
                size="sm"
              />
            </View>
          </View>
        </View>

        <View style={styles.companyRow}>
          <Ionicons name="business-outline" size={15} color="#475569" />
          <Text style={styles.companyText}>
            {user?.companyName || '2S Egypt'}
          </Text>
        </View>
      </Card>

      {/* Account Details Card */}
      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="person-outline" size={18} color="#0E1926" />
          <Text style={styles.sectionTitle}>Account Information</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Organization</Text>
          <Text style={styles.infoValue}>2S Egypt</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Username</Text>
          <Text style={styles.infoValue}>{user?.username || '—'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Role Permission</Text>
          <Text style={styles.infoValue}>{getRoleLabel(user?.role)}</Text>
        </View>

        <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.infoLabel}>Security Level</Text>
          <Text style={styles.infoValue}>
            {user?.isInternalUser ? 'Full Sales & Customer Access' : 'Client Restricted'}
          </Text>
        </View>
      </Card>

      {/* App Operations & Sync Status Card */}
      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="cloud-done-outline" size={18} color="#0E1926" />
          <Text style={styles.sectionTitle}>System & Synchronization</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Application</Text>
          <Text style={styles.infoValue}>2S Egypt Sales Management</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Offline Cache</Text>
          <Text style={styles.infoValue}>Active (Encrypted Local Storage)</Text>
        </View>

        <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.infoLabel}>Pending Edits</Text>
          <Text
            style={[
              styles.infoValue,
              pendingCount > 0 ? styles.pendingHighlight : styles.syncedHighlight,
            ]}>
            {pendingCount === 0
              ? 'All changes synchronized'
              : `${pendingCount} update${pendingCount === 1 ? '' : 's'} waiting to sync`}
          </Text>
        </View>
      </Card>

      {/* Sign Out Button */}
      <Button
        title="Sign Out"
        onPress={handleLogout}
        variant="outline"
        size="lg"
        leftIcon={<Ionicons name="log-out-outline" size={20} color="#0E1926" />}
        style={styles.logoutBtn}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
    backgroundColor: '#F8FAFC',
    gap: 14,
  },
  userCard: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: '#0E1926',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FF8622',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FF8622',
    letterSpacing: -0.5,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0E1926',
  },
  userEmail: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  companyText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
  },
  sectionCard: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0E1926',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0E1926',
  },
  pendingHighlight: {
    color: '#B45309',
    fontWeight: '700',
  },
  syncedHighlight: {
    color: '#008669',
    fontWeight: '600',
  },
  logoutBtn: {
    marginTop: 10,
    borderColor: '#CBD5E1',
  },
});
