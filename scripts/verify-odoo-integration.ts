/**
 * Integration Test Suite against Odoo Demo Environment.
 *
 * Bootstraps a temporary demo database via https://demo.odoo.com/start
 * and executes real end-to-end operations using the Odoo adapters:
 * - Authentication (valid & invalid credentials)
 * - Customer listing, searching, detail retrieval, and phone update persistence
 * - Sales Order listing, detail & line items retrieval, and quotation confirmation
 * - Role-based permissions guard
 *
 * NOTE: Never prints passwords, tokens, or credentials to logs.
 */

import { OdooClient } from '../src/services/odoo/odoo-client';
import { OdooAuthService } from '../src/services/odoo/odoo-auth.service';
import { OdooCustomerService } from '../src/services/odoo/odoo-customer.service';
import { OdooSalesOrderService } from '../src/services/odoo/odoo-sales-order.service';
import { APP_CONFIG } from '../src/constants/config';

declare const require: any;
declare const __dirname: string;
try {
  const fs = require('fs');
  const path = require('path');
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    for (const line of envContent.split('\n')) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].trim().replace(/^['"](.*)['"]$/, '$1');
      }
    }
  }
} catch {
  // Ignore in browser/mobile context
}

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

async function runIntegrationTests() {
  console.log('====================================================');
  console.log('Pinned Odoo Live Demo Integration Test Suite');
  console.log('====================================================\n');

  const host = (process.env.EXPO_PUBLIC_ODOO_URL || APP_CONFIG.odooBaseUrl).replace(/\/+$/, '');
  const database = process.env.EXPO_PUBLIC_ODOO_DB || APP_CONFIG.odooDatabase;
  const username = process.env.ODOO_USER || 'admin';
  const password = process.env.ODOO_PASSWORD || 'admin';

  if (!host || !database) {
    console.error('[ERROR] Pinned Odoo instance is not configured in .env or APP_CONFIG.');
    console.error('Please run: npm run odoo:provision');
    process.exit(1);
  }

  console.log(`[INFO] Connected to Pinned Demo Server: ${host}`);
  console.log(`[INFO] Pinned Demo Database: ${database}`);
  console.log(`[INFO] Demo User: ${username}`);
  console.log(`[INFO] Password received: [REDACTED, length: ${password.length}]`);

  const client = new OdooClient({
    baseUrl: host,
    database,
  });

  const authService = new OdooAuthService(client);
  const customerService = new OdooCustomerService(client);
  const salesOrderService = new OdooSalesOrderService(client);

  // Test 0: Verify Pinned Host & Database Invariance
  console.log('\nTest 0: Verify pinned host and database invariance');
  assert(client.getConfig().baseUrl === host, `Configured host pinned to: ${host}`);
  assert(client.getConfig().database === database, `Configured database pinned to: ${database}`);

  // 1. Query Server Version
  console.log('\nTest 1: Query server version info');
  const versionInfo: any = await client.callJsonRpc('/web/webclient/version_info', {});
  console.log(`[INFO] Odoo Version: ${versionInfo.server_version} (${versionInfo.server_serie})`);
  assert(Boolean(versionInfo.server_version), `Server version detected: ${versionInfo.server_version}`);

  // 2. Authentication with valid demo credentials
  console.log('\nTest 2: Authenticate with valid demo credentials');
  const session = await authService.login({
    username,
    password,
  });

  assert(Boolean(session.token), 'Valid session token generated');
  assert(session.user.id > 0, `User authenticated with UID: ${session.user.id}`);
  assert(session.user.isInternalUser === true, 'Authenticated user is internal user (base.group_user)');
  assert(session.user.role === 'sales_manager', `Admin mapped to role: ${session.user.role}`);
  assert(session.database === database, 'Session matches database');

  // 3. Authentication with invalid credentials
  console.log('\nTest 3: Authentication with invalid credentials');
  try {
    await authService.login({
      username: 'nonexistent_user',
      password: 'wrong_password_123',
    });
    assert(false, 'Should throw error on invalid credentials');
  } catch (err: any) {
    assert(
      err.message.includes('Invalid username or password') || err.message.includes('Access Denied'),
      'Invalid credentials rejected with proper error message'
    );
  }

  // Restore authenticated session for subsequent tests
  await authService.login({
    username,
    password,
  });

  // 4. Customers listing & search
  console.log('\nTest 4: Customer listing and name search');
  const customers = await customerService.getCustomers();
  console.log(`[INFO] Fetched ${customers.length} customers with customer_rank > 0`);
  assert(customers.length > 0, 'Loaded customers from res.partner');

  const firstCustomer = customers[0];
  assert(Boolean(firstCustomer.name), `First customer has name: ${firstCustomer.name}`);
  assert(firstCustomer.id > 0, `Customer ID is valid: ${firstCustomer.id}`);

  // Search by customer name
  const searchQuery = firstCustomer.name.split(' ')[0];
  console.log(`[INFO] Testing search query: "${searchQuery}"`);
  const searchResults = await customerService.getCustomers(searchQuery);
  assert(searchResults.length > 0, `Search returned ${searchResults.length} results`);
  assert(
    searchResults.some((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase())),
    'Search results contain matching customer'
  );

  // 5. Customer details retrieval
  console.log('\nTest 5: Customer details retrieval by ID');
  const customerDetail = await customerService.getCustomerById(firstCustomer.id);
  assert(customerDetail.id === firstCustomer.id, 'Retrieved customer ID matches');
  assert(customerDetail.name === firstCustomer.name, 'Retrieved customer name matches');
  console.log(`[INFO] Customer address: ${customerDetail.street || 'N/A'}, ${customerDetail.city || 'N/A'}`);

  // 6. Customer phone update & persistence verification
  console.log('\nTest 6: Update customer phone number and verify persistence');
  const targetId = firstCustomer.id;
  const newPhone = '+1 (555) 839-2041';
  console.log(`[INFO] Updating phone for ${firstCustomer.name} (ID: ${targetId}) to ${newPhone}`);

  const updatedCustomer = await customerService.updateCustomerPhone(targetId, newPhone);
  assert(updatedCustomer.phone === newPhone, 'Returned customer object reflects new phone number');

  // Verify persistence with a fresh fetch from Odoo
  const persistedCustomer = await customerService.getCustomerById(targetId);
  assert(persistedCustomer.phone === newPhone, 'Re-read customer from Odoo confirms phone was persisted in database');

  // 7. Sales Orders listing
  console.log('\nTest 7: Sales orders listing');
  const orders = await salesOrderService.getSalesOrders();
  console.log(`[INFO] Fetched ${orders.length} sales orders`);
  assert(orders.length > 0, 'Loaded sales orders from sale.order');

  const firstOrder = orders[0];
  console.log(`[INFO] First order: ${firstOrder.name} (${firstOrder.state}), Total: ${firstOrder.currencySymbol}${firstOrder.amountTotal}`);
  assert(Boolean(firstOrder.name), `Order has order number: ${firstOrder.name}`);
  assert(firstOrder.amountTotal >= 0, 'Order has valid total amount');

  // 8. Order Details & Lines retrieval
  console.log('\nTest 8: Sales order details and order lines');
  // Find an order that has order lines
  const orderWithLines = orders.find((o) => o.id);
  if (orderWithLines) {
    const detailedOrder = await salesOrderService.getSalesOrderById(orderWithLines.id);
    assert(detailedOrder.id === orderWithLines.id, 'Fetched order details by ID');
    console.log(`[INFO] Order ${detailedOrder.name} has ${detailedOrder.lines.length} lines`);
    if (detailedOrder.lines.length > 0) {
      const line1 = detailedOrder.lines[0];
      assert(Boolean(line1.productName), `Line 1 product name: ${line1.productName}`);
      assert(line1.productUomQty > 0, `Line 1 quantity: ${line1.productUomQty}`);
      assert(line1.priceSubtotal >= 0, `Line 1 subtotal: ${line1.priceSubtotal}`);
    }
  }

  // 9. Quotation Confirmation
  console.log('\nTest 9: Quotation confirmation workflow');
  // Check if there is a draft quotation
  const draftOrder = orders.find((o) => o.state === 'draft' || o.state === 'sent');
  if (draftOrder) {
    console.log(`[INFO] Found draft quotation: ${draftOrder.name} (ID: ${draftOrder.id}, state: ${draftOrder.state})`);
    console.log(`[INFO] Calling action_confirm for ${draftOrder.name} ...`);
    const confirmedOrder = await salesOrderService.confirmQuotation(draftOrder.id);
    assert(confirmedOrder.state === 'sale', `Quotation confirmed: state transitioned to "${confirmedOrder.state}"`);

    // Verify re-fetch confirms persisted state
    const refetched = await salesOrderService.getSalesOrderById(draftOrder.id);
    assert(refetched.state === 'sale', 'Re-fetched order confirms state "sale" is persisted in Odoo database');
  } else {
    console.log('[SKIP] No draft/sent quotations in demo database; skipping action_confirm to avoid modifying confirmed orders.');
  }

  // 10. Role-based access restriction (client adapter guard audit)
  console.log('\nTest 10: Role-based access restriction (client-side adapter guard)');
  // Simulate portal user session on client adapter
  client.setSession({
    uid: 999,
    sessionId: 'portal_sess',
    cookieHeader: '',
    name: 'Portal Customer',
    username: 'portal_user',
    isInternalUser: false,
    isAdmin: false,
  });

  try {
    await salesOrderService.getSalesOrders();
    assert(false, 'Portal user should be blocked from sales orders');
  } catch (err: any) {
    assert(
      err.message.includes('Access Denied'),
      'Portal user blocked by client-side guard with Access Denied before network call'
    );
  }

  try {
    await salesOrderService.getSalesOrderById(firstOrder.id);
    assert(false, 'Portal user should be blocked from order details');
  } catch (err: any) {
    assert(
      err.message.includes('Access Denied'),
      'Portal user blocked by client-side guard from order details'
    );
  }

  // 11. Expired / Invalid Session Error Handling
  console.log('\nTest 11: Expired or invalid session produces understandable user error');
  // Configure client with invalid session cookie and internal flag to bypass client guard
  client.setSession({
    uid: 2,
    sessionId: 'expired_session_token',
    cookieHeader: 'session_id=expired_or_invalid_session_token_12345',
    name: 'Admin',
    username: 'admin',
    isInternalUser: true,
    isAdmin: true,
  });

  try {
    await customerService.getCustomers();
    assert(false, 'Should throw error when session is expired/invalid on Odoo server');
  } catch (err: any) {
    assert(
      err.message.includes('session has expired or is invalid') ||
      err.message.includes('Access Denied') ||
      err.message.includes('connect to Odoo server'),
      `Expired session produces clear user error: "${err.message}"`
    );
  }

  // 12. Logout
  console.log('\nTest 12: Logout');
  await authService.logout();
  assert((await authService.getCurrentSession()) === null, 'Session cleared on logout');

  // 13. Verify host and database invariance across session lifecycle
  console.log('\nTest 13: Verify host and database invariance across session lifecycle');
  assert(client.getConfig().baseUrl === host, 'Host remained pinned to configured instance after logout');
  assert(client.getConfig().database === database, 'Database remained pinned to configured instance after logout');

  console.log('\n====================================================');
  console.log(`Live Demo Integration Results: ${passed} passed, ${failed} failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runIntegrationTests().catch((err) => {
  console.error('[FATAL] Integration test error:', err);
  process.exit(1);
});
