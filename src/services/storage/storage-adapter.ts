import { IStorageAdapter } from '@/types/offline';
import { safeLogger } from '@/lib/logger';

function getAsyncStorage() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-async-storage/async-storage').default;
  } catch {
    return {
      getItem: async () => null,
      setItem: async () => {},
      removeItem: async () => {},
      clear: async () => {},
      getAllKeys: async () => [],
    };
  }
}

/**
 * Storage adapter backed by @react-native-async-storage/async-storage.
 */
export class AsyncStorageAdapter implements IStorageAdapter {
  async getItem(key: string): Promise<string | null> {
    try {
      const storage = getAsyncStorage();
      return await storage.getItem(key);
    } catch (err) {
      safeLogger.error('AsyncStorageAdapter getItem error:', key, err);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      const storage = getAsyncStorage();
      await storage.setItem(key, value);
    } catch (err) {
      safeLogger.error('AsyncStorageAdapter setItem error:', key, err);
      throw err;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      const storage = getAsyncStorage();
      await storage.removeItem(key);
    } catch (err) {
      safeLogger.error('AsyncStorageAdapter removeItem error:', key, err);
    }
  }

  async clear(): Promise<void> {
    try {
      const storage = getAsyncStorage();
      await storage.clear();
    } catch (err) {
      safeLogger.error('AsyncStorageAdapter clear error:', err);
    }
  }

  async getAllKeys(): Promise<readonly string[]> {
    try {
      const storage = getAsyncStorage();
      return await storage.getAllKeys();
    } catch (err) {
      safeLogger.error('AsyncStorageAdapter getAllKeys error:', err);
      return [];
    }
  }
}

/**
 * In-memory storage adapter for unit testing without native AsyncStorage bindings.
 */
export class MemoryStorageAdapter implements IStorageAdapter {
  private store: Map<string, string> = new Map();

  async getItem(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  async getAllKeys(): Promise<readonly string[]> {
    return Array.from(this.store.keys());
  }
}

// Default export uses AsyncStorage for React Native application runtime
export const defaultStorageAdapter: IStorageAdapter = new AsyncStorageAdapter();
