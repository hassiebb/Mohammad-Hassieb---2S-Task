import { useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { NetworkState } from '@/types/offline';
import { safeLogger } from '@/lib/logger';

export class NetworkService {
  /**
   * Quick non-blocking probe to verify if Odoo server is actually responding.
   */
  static async checkOdooReachable(baseUrl: string, timeoutMs = 3500): Promise<boolean> {
    if (!baseUrl) return false;
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/web/webclient/version_info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params: {}, id: 1 }),
        signal: controller.signal,
      });

      clearTimeout(id);
      return res.status === 200;
    } catch {
      return false;
    }
  }
}

/**
 * React Hook providing real-time network status, app state changes, and reachability.
 */
export function useNetworkStatus(onConnectivityRestored?: () => void) {
  const [networkState, setNetworkState] = useState<NetworkState>({
    isConnected: true,
    isInternetReachable: true,
    isOdooReachable: null,
  });

  useEffect(() => {
    let prevConnected = true;

    // 1. NetInfo subscription
    const unsubscribeNetInfo = NetInfo.addEventListener((state: NetInfoState) => {
      const isConnected = Boolean(state.isConnected);
      const isReachable = state.isInternetReachable ?? isConnected;

      setNetworkState((prev) => ({
        ...prev,
        isConnected,
        isInternetReachable: isReachable,
      }));

      // Trigger callback if we transitioned from offline to online
      if (!prevConnected && isConnected) {
        safeLogger.info('NetworkStatus: connection restored');
        onConnectivityRestored?.();
      }
      prevConnected = isConnected;
    });

    // 2. AppState subscription (sync when app returns to foreground)
    const subscriptionAppState = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState === 'active') {
          safeLogger.info('NetworkStatus: app returned to foreground');
          onConnectivityRestored?.();
        }
      }
    );

    return () => {
      unsubscribeNetInfo();
      subscriptionAppState.remove();
    };
  }, [onConnectivityRestored]);

  return networkState;
}
