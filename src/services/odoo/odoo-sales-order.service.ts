import { ISalesOrderService, SalesOrder, SalesOrderLine, SalesOrderStatus } from '@/types/sales-order';
import { OdooClient, defaultOdooClient } from './odoo-client';
import { safeLogger } from '@/lib/logger';

interface OdooSaleOrderRaw {
  id: number;
  name: string;
  partner_id: [number, string] | false;
  date_order: string | false;
  state: string;
  amount_untaxed: number;
  amount_tax: number;
  amount_total: number;
  currency_id: [number, string] | false;
  order_line?: number[];
  user_id?: [number, string] | false;
  note?: string | false;
}

interface OdooOrderLineRaw {
  id: number;
  product_id: [number, string] | false;
  name: string | false;
  product_uom_qty: number;
  price_unit: number;
  price_subtotal: number;
  discount?: number;
}

const SALE_ORDER_FIELDS = [
  'id',
  'name',
  'partner_id',
  'date_order',
  'state',
  'amount_untaxed',
  'amount_tax',
  'amount_total',
  'currency_id',
  'order_line',
  'user_id',
  'note',
];

const ORDER_LINE_FIELDS = [
  'id',
  'product_id',
  'name',
  'product_uom_qty',
  'price_unit',
  'price_subtotal',
  'discount',
];

function normalizeState(state: string): SalesOrderStatus {
  switch (state) {
    case 'draft':
      return 'draft';
    case 'sent':
      return 'sent';
    case 'sale':
      return 'sale';
    case 'done':
      return 'done';
    case 'cancel':
      return 'cancel';
    default:
      return 'draft';
  }
}

function normalizeCurrency(currency: [number, string] | false | undefined): string {
  if (Array.isArray(currency) && currency[1]) {
    const code = currency[1].toUpperCase();
    if (code === 'USD') return '$';
    if (code === 'EUR') return '€';
    if (code === 'GBP') return '£';
    return code;
  }
  return '$';
}

function mapOdooOrderLine(line: OdooOrderLineRaw): SalesOrderLine {
  const prodId = Array.isArray(line.product_id) ? line.product_id[0] : 0;
  const prodName = Array.isArray(line.product_id) ? line.product_id[1] : (line.name ? String(line.name) : 'Product');

  return {
    id: line.id,
    productId: prodId,
    productName: prodName,
    description: line.name ? String(line.name) : undefined,
    productUomQty: typeof line.product_uom_qty === 'number' ? line.product_uom_qty : 0,
    priceUnit: typeof line.price_unit === 'number' ? line.price_unit : 0,
    priceSubtotal: typeof line.price_subtotal === 'number' ? line.price_subtotal : 0,
    discount: typeof line.discount === 'number' && line.discount > 0 ? line.discount : undefined,
  };
}

/**
 * Real Odoo Sales Order Adapter implementing ISalesOrderService.
 * Connects to `sale.order` and `sale.order.line` via Odoo JSON-RPC.
 */
export class OdooSalesOrderService implements ISalesOrderService {
  private odooClient: OdooClient;

  constructor(odooClient: OdooClient = defaultOdooClient) {
    this.odooClient = odooClient;
  }

  private assertInternalAccess(): void {
    const session = this.odooClient.getSession();
    if (session && !session.isInternalUser) {
      throw new Error(
        'Access Denied: Only internal sales users have permission to view or manage sales orders.'
      );
    }
  }

  async getSalesOrders(): Promise<SalesOrder[]> {
    safeLogger.info('OdooSalesOrderService: fetching sales orders');
    this.odooClient.ensureConfigured();
    this.assertInternalAccess();

    const records = await this.odooClient.callKw<OdooSaleOrderRaw[]>(
      'sale.order',
      'search_read',
      [[]],
      {
        fields: SALE_ORDER_FIELDS,
        limit: 50,
        order: 'id desc',
      }
    );

    return records.map((o) => ({
      id: o.id,
      name: o.name,
      customerId: Array.isArray(o.partner_id) ? o.partner_id[0] : 0,
      customerName: Array.isArray(o.partner_id) ? o.partner_id[1] : 'Unknown Customer',
      dateOrder: o.date_order ? String(o.date_order) : '',
      state: normalizeState(o.state),
      amountUntaxed: typeof o.amount_untaxed === 'number' ? o.amount_untaxed : 0,
      amountTax: typeof o.amount_tax === 'number' ? o.amount_tax : 0,
      amountTotal: typeof o.amount_total === 'number' ? o.amount_total : 0,
      currencySymbol: normalizeCurrency(o.currency_id),
      salesperson: Array.isArray(o.user_id) ? o.user_id[1] : undefined,
      notes: o.note ? String(o.note) : undefined,
      lines: [],
    }));
  }

  async getSalesOrderById(id: number | string): Promise<SalesOrder> {
    safeLogger.info('OdooSalesOrderService: fetching sales order by id:', id);
    this.odooClient.ensureConfigured();
    this.assertInternalAccess();

    const numericId = Number(id);
    if (!numericId || Number.isNaN(numericId)) {
      throw new Error(`Invalid sales order ID: ${id}`);
    }

    const records = await this.odooClient.callKw<OdooSaleOrderRaw[]>(
      'sale.order',
      'read',
      [[numericId]],
      {
        fields: SALE_ORDER_FIELDS,
      }
    );

    if (!records || records.length === 0) {
      throw new Error(`Sales Order #${id} not found.`);
    }

    const orderRaw = records[0];
    let lines: SalesOrderLine[] = [];

    if (orderRaw.order_line && orderRaw.order_line.length > 0) {
      const lineRecords = await this.odooClient.callKw<OdooOrderLineRaw[]>(
        'sale.order.line',
        'read',
        [orderRaw.order_line],
        {
          fields: ORDER_LINE_FIELDS,
        }
      );
      lines = lineRecords.map(mapOdooOrderLine);
    }

    return {
      id: orderRaw.id,
      name: orderRaw.name,
      customerId: Array.isArray(orderRaw.partner_id) ? orderRaw.partner_id[0] : 0,
      customerName: Array.isArray(orderRaw.partner_id) ? orderRaw.partner_id[1] : 'Unknown Customer',
      dateOrder: orderRaw.date_order ? String(orderRaw.date_order) : '',
      state: normalizeState(orderRaw.state),
      amountUntaxed: typeof orderRaw.amount_untaxed === 'number' ? orderRaw.amount_untaxed : 0,
      amountTax: typeof orderRaw.amount_tax === 'number' ? orderRaw.amount_tax : 0,
      amountTotal: typeof orderRaw.amount_total === 'number' ? orderRaw.amount_total : 0,
      currencySymbol: normalizeCurrency(orderRaw.currency_id),
      salesperson: Array.isArray(orderRaw.user_id) ? orderRaw.user_id[1] : undefined,
      notes: orderRaw.note ? String(orderRaw.note) : undefined,
      lines,
    };
  }

  async confirmQuotation(id: number | string): Promise<SalesOrder> {
    safeLogger.info('OdooSalesOrderService: confirming quotation for id:', id);
    this.odooClient.ensureConfigured();
    this.assertInternalAccess();

    const numericId = Number(id);
    if (!numericId || Number.isNaN(numericId)) {
      throw new Error(`Invalid sales order ID: ${id}`);
    }

    // Verify current state before confirming
    const currentOrder = await this.getSalesOrderById(numericId);
    if (currentOrder.state !== 'draft' && currentOrder.state !== 'sent') {
      throw new Error(
        `Quotation #${currentOrder.name} cannot be confirmed (current state: ${currentOrder.state}).`
      );
    }

    // Call Odoo confirmation workflow method action_confirm
    await this.odooClient.callKw('sale.order', 'action_confirm', [[numericId]]);

    // Refresh and verify updated state directly from Odoo
    const refreshedOrder = await this.getSalesOrderById(numericId);
    safeLogger.info('OdooSalesOrderService: confirmed order state is now:', refreshedOrder.state);
    return refreshedOrder;
  }
}
