import { Customer, ICustomerService } from '@/types/customer';
import { OdooXmlRpcClient, defaultOdooXmlRpcClient } from './odoo-xmlrpc-client';
import { safeLogger } from '@/lib/logger';
import { validatePhoneNumber } from '@/lib/validation';

const CUSTOMER_FIELDS = [
  'id',
  'name',
  'display_name',
  'email',
  'phone',
  'mobile',
  'street',
  'city',
  'state_id',
  'zip',
  'country_id',
  'is_company',
  'sale_order_count',
  'total_invoiced',
];

interface RawPartnerRecord {
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

function mapPartnerToCustomer(raw: RawPartnerRecord): Customer {
  const name = typeof raw.name === 'string' ? raw.name : 'Unnamed Customer';
  const displayName = typeof raw.display_name === 'string' ? raw.display_name : name;
  const email = typeof raw.email === 'string' ? raw.email : '';
  const phone = typeof raw.phone === 'string' ? raw.phone : '';
  const mobile = typeof raw.mobile === 'string' ? raw.mobile : undefined;
  const street = typeof raw.street === 'string' ? raw.street : undefined;
  const city = typeof raw.city === 'string' ? raw.city : '';
  const zip = typeof raw.zip === 'string' ? raw.zip : undefined;

  let state: string | undefined;
  if (Array.isArray(raw.state_id) && typeof raw.state_id[1] === 'string') {
    state = raw.state_id[1];
  }

  let country: string | undefined;
  if (Array.isArray(raw.country_id) && typeof raw.country_id[1] === 'string') {
    country = raw.country_id[1];
  }

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
    totalOrders: typeof raw.sale_order_count === 'number' ? raw.sale_order_count : 0,
    totalInvoiced: typeof raw.total_invoiced === 'number' ? raw.total_invoiced : 0,
  };
}

export class OdooXmlRpcCustomerService implements ICustomerService {
  private client: OdooXmlRpcClient;

  constructor(client: OdooXmlRpcClient = defaultOdooXmlRpcClient) {
    this.client = client;
  }

  async getCustomers(query?: string): Promise<Customer[]> {
    safeLogger.info('OdooXmlRpcCustomerService: fetching customers via XML-RPC, query:', query);

    const domain: unknown[] = [['customer_rank', '>', 0]];

    if (query && query.trim()) {
      const q = query.trim();
      domain.push('|', '|', ['name', 'ilike', q], ['phone', 'ilike', q], ['city', 'ilike', q]);
    }

    let records: RawPartnerRecord[];
    try {
      records = await this.client.executeKw<RawPartnerRecord[]>(
        'res.partner',
        'search_read',
        [domain],
        {
          fields: CUSTOMER_FIELDS,
          limit: 80,
          order: 'name asc',
        }
      );
    } catch {
      // If customer_rank field is not installed on this database, fall back to active partners
      records = await this.client.executeKw<RawPartnerRecord[]>(
        'res.partner',
        'search_read',
        [[['active', '=', true]]],
        {
          fields: CUSTOMER_FIELDS,
          limit: 80,
          order: 'name asc',
        }
      );
    }

    if (!Array.isArray(records)) {
      return [];
    }

    return records.map(mapPartnerToCustomer);
  }

  async getCustomerById(id: number | string): Promise<Customer> {
    safeLogger.info('OdooXmlRpcCustomerService: fetching customer by id via XML-RPC:', id);

    const numericId = Number(id);
    if (!numericId || isNaN(numericId)) {
      throw new Error(`Invalid customer ID: ${id}`);
    }

    const records = await this.client.executeKw<RawPartnerRecord[]>(
      'res.partner',
      'read',
      [[numericId]],
      { fields: CUSTOMER_FIELDS }
    );

    if (!Array.isArray(records) || records.length === 0) {
      throw new Error(`Customer with ID ${id} not found.`);
    }

    return mapPartnerToCustomer(records[0]);
  }

  async updateCustomerPhone(id: number | string, phone: string): Promise<Customer> {
    safeLogger.info(`OdooXmlRpcCustomerService: updating customer phone for #${id} via XML-RPC`);

    const validation = validatePhoneNumber(phone);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid phone number format');
    }

    const numericId = Number(id);
    if (!numericId || isNaN(numericId)) {
      throw new Error(`Invalid customer ID: ${id}`);
    }

    const cleanPhone = phone.trim();

    // 1. Perform write
    await this.client.executeKw<boolean>(
      'res.partner',
      'write',
      [[numericId], { phone: cleanPhone }]
    );

    // 2. Read-back verification to guarantee server write succeeded
    const verified = await this.getCustomerById(numericId);
    if (verified.phone !== cleanPhone) {
      throw new Error(
        `Verification failed: Odoo server phone (${verified.phone}) does not match updated value (${cleanPhone})`
      );
    }

    safeLogger.info(`OdooXmlRpcCustomerService: successfully updated and verified phone for #${id}`);
    return verified;
  }
}
