/**
 * Unit Test Suite for XML-RPC Transport, Serializer, and Service Adapters.
 *
 * Uses isolated test fixtures and in-memory mock responses.
 * Never connects to or mutates live Odoo records.
 */

import {
  serializeXmlRpcValue,
  serializeXmlRpcMethodCall,
  deserializeXmlRpcResponse,
  OdooXmlRpcFaultError,
  escapeXml,
  unescapeXml,
} from '../src/services/odoo/xmlrpc/xmlrpc-serializer';
import {
  OdooXmlRpcClient,
  OdooXmlRpcNotConfiguredError,
} from '../src/services/odoo/xmlrpc/odoo-xmlrpc-client';
import { OdooXmlRpcAuthService } from '../src/services/odoo/xmlrpc/odoo-xmlrpc-auth.service';
import { OdooXmlRpcCustomerService } from '../src/services/odoo/xmlrpc/odoo-xmlrpc-customer.service';
import { OdooXmlRpcSalesOrderService } from '../src/services/odoo/xmlrpc/odoo-xmlrpc-sales-order.service';

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

async function runXmlRpcUnitTests() {
  console.log('====================================================');
  console.log('Odoo XML-RPC Transport & Adapter Unit Test Suite');
  console.log('====================================================\n');

  // ----------------------------------------------------
  // Test Suite 1: XML Encoding & Special Character Handling
  // ----------------------------------------------------
  console.log('Test Suite 1: XML-RPC Encoding & Character Serialization');

  assert(
    escapeXml('Deco & Addict <Studio> "HQ" \'Main\'') ===
      'Deco &amp; Addict &lt;Studio&gt; &quot;HQ&quot; &apos;Main&apos;',
    'Properly escapes XML special entities (&, <, >, ", \')'
  );

  assert(
    unescapeXml('Deco &amp; Addict &lt;Studio&gt; &quot;HQ&quot; &apos;Main&apos;') ===
      'Deco & Addict <Studio> "HQ" \'Main\'',
    'Properly unescapes XML special entities'
  );

  assert(serializeXmlRpcValue('Hello World') === '<string>Hello World</string>', 'Serializes string primitive');
  assert(serializeXmlRpcValue(42) === '<int>42</int>', 'Serializes integer primitive');
  assert(serializeXmlRpcValue(19.99) === '<double>19.99</double>', 'Serializes floating point primitive');
  assert(serializeXmlRpcValue(true) === '<boolean>1</boolean>', 'Serializes boolean true as 1');
  assert(serializeXmlRpcValue(false) === '<boolean>0</boolean>', 'Serializes boolean false as 0');
  assert(serializeXmlRpcValue(null) === '<nil/>', 'Serializes null as nil tag');

  // Array serialization
  const arrayXml = serializeXmlRpcValue([1, 'two', false]);
  assert(
    arrayXml === '<array><data><value><int>1</int></value><value><string>two</string></value><value><boolean>0</boolean></value></data></array>',
    'Serializes heterogeneous arrays'
  );

  // Struct serialization
  const structXml = serializeXmlRpcValue({ id: 10, name: 'Acme Corp' });
  assert(
    structXml.includes('<member><name>id</name><value><int>10</int></value></member>') &&
    structXml.includes('<member><name>name</name><value><string>Acme Corp</string></value></member>'),
    'Serializes object into XML-RPC struct members'
  );

  // Method call payload
  const callXml = serializeXmlRpcMethodCall('authenticate', ['demo_db', 'admin', 'pwd', {}]);
  assert(
    callXml.startsWith('<?xml version="1.0"?><methodCall><methodName>authenticate</methodName><params>') &&
    callXml.includes('<value><string>demo_db</string></value>') &&
    callXml.includes('<value><string>admin</string></value>') &&
    callXml.includes('<value><string>pwd</string></value>'),
    'Serializes full methodCall envelope for authenticate'
  );

  // ----------------------------------------------------
  // Test Suite 2: XML Deserialization & Response Parsing
  // ----------------------------------------------------
  console.log('\nTest Suite 2: XML-RPC Deserialization & Response Parsing');

  const intResponse = `<?xml version="1.0"?><methodResponse><params><param><value><int>2</int></value></param></params></methodResponse>`;
  assert(deserializeXmlRpcResponse<number>(intResponse) === 2, 'Decodes integer response (e.g. uid 2)');

  const boolResponse = `<?xml version="1.0"?><methodResponse><params><param><value><boolean>0</boolean></value></param></params></methodResponse>`;
  assert(deserializeXmlRpcResponse<boolean>(boolResponse) === false, 'Decodes boolean false response');

  const structResponse = `<?xml version="1.0"?>
<methodResponse>
  <params>
    <param>
      <value>
        <array>
          <data>
            <value>
              <struct>
                <member><name>id</name><value><int>101</int></value></member>
                <member><name>name</name><value><string>Azure Interior &amp; Partners</string></value></member>
                <member><name>phone</name><value><string>+1 (555) 0199</string></value></member>
                <member><name>total</name><value><double>15200.5</double></value></member>
                <member><name>is_company</name><value><boolean>1</boolean></value></member>
              </struct>
            </value>
          </data>
        </array>
      </value>
    </param>
  </params>
</methodResponse>`;

  const decodedStructs = deserializeXmlRpcResponse<Array<Record<string, unknown>>>(structResponse);
  assert(Array.isArray(decodedStructs) && decodedStructs.length === 1, 'Decodes array of structs');
  assert(decodedStructs[0].id === 101, 'Decodes member id as number 101');
  assert(decodedStructs[0].name === 'Azure Interior & Partners', 'Decodes unescaped string member');
  assert(decodedStructs[0].phone === '+1 (555) 0199', 'Decodes phone member');
  assert(decodedStructs[0].total === 15200.5, 'Decodes float member');
  assert(decodedStructs[0].is_company === true, 'Decodes boolean member as true');

  // Fault response decoding
  const faultXml = `<?xml version="1.0"?>
<methodResponse>
  <fault>
    <value>
      <struct>
        <member><name>faultCode</name><value><int>2</int></value></member>
        <member><name>faultString</name><value><string>AccessDenied: Invalid login or password</string></value></member>
      </struct>
    </value>
  </fault>
</methodResponse>`;

  try {
    deserializeXmlRpcResponse(faultXml);
    assert(false, 'Should throw on fault response');
  } catch (err: unknown) {
    assert(err instanceof OdooXmlRpcFaultError, 'Throws OdooXmlRpcFaultError on fault XML');
    const faultErr = err as OdooXmlRpcFaultError;
    assert(faultErr.faultCode === 2, 'Extracts faultCode 2');
    assert(faultErr.faultString.includes('AccessDenied'), 'Extracts faultString containing AccessDenied');
  }

  // ----------------------------------------------------
  // Test Suite 3: OdooXmlRpcClient Boundary & Configuration
  // ----------------------------------------------------
  console.log('\nTest Suite 3: OdooXmlRpcClient Boundary & Configuration');

  const unconfiguredClient = new OdooXmlRpcClient({ baseUrl: '', database: '' });
  assert(!unconfiguredClient.isConfigured(), 'Empty client returns isConfigured: false');

  try {
    unconfiguredClient.ensureConfigured();
    assert(false, 'Should throw OdooXmlRpcNotConfiguredError');
  } catch (err) {
    assert(err instanceof OdooXmlRpcNotConfiguredError, 'Throws OdooXmlRpcNotConfiguredError when unconfigured');
  }

  const configuredClient = new OdooXmlRpcClient({
    baseUrl: 'https://test-odoo.example.com/',
    database: 'demo_test_db',
  });
  assert(configuredClient.isConfigured(), 'Configured client returns isConfigured: true');
  assert(configuredClient.getConfig().baseUrl === 'https://test-odoo.example.com', 'Normalizes trailing slash on baseUrl');

  // Session guard for executeKw
  try {
    await configuredClient.executeKw('res.partner', 'search_read', []);
    assert(false, 'Should throw when executing kw without session');
  } catch (err: any) {
    assert(err.message.includes('session has expired or is invalid'), 'executeKw guards against missing session');
  }

  // ----------------------------------------------------
  // Test Suite 4: OdooXmlRpcAuthService Login & Role Mapping
  // ----------------------------------------------------
  console.log('\nTest Suite 4: OdooXmlRpcAuthService Login & Role Mapping');

  const testAuthClient = new OdooXmlRpcClient({
    baseUrl: 'https://mock.odoo.internal',
    database: 'mock_xmlrpc_db',
  });

  const authService = new OdooXmlRpcAuthService(testAuthClient);

  // Input validation
  try {
    await authService.login({ username: '', password: '123' });
    assert(false, 'Should reject empty username');
  } catch (err: any) {
    assert(err.message.includes('Username is required'), 'Validates username requirement');
  }

  try {
    await authService.login({ username: 'user', password: '' });
    assert(false, 'Should reject empty password');
  } catch (err: any) {
    assert(err.message.includes('Password is required'), 'Validates password requirement');
  }

  // Test failed authentication (authenticate returns boolean false)
  testAuthClient.callCommon = (async () => false) as any;
  try {
    await authService.login({ username: 'bad_user', password: 'bad_password' });
    assert(false, 'Should throw on failed authentication');
  } catch (err: any) {
    assert(err.message.includes('Invalid username or password'), 'Rejects invalid credentials with user-friendly error');
  }

  // Test successful internal admin login
  testAuthClient.callCommon = (async () => 2) as any; // uid = 2
  testAuthClient.executeKw = (async (_model: string, method: string, args: unknown[]) => {
    if (method === 'read') {
      return [{ id: 2, name: 'Marc Demo Admin', login: 'admin', email: 'admin@2segypt.com', company_id: [1, '2S Egypt'] }];
    }
    if (method === 'has_group') {
      const groupName = args[0];
      if (groupName === 'base.group_user') return true;
      if (groupName === 'base.group_system') return true;
    }
    return false;
  }) as any;

  const adminSession = await authService.login({ username: 'admin', password: 'valid_password' });
  assert(adminSession.user.id === 2, 'Authenticates with UID 2');
  assert(adminSession.user.role === 'sales_manager', 'Maps system administrator to sales_manager role');
  assert(adminSession.user.isInternalUser === true, 'Flags internal user as true');
  assert(adminSession.user.companyName === '2S Egypt', 'Maps company name correctly');
  assert(Boolean(adminSession.token), 'Generates valid XML-RPC session token');
  assert(await authService.getCurrentSession() !== null, 'Session is retained in memory');

  // Test portal user mapping
  testAuthClient.callCommon = (async () => 15) as any;
  testAuthClient.executeKw = (async (_model: string, method: string) => {
    if (method === 'read') {
      return [{ id: 15, name: 'Portal Client', login: 'portal_user', email: 'portal@external.com' }];
    }
    if (method === 'has_group') {
      return false; // Not in base.group_user
    }
    return false;
  }) as any;

  const portalSession = await authService.login({ username: 'portal_user', password: 'valid_password' });
  assert(portalSession.user.role === 'portal_user', 'Maps non-internal user to portal_user role');
  assert(portalSession.user.isInternalUser === false, 'Flags portal user as isInternalUser: false');

  // Logout clears session
  await authService.logout();
  assert(await authService.getCurrentSession() === null, 'Session is cleared after logout');

  // ----------------------------------------------------
  // Test Suite 5: OdooXmlRpcCustomerService Operations
  // ----------------------------------------------------
  console.log('\nTest Suite 5: OdooXmlRpcCustomerService Operations');

  const customerClient = new OdooXmlRpcClient({
    baseUrl: 'https://mock.odoo.internal',
    database: 'mock_xmlrpc_db',
  });
  customerClient.setSession({
    uid: 2,
    db: 'mock_xmlrpc_db',
    username: 'admin',
    name: 'Admin',
    passwordToken: 'mock_pass',
    isInternalUser: true,
    isAdmin: true,
  });

  const customerService = new OdooXmlRpcCustomerService(customerClient);

  // Phone validation before network call
  try {
    await customerService.updateCustomerPhone(10, '123');
    assert(false, 'Should reject short phone number');
  } catch (err: any) {
    assert(err.message.includes('at least 6 digits') || err.message.includes('valid phone'), 'Client-side validates phone format');
  }

  // Mock search_read
  const mockPartners = [
    {
      id: 10,
      name: 'Acme Corporation',
      display_name: 'Acme Corp HQ',
      email: 'contact@acme.example',
      phone: '+1 (555) 0100',
      mobile: '+1 (555) 0101',
      city: 'Cairo',
      state_id: [1, 'Cairo Governorate'],
      country_id: [63, 'Egypt'],
      is_company: true,
      sale_order_count: 5,
      total_invoiced: 45000.0,
    },
    {
      id: 11,
      name: 'Delta Supplies',
      display_name: false,
      email: false,
      phone: false,
      city: false,
      state_id: false,
      is_company: false,
      sale_order_count: 0,
    },
  ];

  customerClient.executeKw = (async (_model: string, method: string, args: unknown[]) => {
    if (method === 'search_read') {
      return mockPartners;
    }
    if (method === 'read') {
      const id = (args[0] as number[])[0];
      return mockPartners.filter((p) => p.id === id);
    }
    if (method === 'write') {
      return true;
    }
    return [];
  }) as any;

  const customers = await customerService.getCustomers();
  assert(customers.length === 2, 'Loads customers via search_read');
  assert(customers[0].name === 'Acme Corporation', 'Maps customer name');
  assert(customers[0].displayName === 'Acme Corp HQ', 'Maps display name');
  assert(customers[0].city === 'Cairo', 'Maps city');
  assert(customers[0].state === 'Cairo Governorate', 'Extracts state from [id, name] tuple');
  assert(customers[0].country === 'Egypt', 'Extracts country from [id, name] tuple');
  assert(customers[0].isCompany === true, 'Maps isCompany flag');
  assert(customers[0].totalOrders === 5, 'Maps sale_order_count');
  assert(customers[1].displayName === 'Delta Supplies', 'Falls back to name when display_name is false');
  assert(customers[1].email === '', 'Normalizes boolean false email to empty string');
  assert(customers[1].phone === '', 'Normalizes boolean false phone to empty string');

  // Customer by ID
  const singleCustomer = await customerService.getCustomerById(10);
  assert(singleCustomer.id === 10, 'Retrieves customer by ID');
  assert(singleCustomer.name === 'Acme Corporation', 'Customer details match');

  // Customer phone update with read-back verification
  let writeCalled = false;
  customerClient.executeKw = (async (_model: string, method: string, args: unknown[]) => {
    if (method === 'write') {
      writeCalled = true;
      const vals = args[1] as Record<string, unknown>;
      mockPartners[0].phone = vals.phone as string;
      return true;
    }
    if (method === 'read') {
      return [mockPartners[0]];
    }
    return [];
  }) as any;

  const updatedCustomer = await customerService.updateCustomerPhone(10, '+1 (555) 999-8877');
  assert(writeCalled, 'Executes write via execute_kw');
  assert(updatedCustomer.phone === '+1 (555) 999-8877', 'Read-back confirms updated phone number');

  // ----------------------------------------------------
  // Test Suite 6: OdooXmlRpcSalesOrderService Operations
  // ----------------------------------------------------
  console.log('\nTest Suite 6: OdooXmlRpcSalesOrderService Operations');

  const orderClient = new OdooXmlRpcClient({
    baseUrl: 'https://mock.odoo.internal',
    database: 'mock_xmlrpc_db',
  });
  const salesOrderService = new OdooXmlRpcSalesOrderService(orderClient);

  // Portal user blocked by role guard
  orderClient.setSession({
    uid: 15,
    db: 'mock_xmlrpc_db',
    username: 'portal_user',
    name: 'Portal User',
    passwordToken: 'mock_pass',
    isInternalUser: false, // Portal user
    isAdmin: false,
  });

  try {
    await salesOrderService.getSalesOrders();
    assert(false, 'Portal user should be blocked from sales orders');
  } catch (err: any) {
    assert(err.message.includes('Access Denied'), 'Role guard blocks portal users prior to dispatch');
  }

  // Internal user allowed
  orderClient.setSession({
    uid: 2,
    db: 'mock_xmlrpc_db',
    username: 'admin',
    name: 'Admin',
    passwordToken: 'mock_pass',
    isInternalUser: true,
    isAdmin: true,
  });

  const mockOrders = [
    {
      id: 501,
      name: 'SO001',
      partner_id: [10, 'Acme Corporation'],
      date_order: '2026-10-10 10:30:00',
      state: 'draft',
      amount_untaxed: 3000.0,
      amount_tax: 450.0,
      amount_total: 3450.0,
      currency_id: [1, 'USD'],
      user_id: [2, 'Sales Admin'],
      order_line: [1001, 1002],
    },
    {
      id: 502,
      name: 'SO002',
      partner_id: [10, 'Acme Corporation'],
      date_order: '2026-10-11 12:00:00',
      state: 'sale',
      amount_untaxed: 1000.0,
      amount_tax: 150.0,
      amount_total: 1150.0,
      currency_id: [1, 'EGP'],
      order_line: [],
    },
  ];

  const mockLines = [
    {
      id: 1001,
      product_id: [201, 'Office Workstation Desk'],
      name: 'Office Workstation Desk (Standard)',
      product_uom_qty: 3,
      price_unit: 800.0,
      price_subtotal: 2400.0,
    },
    {
      id: 1002,
      product_id: [202, 'Ergonomic Desk Chair'],
      name: 'Ergonomic Desk Chair (Mesh)',
      product_uom_qty: 3,
      price_unit: 200.0,
      price_subtotal: 600.0,
    },
  ];

  orderClient.executeKw = (async (model: string, method: string, args: unknown[]) => {
    if (model === 'sale.order' && method === 'search_read') {
      return mockOrders;
    }
    if (model === 'sale.order' && method === 'read') {
      const id = (args[0] as number[])[0];
      return mockOrders.filter((o) => o.id === id);
    }
    if (model === 'sale.order.line' && method === 'read') {
      return mockLines;
    }
    if (model === 'sale.order' && method === 'action_confirm') {
      const id = (args[0] as number[])[0];
      const match = mockOrders.find((o) => o.id === id);
      if (match) match.state = 'sale';
      return true;
    }
    return [];
  }) as any;

  const orderList = await salesOrderService.getSalesOrders();
  assert(orderList.length === 2, 'Retrieves sales orders list');
  assert(orderList[0].name === 'SO001', 'Maps sales order name');
  assert(orderList[0].customerName === 'Acme Corporation', 'Maps customer name from partner_id tuple');
  assert(orderList[0].currencySymbol === '$', 'Maps USD currency symbol');
  assert(orderList[1].currencySymbol === 'EGP ', 'Maps EGP currency symbol');

  // Sales order details with lines
  const orderDetails = await salesOrderService.getSalesOrderById(501);
  assert(orderDetails.id === 501, 'Retrieves sales order details by ID');
  assert(orderDetails.lines.length === 2, 'Loads associated order lines');
  assert(orderDetails.lines[0].productName === 'Office Workstation Desk', 'Maps line product name');
  assert(orderDetails.lines[0].priceSubtotal === 2400.0, 'Maps line subtotal');

  // Quotation confirmation workflow
  assert(orderDetails.state === 'draft', 'Order SO001 begins in draft state');
  const confirmed = await salesOrderService.confirmQuotation(501);
  assert(confirmed.state === 'sale', 'Transitions quotation to sale state after action_confirm');

  // Re-confirming already confirmed order throws error
  try {
    await salesOrderService.confirmQuotation(501);
    assert(false, 'Should prevent confirming non-draft order');
  } catch (err: any) {
    assert(err.message.includes('cannot be confirmed'), 'Prevents re-confirming already confirmed order');
  }

  // ----------------------------------------------------
  // Summary
  // ----------------------------------------------------
  console.log('\n====================================================');
  console.log(`XML-RPC Unit Test Results: ${passed} passed, ${failed} failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runXmlRpcUnitTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
