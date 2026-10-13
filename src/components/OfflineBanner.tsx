import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface OfflineBannerProps {
  isOffline: boolean;
  isCached?: boolean;
  cachedAt?: string;
  pendingCount?: number;
  isSyncing?: boolean;
  onSyncPress?: () => void;
}

export function OfflineBanner({
  isOffline,
  isCached,
  cachedAt,
  pendingCount = 0,
  isSyncing = false,
  onSyncPress,
}: OfflineBannerProps) {
  if (!isOffline && !isCached && pendingCount === 0 && !isSyncing) {
    return null;
  }

  const formatCachedTime = (iso?: string) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return `(saved ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
    } catch {
      return '';
    }
  };

  return (
    <View style={[styles.container, isOffline ? styles.offlineBg : styles.syncBg]}>
      <View style={styles.contentLeft}>
        <Ionicons
          name={isOffline ? 'cloud-offline' : isSyncing ? 'sync' : 'cloud-upload'}
          size={16}
          color={isOffline ? '#92400E' : '#1E40AF'}
        />
        <Text style={[styles.message, isOffline ? styles.offlineText : styles.syncText]}>
          {isSyncing
            ? 'Syncing pending updates with Odoo...'
            : isOffline
            ? `Offline — Showing cached records ${formatCachedTime(cachedAt)}`
            : `${pendingCount} update${pendingCount === 1 ? '' : 's'} queued for sync`}
        </Text>
      </View>

      {pendingCount > 0 && !isSyncing && onSyncPress && !isOffline && (
        <Pressable onPress={onSyncPress} style={styles.syncBtn}>
          <Text style={styles.syncBtnText}>Sync Now</Text>
        </Pressable>
      )}

      {isSyncing && (
        <ActivityIndicator size="small" color="#1E40AF" style={styles.spinner} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  offlineBg: {
    backgroundColor: '#FEF3C7',
    borderBottomColor: '#FDE68A',
  },
  syncBg: {
    backgroundColor: '#EFF6FF',
    borderBottomColor: '#BFDBFE',
  },
  contentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  message: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  offlineText: {
    color: '#92400E',
  },
  syncText: {
    color: '#1E40AF',
  },
  syncBtn: {
    backgroundColor: '#1E40AF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  syncBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  spinner: {
    marginLeft: 8,
  },
});
