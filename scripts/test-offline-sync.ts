/**
 * Task 4 Test Suite: Offline Customer Cache and Phone Update Synchronization
 *
 * Verifies:
 * 1. Online customer fetch populates local cache.
 * 2. Offline customer list and search use cached data.
 * 3. First launch with no internet and no cache produces friendly error.
 * 4. Offline phone edits survive app/service restarts.
 * 5. Queued edits sync successfully when authenticated connectivity returns.
 * 6. Read-back verification marks edit as synced only after remote confirmation.
 * 7. Failed sync preserves pending edits with error explanations.
 * 8. Expired session halts sync and preserves pending edits.
 * 9. Conflict detection prevents silently overwriting newer remote data.
 * 10. Per-user cache isolation prevents data leakage across sessions.
 */

import { Customer, ICustomerService } from '../src/types/customer';
import { CustomerCacheRepository } from '../src/services/offline/customer-cache';
import { OfflineCustomerService } from '../src/services/offline/offline-customer.service';
import { SyncService } from '../src/services/offline/sync-service';
import { MemoryStorageAdapter } from '../src/services/storage/storage-adapter';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

// Sample mock customers for testing
const SAMPLE_CUSTOMERS: Customer[] = [
  {
    id: 101,
    name: 'Azure Interior',
    displayName: 'Azure Interior',
    email: 'azure@example.com',
    phone: '+1 (555) 123-4567',
    city: 'San Francisco',
    isCompany: true,
  },
  {
    id: 102,
    name: 'Deco Addict',
    displayName: 'Deco Addict',
    email: 'deco@example.com',
    phone: '+1 (555) 987-6543',
    city: 'Austin',
    isCompany: false,
  },
];

async function runOfflineSyncTests() {
  console.log('====================================================');
  console.log('Task 4: Offline Customer Cache & Synchronization Test Suite');
  console.log('====================================================\n');

  const sharedStorage = new MemoryStorageAdapter();
  const cache = new CustomerCacheRepository(sharedStorage);

  // Mock online delegate service
  let isOnline = true;
  let remoteStore: Customer[] = JSON.parse(JSON.stringify(SAMPLE_CUSTOMERS));

  const mockDelegate: ICustomerService = {
    async getCustomers(query?: string): Promise<Customer[]> {
      if (!isOnline) {
        throw new Error('Network error: Unable to connect to Odoo server');
      }
      if (!query) return remoteStore;
      return remoteStore.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));
    },
    async getCustomerById(id: number | string): Promise<Customer> {
      if (!isOnline) {
        throw new Error('Network error: Unable to connect to Odoo server');
      }
      const match = remoteStore.find((c) => c.id === Number(id));
      if (!match) throw new Error(`Customer #${id} not found`);
      return JSON.parse(JSON.stringify(match));
    },
    async updateCustomerPhone(id: number | string, phone: string): Promise<Customer> {
      if (!isOnline) {
        throw new Error('Network error: Unable to connect to Odoo server');
      }
      const match = remoteStore.find((c) => c.id === Number(id));
      if (!match) throw new Error(`Customer #${id} not found`);
      match.phone = phone;
      return JSON.parse(JSON.stringify(match));
    },
  };

  const mockSession = {
    token: 'test_token',
    user: {
      id: 1,
      name: 'Test Sales Rep',
      username: 'test_user',
      email: 'test@example.com',
      role: 'sales_user' as const,
      isInternalUser: true,
    },
    serverUrl: 'https://test.odoo.internal',
    database: 'demo_db',
    createdAt: new Date().toISOString(),
    expiresAt: new Date().toISOString(),
  };

  const offlineService = new OfflineCustomerService(
    cache,
    () => mockDelegate,
    async () => mockSession
  );
  const userKey = await offlineService.getUserContextKey();
  const syncService = new SyncService(cache);

  // ----------------------------------------------------
  // Test 1: Online fetch populates cache
  // ----------------------------------------------------
  console.log('Test 1: Online customer fetch populates local cache');
  isOnline = true;
  const initialCustomers = await offlineService.getCustomers();
  assert(initialCustomers.length === 2, 'Fetched 2 customers online');

  const cachedList = await cache.getCachedCustomers(userKey);
  assert(cachedList !== null && cachedList.length === 2, 'Cached list populated in local storage');
  assert(cachedList![0].name === 'Azure Interior', 'Cached first customer name matches');
  assert(Boolean(cachedList![0].cachedAt), 'Cached record has cachedAt timestamp');

  // ----------------------------------------------------
  // Test 2: Offline customer list and search use cached data
  // ----------------------------------------------------
  console.log('\nTest 2: Offline customer list and search use cached data');
  isOnline = false; // Go offline

  const offlineList = await offlineService.getCustomers();
  assert(offlineList.length === 2, 'Successfully loaded customer list while offline');
  assert(offlineList[0].isCached === true, 'Customers flagged with isCached: true');

  // Search cached data offline
  const searchResults = await offlineService.getCustomers('Deco');
  assert(searchResults.length === 1, 'Search query offline returned 1 result');
  assert(searchResults[0].name === 'Deco Addict', 'Offline search correctly matched "Deco Addict"');

  // Fetch detail offline
  const offlineDetail = await offlineService.getCustomerById(101);
  assert(offlineDetail.id === 101, 'Customer detail loaded from cache while offline');
  assert(offlineDetail.isCached === true, 'Customer detail flagged with isCached: true');

  // ----------------------------------------------------
  // Test 3: First launch with no internet and no cache
  // ----------------------------------------------------
  console.log('\nTest 3: First launch with no internet and no cache produces friendly error');
  const emptyUserKey = 'fresh_user_never_cached';
  const emptyCache = new CustomerCacheRepository(new MemoryStorageAdapter());
  const freshOfflineService = new OfflineCustomerService(
    emptyCache,
    () => mockDelegate,
    async () => ({
      token: 't',
      user: {
        id: 999,
        name: emptyUserKey,
        username: emptyUserKey,
        email: '',
        role: 'sales_user' as const,
        isInternalUser: true,
      },
      serverUrl: '',
      database: '',
      createdAt: '',
      expiresAt: '',
    })
  );

  try {
    await freshOfflineService.getCustomers();
    assert(false, 'Should throw error when offline with empty cache');
  } catch (err: any) {
    assert(
      err.message.includes('No cached customer directory available'),
      `Throws friendly message: "${err.message}"`
    );
  }

  // ----------------------------------------------------
  // Test 4: Offline phone edits survive app/service restarts
  // ----------------------------------------------------
  console.log('\nTest 4: Offline phone edits survive app/service restarts');
  isOnline = false;

  const newOfflinePhone = '+1 (555) 777-9999';
  const updatedCustomerOffline = await offlineService.updateCustomerPhone(101, newOfflinePhone);
  assert(updatedCustomerOffline.phone === newOfflinePhone, 'Returned customer reflects edited phone');
  assert(updatedCustomerOffline.hasPendingUpdate === true, 'Customer flagged with hasPendingUpdate: true');
  assert(updatedCustomerOffline.pendingPhone === newOfflinePhone, 'pendingPhone matches edited value');

  // Simulate app kill & restart: Instantiate fresh cache and service with same underlying storage
  const restartedCache = new CustomerCacheRepository(sharedStorage);
  const restartedOfflineService = new OfflineCustomerService(
    restartedCache,
    () => mockDelegate,
    async () => mockSession
  );

  const pendingAfterRestart = await restartedCache.getPendingUpdates(userKey);
  assert(pendingAfterRestart.length === 1, 'Pending phone edit survived service restart');
  assert(pendingAfterRestart[0].customerId === 101, 'Pending update target customer ID is 101');
  assert(pendingAfterRestart[0].newPhone === newOfflinePhone, 'Pending update newPhone matches');
  assert(pendingAfterRestart[0].status === 'pending', 'Pending update status is "pending"');

  const detailAfterRestart = await restartedOfflineService.getCustomerById(101);
  assert(detailAfterRestart.phone === newOfflinePhone, 'Customer detail retains optimistic phone');
  assert(detailAfterRestart.hasPendingUpdate === true, 'Customer detail retains hasPendingUpdate: true');

  // ----------------------------------------------------
  // Test 5: Failed sync preserves pending edits with error
  // ----------------------------------------------------
  console.log('\nTest 5: Failed sync preserves pending edits with error explanations');
  isOnline = false; // Still offline
  const failedSyncResult = await syncService.syncPendingUpdates(userKey, mockDelegate);
  assert(failedSyncResult.failedCount === 1, 'Sync attempt failed as expected');
  assert(failedSyncResult.syncedCount === 0, 'No items marked as synced');

  const pendingAfterFailedSync = await restartedCache.getPendingUpdates(userKey);
  assert(pendingAfterFailedSync.length === 1, 'Pending edit preserved in queue after failed sync');
  assert(pendingAfterFailedSync[0].status === 'failed', 'Status updated to "failed"');
  assert(Boolean(pendingAfterFailedSync[0].lastAttemptError), 'Error reason recorded on pending item');
  assert(pendingAfterFailedSync[0].attempts === 1, 'Attempt counter incremented to 1');

  // ----------------------------------------------------
  // Test 6: Queued edits sync successfully when connectivity returns
  // ----------------------------------------------------
  console.log('\nTest 6: Queued edits sync successfully when connectivity returns');
  isOnline = true; // Connection restored!

  const successfulSyncResult = await syncService.syncPendingUpdates(userKey, mockDelegate);
  assert(successfulSyncResult.syncedCount === 1, 'Sync processed and confirmed 1 edit');
  assert(successfulSyncResult.failedCount === 0, 'Zero failed items');

  const pendingAfterSync = await restartedCache.getPendingUpdates(userKey);
  assert(pendingAfterSync.length === 0, 'Pending queue is empty after successful sync');

  const confirmedRemoteCustomer = await mockDelegate.getCustomerById(101);
  assert(confirmedRemoteCustomer.phone === newOfflinePhone, 'Remote server persisted new phone number');

  const refreshedDetail = await offlineService.getCustomerById(101);
  assert(refreshedDetail.hasPendingUpdate === false, 'Customer hasPendingUpdate is now false');
  assert(refreshedDetail.phone === newOfflinePhone, 'Customer reflects verified phone number');

  // ----------------------------------------------------
  // Test 7: Expired session halts sync and preserves pending edits
  // ----------------------------------------------------
  console.log('\nTest 7: Expired session halts sync and preserves pending edits');
  // Queue another offline edit
  isOnline = false;
  await offlineService.updateCustomerPhone(102, '+1 (555) 333-4444');

  // Delegate throws SessionExpired error
  const expiredDelegate: ICustomerService = {
    async getCustomers() { throw new Error('Your Odoo session has expired or is invalid. Please sign in again.'); },
    async getCustomerById() { throw new Error('Your Odoo session has expired or is invalid. Please sign in again.'); },
    async updateCustomerPhone() { throw new Error('Your Odoo session has expired or is invalid. Please sign in again.'); },
  };

  const expiredSyncResult = await syncService.syncPendingUpdates(userKey, expiredDelegate);
  assert(expiredSyncResult.failedCount === 1, 'Sync failed due to expired session');

  const pendingAfterExpired = await restartedCache.getPendingUpdates(userKey);
  assert(pendingAfterExpired.length === 1, 'Pending edit safely retained when session expired');
  assert(
    pendingAfterExpired[0].lastAttemptError?.includes('session has expired') === true,
    'Recorded that session expired before syncing'
  );

  // Clear queue item for next test
  await restartedCache.removePendingUpdate(userKey, pendingAfterExpired[0].id);

  // ----------------------------------------------------
  // Test 8: Conflict handling (remote changed while offline)
  // ----------------------------------------------------
  console.log('\nTest 8: Conflict detection prevents silently overwriting newer remote data');
  // Customer 101 original phone is now '+1 (555) 777-9999'
  // Offline user changes it to '+1 (555) 888-8888'
  isOnline = false;
  await offlineService.updateCustomerPhone(101, '+1 (555) 888-8888');

  // Meanwhile on server, someone else updated customer 101 to '+1 (555) 999-0000'
  remoteStore[0].phone = '+1 (555) 999-0000';
  isOnline = true;

  const conflictSyncResult = await syncService.syncPendingUpdates(userKey, mockDelegate);
  assert(conflictSyncResult.conflictCount === 1, 'Sync detected remote conflict');
  assert(conflictSyncResult.syncedCount === 0, 'Did not overwrite remote record');

  // Verify server was NOT overwritten
  const serverCustomerAfterConflict = await mockDelegate.getCustomerById(101);
  assert(
    serverCustomerAfterConflict.phone === '+1 (555) 999-0000',
    'Remote phone number preserved without silent overwrite'
  );

  const pendingConflict = await restartedCache.getPendingUpdates(userKey);
  assert(pendingConflict[0].status === 'conflict', 'Item marked with status: "conflict"');
  assert(
    pendingConflict[0].lastAttemptError?.includes('Conflict') === true,
    'Clear conflict explanation provided on item'
  );

  // ----------------------------------------------------
  // Test 9: Per-user cache isolation
  // ----------------------------------------------------
  console.log('\nTest 9: Per-user cache isolation prevents data leakage across sessions');
  const userAKey = 'user_alpha_db1';
  const userBKey = 'user_beta_db2';

  await cache.saveCustomers(userAKey, [SAMPLE_CUSTOMERS[0]]);
  await cache.saveCustomers(userBKey, [SAMPLE_CUSTOMERS[1]]);

  const userACached = await cache.getCachedCustomers(userAKey);
  const userBCached = await cache.getCachedCustomers(userBKey);

  assert(userACached?.length === 1 && userACached[0].id === 101, 'User A sees only User A customers');
  assert(userBCached?.length === 1 && userBCached[0].id === 102, 'User B sees only User B customers');

  // Clear User A cache on logout
  await cache.clearUserCache(userAKey);
  const userAAfterLogout = await cache.getCachedCustomers(userAKey);
  const userBAfterLogout = await cache.getCachedCustomers(userBKey);

  assert(userAAfterLogout === null, 'User A cache wiped on logout');
  assert(userBAfterLogout?.length === 1, 'User B cache remains intact');

  console.log('\n====================================================');
  console.log(`Offline Sync Test Results: ${passed} passed, ${failed} failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runOfflineSyncTests().catch((err) => {
  console.error('[FATAL] Offline sync test failed:', err);
  process.exit(1);
});
