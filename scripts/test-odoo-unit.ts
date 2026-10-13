/**
 * Unit test suite for Odoo Adapters & API mapping.
 * Validates error handling, model transformations, and security guards in isolation.
 */

import { OdooClient, OdooNotConfiguredError } from '../src/services/odoo/odoo-client';
import { OdooAuthService } from '../src/services/odoo/odoo-auth.service';
import { OdooCustomerService } from '../src/services/odoo/odoo-customer.service';
import { OdooSalesOrderService } from '../src/services/odoo/odoo-sales-order.service';

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

async function runUnitTests() {
  console.log('====================================================');
  console.log('Task 3: Odoo Adapter Unit Test Suite');
  console.log('====================================================\n');

  // 1. OdooClient configuration & error handling
  console.log('Test Suite 1: OdooClient boundary & error handling');
  const client = new OdooClient({ baseUrl: '', database: '' });
  assert(!client.isConfigured(), 'Empty baseUrl & database is not configured');

  try {
    client.ensureConfigured();
    assert(false, 'Should throw OdooNotConfiguredError');
  } catch (err) {
    assert(err instanceof OdooNotConfiguredError, 'ensureConfigured throws OdooNotConfiguredError');
  }

  client.setConfig({ baseUrl: 'https://demo.odoo.com', database: 'test_db' });
  assert(client.isConfigured(), 'Configured client returns isConfigured: true');
  assert(client.getConfig().baseUrl === 'https://demo.odoo.com', 'baseUrl trimmed and normalized');

  // 2. OdooAuthService validation & mapping
  console.log('\nTest Suite 2: OdooAuthService validation & role mapping');
  const authService = new OdooAuthService(client);

  // Validation
  try {
    await authService.login({ username: '', password: '123' });
    assert(false, 'Empty username should be rejected');
  } catch (err: any) {
    assert(err.message.includes('Username is required'), 'Validates username requirement');
  }

  try {
    await authService.login({ username: 'valid_user', password: '' });
    assert(false, 'Empty password should be rejected');
  } catch (err: any) {
    assert(err.message.includes('Password is required'), 'Validates password requirement');
  }

  // Mock callJsonRpc to test response mapping
  const mockClient = new OdooClient({ baseUrl: 'https://demo.odoo.com', database: 'mock_db' });

  // Test Internal Admin -> sales_manager
  mockClient.callJsonRpc = (async () => ({
    uid: 2,
    name: 'Admin User',
    username: 'admin',
    is_internal_user: true,
    is_system: true,
    is_admin: true,
  })) as any;

  const adminAuth = new OdooAuthService(mockClient);
  const adminSession = await adminAuth.login({ username: 'admin', password: 'password123' });
  assert(adminSession.user.id === 2, 'Maps user ID correctly');
  assert(adminSession.user.role === 'sales_manager', 'Internal system user mapped to sales_manager role');
  assert(adminSession.user.isInternalUser === true, 'Internal user flag is true');

  // Test Internal Non-Admin -> sales_user
  mockClient.callJsonRpc = (async () => ({
    uid: 5,
    name: 'Sales Rep',
    username: 'sales',
    is_internal_user: true,
    is_system: false,
    is_admin: false,
  })) as any;
  const salesSession = await adminAuth.login({ username: 'sales', password: 'password123' });
  assert(salesSession.user.role === 'sales_user', 'Standard internal user mapped to sales_user role');

  // Test Portal User -> portal_user
  mockClient.callJsonRpc = (async () => ({
    uid: 10,
    name: 'Customer Portal User',
    username: 'portal',
    is_internal_user: false,
    is_system: false,
    is_admin: false,
  })) as any;
  const portalSession = await adminAuth.login({ username: 'portal', password: 'password123' });
  assert(portalSession.user.role === 'portal_user', 'Non-internal user mapped to portal_user role');
  assert(portalSession.user.isInternalUser === false, 'Portal user isInternalUser is false');

  // 3. OdooCustomerService mapping & validation
  console.log('\nTest Suite 3: OdooCustomerService mapping & input validation');
  const custClient = new OdooClient({ baseUrl: 'https://demo.odoo.com', database: 'mock_db' });
  const custService = new OdooCustomerService(custClient);

  // Phone validation before RPC
  try {
    await custService.updateCustomerPhone(10, 'invalid');
    assert(false, 'Should reject invalid phone format');
  } catch (err: any) {
    assert(
      err.message.includes('at least 6 digits') || err.message.includes('valid phone'),
      'Client-side validation rejects invalid phone before API call'
    );
  }

  // Model mapping with false Odoo field values
  custClient.callKw = (async (_model: string, method: string) => {
    if (method === 'search_read') {
      return [
        {
          id: 101,
          name: 'Deco Addict',
          display_name: 'Deco Addict, CA',
          email: 'info@deco.example',
          phone: '(555) 019-2834',
          street: '123 Market St',
          city: 'San Francisco',
          state_id: [12, 'California'],
          zip: '94105',
          country_id: [1, 'United States'],
          is_company: true,
          sale_order_count: 5,
          total_invoiced: 12500.5,
        },
        {
          id: 102,
          name: 'Silent Partner',
          display_name: false,
          email: false,
          phone: false,
          street: false,
          city: false,
          state_id: false,
          zip: false,
          country_id: false,
          is_company: false,
        },
      ];
    }
    return [];
  }) as any;

  const customers = await custService.getCustomers();
  assert(customers.length === 2, 'Maps list of customers');
  assert(customers[0].name === 'Deco Addict', 'Maps customer name');
  assert(customers[0].displayName === 'Deco Addict, CA', 'Maps display name');
  assert(customers[0].phone === '(555) 019-2834', 'Maps phone number');
  assert(customers[0].state === 'California', 'Extracts state name from tuple');
  assert(customers[0].totalOrders === 5, 'Maps order count');

  // False field normalization
  assert(customers[1].displayName === 'Silent Partner', 'Falls back to name when displayName is false');
  assert(customers[1].email === '', 'Normalizes false email to empty string');
  assert(customers[1].phone === '', 'Normalizes false phone to empty string');
  assert(customers[1].city === '', 'Normalizes false city to empty string');
  assert(customers[1].state === undefined, 'Normalizes false state_id to undefined');

  // 4. OdooSalesOrderService mapping & role protection
  console.log('\nTest Suite 4: OdooSalesOrderService mapping & role protection');
  const orderClient = new OdooClient({ baseUrl: 'https://demo.odoo.com', database: 'mock_db' });
  const orderService = new OdooSalesOrderService(orderClient);

  // Portal user role restriction
  orderClient.setSession({
    uid: 10,
    sessionId: 'sess_10',
    cookieHeader: '',
    name: 'Portal User',
    username: 'portal',
    isInternalUser: false,
    isAdmin: false,
  });

  try {
    await orderService.getSalesOrders();
    assert(false, 'Portal user should be blocked from sales orders');
  } catch (err: any) {
    assert(err.message.includes('Access Denied'), 'Blocks portal user from getSalesOrders');
  }

  // Switch to internal user
  orderClient.setSession({
    uid: 2,
    sessionId: 'sess_2',
    cookieHeader: '',
    name: 'Sales Rep',
    username: 'sales',
    isInternalUser: true,
    isAdmin: false,
  });

  orderClient.callKw = (async (model: string, method: string) => {
    if (model === 'sale.order' && method === 'search_read') {
      return [
        {
          id: 501,
          name: 'SO001',
          partner_id: [101, 'Deco Addict'],
          date_order: '2026-10-10 12:00:00',
          state: 'draft',
          amount_untaxed: 1000,
          amount_tax: 150,
          amount_total: 1150,
          currency_id: [1, 'USD'],
          user_id: [2, 'Sales Rep'],
          order_line: [1, 2],
        },
      ];
    }
    if (model === 'sale.order' && method === 'read') {
      return [
        {
          id: 501,
          name: 'SO001',
          partner_id: [101, 'Deco Addict'],
          date_order: '2026-10-10 12:00:00',
          state: 'draft',
          amount_untaxed: 1000,
          amount_tax: 150,
          amount_total: 1150,
          currency_id: [1, 'USD'],
          user_id: [2, 'Sales Rep'],
          order_line: [1],
        },
      ];
    }
    if (model === 'sale.order.line' && method === 'read') {
      return [
        {
          id: 1,
          product_id: [42, 'Executive Chair'],
          name: 'Executive Ergonomic Chair',
          product_uom_qty: 2,
          price_unit: 500,
          price_subtotal: 1000,
          discount: 0,
        },
      ];
    }
    return [];
  }) as any;

  const orders = await orderService.getSalesOrders();
  assert(orders.length === 1, 'Internal user can fetch sales orders');
  assert(orders[0].name === 'SO001', 'Maps sales order name');
  assert(orders[0].customerName === 'Deco Addict', 'Extracts customer name from tuple');
  assert(orders[0].currencySymbol === '$', 'Maps USD currency code to $ symbol');

  const orderDetail = await orderService.getSalesOrderById(501);
  assert(orderDetail.lines.length === 1, 'Loads order lines');
  assert(orderDetail.lines[0].productId === 42, 'Maps line product ID');
  assert(orderDetail.lines[0].productName === 'Executive Chair', 'Maps line product name');
  assert(orderDetail.lines[0].priceSubtotal === 1000, 'Maps line subtotal');

  // Confirmation state validation
  const nonConfirmableClient = new OdooClient({ baseUrl: 'https://demo.odoo.com', database: 'mock_db' });
  nonConfirmableClient.setSession({
    uid: 2,
    sessionId: 'sess_2',
    cookieHeader: '',
    name: 'Sales Rep',
    username: 'sales',
    isInternalUser: true,
    isAdmin: false,
  });
  nonConfirmableClient.callKw = (async (_model: string, method: string) => {
    if (method === 'read') {
      return [{ id: 502, name: 'SO002', partner_id: [101, 'Deco'], state: 'cancel', order_line: [] }];
    }
    return [];
  }) as any;
  const nonConfirmableService = new OdooSalesOrderService(nonConfirmableClient);
  try {
    await nonConfirmableService.confirmQuotation(502);
    assert(false, 'Cancelled order cannot be confirmed');
  } catch (err: any) {
    assert(err.message.includes('cannot be confirmed'), 'Prevents confirming non-draft/sent quotation');
  }

  console.log('\n====================================================');
  console.log(`Unit Test Results: ${passed} passed, ${failed} failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runUnitTests().catch((err) => {
  console.error('Fatal unit test error:', err);
  process.exit(1);
});
