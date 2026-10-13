import { Customer, ICustomerService } from '@/types/customer';
import { OdooClient, defaultOdooClient } from './odoo-client';
import { safeLogger } from '@/lib/logger';
import { validatePhoneNumber } from '@/lib/validation';

interface OdooPartnerRaw {
  id: number;
  name: string | false;
  display_name?: string | false;
  email?: string | false;
  phone?: string | false;
  mobile?: string | false;
  street?: string | false;
  city?: string | false;
  state_id?: [number, string] | false;
  zip?: string | false;
  country_id?: [number, string] | false;
  is_company?: boolean;
  sale_order_count?: number;
  total_invoiced?: number;
}

const PARTNER_FIELDS = [
  'id',
  'name',
  'display_name',
  'email',
  'phone',
  'street',
  'city',
  'state_id',
  'zip',
  'country_id',
  'is_company',
  'sale_order_count',
  'total_invoiced',
];

function mapOdooPartnerToCustomer(raw: OdooPartnerRaw): Customer {
  const name = raw.name ? String(raw.name) : 'Unnamed Partner';
  const displayName = raw.display_name ? String(raw.display_name) : name;
  const email = raw.email ? String(raw.email) : '';
  const phone = raw.phone ? String(raw.phone) : (raw.mobile ? String(raw.mobile) : '');
  const mobile = raw.mobile ? String(raw.mobile) : undefined;
  const street = raw.street ? String(raw.street) : undefined;
  const city = raw.city ? String(raw.city) : '';
  const state = Array.isArray(raw.state_id) ? raw.state_id[1] : undefined;
  const zip = raw.zip ? String(raw.zip) : undefined;
  const country = Array.isArray(raw.country_id) ? raw.country_id[1] : undefined;

  return {
    id: raw.id,
    name,
    displayName,
    email,
    phone,
    mobile,
    street,
    city,
    state,
    zip,
    country,
    isCompany: Boolean(raw.is_company),
    totalOrders: typeof raw.sale_order_count === 'number' ? raw.sale_order_count : undefined,
    totalInvoiced: typeof raw.total_invoiced === 'number' ? raw.total_invoiced : undefined,
  };
}

/**
 * Real Odoo Customer Adapter implementing ICustomerService.
 * Connects to `res.partner` via Odoo JSON-RPC.
 */
export class OdooCustomerService implements ICustomerService {
  private odooClient: OdooClient;

  constructor(odooClient: OdooClient = defaultOdooClient) {
    this.odooClient = odooClient;
  }

  async getCustomers(query?: string): Promise<Customer[]> {
    safeLogger.info('OdooCustomerService: fetching customers with query:', query);
    this.odooClient.ensureConfigured();

    const domain: unknown[] = [['customer_rank', '>', 0]];

    if (query && query.trim()) {
      const q = query.trim();
      // Odoo prefix notation for multiple OR conditions
      domain.push('|', '|', ['name', 'ilike', q], ['email', 'ilike', q], ['phone', 'ilike', q]);
    }

    const records = await this.odooClient.callKw<OdooPartnerRaw[]>(
      'res.partner',
      'search_read',
      [domain],
      {
        fields: PARTNER_FIELDS,
        limit: 80,
        order: 'name asc',
      }
    );

    return records.map(mapOdooPartnerToCustomer);
  }

  async getCustomerById(id: number | string): Promise<Customer> {
    safeLogger.info('OdooCustomerService: fetching customer by id:', id);
    this.odooClient.ensureConfigured();

    const numericId = Number(id);
    if (!numericId || Number.isNaN(numericId)) {
      throw new Error(`Invalid customer ID: ${id}`);
    }

    const records = await this.odooClient.callKw<OdooPartnerRaw[]>(
      'res.partner',
      'read',
      [[numericId]],
      {
        fields: PARTNER_FIELDS,
      }
    );

    if (!records || records.length === 0) {
      throw new Error(`Customer with ID ${id} not found.`);
    }

    return mapOdooPartnerToCustomer(records[0]);
  }

  async updateCustomerPhone(id: number | string, phone: string): Promise<Customer> {
    safeLogger.info('OdooCustomerService: updating customer phone for id:', id);
    this.odooClient.ensureConfigured();

    const validation = validatePhoneNumber(phone);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid phone number format');
    }

    const numericId = Number(id);
    if (!numericId || Number.isNaN(numericId)) {
      throw new Error(`Invalid customer ID: ${id}`);
    }

    // Execute Odoo write operation
    const writeSuccess = await this.odooClient.callKw<boolean>(
      'res.partner',
      'write',
      [[numericId], { phone: phone.trim() }]
    );

    if (!writeSuccess) {
      throw new Error(`Failed to update phone number on Odoo record #${id}`);
    }

    // Confirm saved value by reading record again
    const updatedCustomer = await this.getCustomerById(numericId);
    const normalizedConfirmed = (updatedCustomer.phone || '').trim();
    if (normalizedConfirmed !== phone.trim()) {
      throw new Error(
        `Read-back verification failed: Odoo server returned "${normalizedConfirmed}" instead of expected "${phone.trim()}".`
      );
    }
    safeLogger.info('OdooCustomerService: successfully confirmed updated phone:', updatedCustomer.phone);
    return updatedCustomer;
  }
}
