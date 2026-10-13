/**
 * Verification script for Task 2: Mock-Mode Workflow and Security Audit
 * Tests all 10 functional workflows against the service layer and domain models.
 */

import { MockAuthService } from './fixtures/mock/mock-auth.service';
import { MockCustomerService } from './fixtures/mock/mock-customer.service';
import { MockSalesOrderService } from './fixtures/mock/mock-sales-order.service';
import { OdooClient, OdooNotConfiguredError } from '../src/services/odoo/odoo-client';
import { OdooAuthService } from '../src/services/odoo/odoo-auth.service';
import { OdooCustomerService } from '../src/services/odoo/odoo-customer.service';
import { OdooSalesOrderService } from '../src/services/odoo/odoo-sales-order.service';
import { validatePhoneNumber, validateUsername, validatePassword } from '../src/lib/validation';

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

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

async function runAudit() {
  console.log('====================================================');
  console.log('Task 2: Functional & Security Audit Test Suite');
  console.log('====================================================\n');

  const authService = new MockAuthService();
  const customerService = new MockCustomerService();
  const salesOrderService = new MockSalesOrderService();

  // 1. Login succeeds with documented development test flow
  console.log('Test 1: Login succeeds with documented development test flow');
  try {
    const adminSession = await authService.login({ username: 'admin', password: 'password123' });
    assert(adminSession.user.username === 'admin', 'Admin user authenticated correctly');
    assert(adminSession.user.role === 'sales_manager', 'Admin role is sales_manager');
    assert(adminSession.user.isInternalUser === true, 'Admin is flagged as internal user');
    assert(Boolean(adminSession.token), 'Valid session token generated');

    const salesSession = await authService.login({ username: 'sales', password: 'password123' });
    assert(salesSession.user.role === 'sales_user', 'Sales rep user authenticated correctly');
    assert(salesSession.user.isInternalUser === true, 'Sales rep is internal user');
  } catch (err: unknown) {
    assert(false, `Login failed: ${getErrorMessage(err)}`);
  }

  // 2. Invalid credentials produce an appropriate error
  console.log('\nTest 2: Invalid credentials produce an appropriate error');
  try {
    await authService.login({ username: 'admin', password: 'wrongpassword' });
    assert(false, 'Should have thrown error on wrong password');
  } catch (err: unknown) {
    assert(getErrorMessage(err).includes('Invalid username or password'), 'Appropriate error thrown for wrong password');
  }

  try {
    await authService.login({ username: 'nonexistent', password: 'password123' });
    assert(false, 'Should have thrown error on nonexistent user');
  } catch (err: unknown) {
    assert(getErrorMessage(err).includes('Invalid username or password'), 'Appropriate error thrown for nonexistent user');
  }

  // Validation checks
  const emptyUserVal = validateUsername('');
  assert(emptyUserVal.isValid === false, 'Empty username is invalid');
  const emptyPassVal = validatePassword('');
  assert(emptyPassVal.isValid === false, 'Empty password is invalid');

  // 3. Customers load and search works
  console.log('\nTest 3: Customers load and search works');
  const allCustomers = await customerService.getCustomers();
  assert(allCustomers.length >= 8, `Loaded ${allCustomers.length} initial customers`);

  // Search by name
  const azureSearch = await customerService.getCustomers('Azure');
  assert(azureSearch.length === 1 && azureSearch[0].name === 'Azure Interior', 'Search by name returns Azure Interior');

  // Search by city
  const seattleSearch = await customerService.getCustomers('Seattle');
  assert(seattleSearch.length === 1 && seattleSearch[0].city === 'Seattle', 'Search by city returns Gemini Furniture');

  // Search by phone
  const phoneSearch = await customerService.getCustomers('876-5432');
  assert(phoneSearch.length === 1 && phoneSearch[0].name === 'Deco Addict', 'Search by phone returns Deco Addict');

  // Search by display name
  const studioSearch = await customerService.getCustomers('Studio');
  assert(studioSearch.length === 1 && studioSearch[0].name === 'Deco Addict', 'Search by display name matches');

  // 4. Opening a customer displays the correct details
  console.log('\nTest 4: Opening a customer displays correct details');
  const customer101 = await customerService.getCustomerById(101);
  assert(customer101.name === 'Azure Interior', 'Customer 101 name matches');
  assert(customer101.email === 'contact@azure-interior.example', 'Email matches');
  assert(customer101.street === '4557 Deans Lane', 'Street address matches');
  assert(customer101.city === 'Pleasantville', 'City matches');
  assert(customer101.state === 'New York', 'State matches');
  assert(customer101.zip === '10570', 'ZIP matches');
  assert(customer101.totalOrders === 6, 'Total orders matches');

  // 5. Updating a phone number reflects the saved value
  console.log('\nTest 5: Updating phone number validates input and reflects saved value');
  // Validation checks
  const invalidPhone1 = validatePhoneNumber('123');
  assert(invalidPhone1.isValid === false, 'Short phone (< 6 digits) rejected');
  const invalidPhone2 = validatePhoneNumber('abc-def-ghij');
  assert(invalidPhone2.isValid === false, 'Non-phone characters rejected');
  const validPhone = validatePhoneNumber('+1 (555) 999-8877');
  assert(validPhone.isValid === true, 'Valid international phone accepted');

  const updatedCustomer = await customerService.updateCustomerPhone(101, '+1 (555) 999-8877');
  assert(updatedCustomer.phone === '+1 (555) 999-8877', 'Returned customer has updated phone');

  // Verify persistence in subsequent query
  const refetchedCustomer = await customerService.getCustomerById(101);
  assert(refetchedCustomer.phone === '+1 (555) 999-8877', 'Refetched customer has persisted phone number');

  // 6. Sales orders load and filtering works
  console.log('\nTest 6: Sales orders load and filtering works');
  const allOrders = await salesOrderService.getSalesOrders();
  assert(allOrders.length >= 7, `Loaded ${allOrders.length} sales orders`);

  const quotations = allOrders.filter(o => o.state === 'draft' || o.state === 'sent');
  assert(quotations.length >= 3, `Filter quotations returns ${quotations.length} orders`);

  const confirmedOrders = allOrders.filter(o => o.state === 'sale' || o.state === 'done');
  assert(confirmedOrders.length >= 3, `Filter confirmed orders returns ${confirmedOrders.length} orders`);

  // 7. Order details display correct product lines and totals
  console.log('\nTest 7: Order details display correct product lines and totals');
  const order501 = await salesOrderService.getSalesOrderById(501);
  assert(order501.name === 'SO001', 'Order name is SO001');
  assert(order501.lines.length === 2, 'Order has 2 order lines');
  assert(order501.lines[0].productName === 'Large Meeting Table', 'Line 1 product name matches');
  assert(order501.lines[0].productUomQty === 2, 'Line 1 quantity is 2');
  assert(order501.lines[0].priceUnit === 1200.0, 'Line 1 price is 1200.00');
  assert(order501.lines[0].priceSubtotal === 2400.0, 'Line 1 subtotal is 2400.00');
  assert(order501.amountUntaxed === 3000.0, 'Untaxed amount is 3000.00');
  assert(order501.amountTax === 450.0, 'Tax amount is 450.00');
  assert(order501.amountTotal === 3450.0, 'Total amount is 3450.00');

  // 8. Confirming a quotation updates its state in mock mode
  console.log('\nTest 8: Confirming quotation updates state in mock mode');
  assert(order501.state === 'draft', 'Order SO001 starts in draft state');
  const confirmedOrder501 = await salesOrderService.confirmQuotation(501);
  assert(confirmedOrder501.state === 'sale', 'Confirmed order transitioned to sale state');

  // Verify persistence
  const refetchedOrder = await salesOrderService.getSalesOrderById(501);
  assert(refetchedOrder.state === 'sale', 'Refetched order persisted in sale state');

  // Attempting to confirm again throws error
  try {
    await salesOrderService.confirmQuotation(501);
    assert(false, 'Should throw error when confirming already confirmed order');
  } catch (err: unknown) {
    assert(getErrorMessage(err).includes('cannot be confirmed'), 'Prevents re-confirming already confirmed order');
  }

  // 9. Non-internal user role test (portal user)
  console.log('\nTest 9: Role-based access audit (portal user restricted)');
  const portalSession = await authService.login({ username: 'portal', password: 'password123' });
  assert(portalSession.user.role === 'portal_user', 'Portal user role is portal_user');
  assert(portalSession.user.isInternalUser === false, 'Portal user isInternalUser is false');

  // 10. Navigation and logout behave correctly
  console.log('\nTest 10: Navigation and logout behave correctly');
  assert(await authService.getCurrentSession() !== null, 'Session active before logout');
  await authService.logout();
  assert(await authService.getCurrentSession() === null, 'Session cleared after logout');

  // 11. Security Audit: Check that Real Odoo adapter NEVER falls back to mock
  console.log('\nTest 11: Security Audit: Real Odoo adapter isolation and no fallback');
  const unconfiguredClient = new OdooClient({ baseUrl: '', database: '' });
  assert(unconfiguredClient.isConfigured() === false, 'Unconfigured client isConfigured is false');

  try {
    unconfiguredClient.ensureConfigured();
    assert(false, 'ensureConfigured should throw OdooNotConfiguredError');
  } catch (err) {
    assert(err instanceof OdooNotConfiguredError, 'Throws OdooNotConfiguredError when unconfigured');
  }

  const realAuth = new OdooAuthService(unconfiguredClient);
  try {
    await realAuth.login({ username: 'test', password: 'pwd' });
    assert(false, 'OdooAuthService should throw when unconfigured');
  } catch (err) {
    assert(err instanceof OdooNotConfiguredError, 'OdooAuthService does not silently fall back to mock data');
  }

  const realCustomers = new OdooCustomerService(unconfiguredClient);
  try {
    await realCustomers.getCustomers();
    assert(false, 'OdooCustomerService should throw when unconfigured');
  } catch (err) {
    assert(err instanceof OdooNotConfiguredError, 'OdooCustomerService does not silently fall back to mock data');
  }

  const realOrders = new OdooSalesOrderService(unconfiguredClient);
  try {
    await realOrders.getSalesOrders();
    assert(false, 'OdooSalesOrderService should throw when unconfigured');
  } catch (err) {
    assert(err instanceof OdooNotConfiguredError, 'OdooSalesOrderService does not silently fall back to mock data');
  }

  console.log('\n====================================================');
  console.log(`Audit Results: ${passed} passed, ${failed} failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAudit().catch(err => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
