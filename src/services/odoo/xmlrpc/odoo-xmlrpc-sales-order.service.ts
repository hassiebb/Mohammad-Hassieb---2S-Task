import {
  ISalesOrderService,
  SalesOrder,
  SalesOrderLine,
  SalesOrderStatus,
} from '@/types/sales-order';
import { OdooXmlRpcClient, defaultOdooXmlRpcClient } from './odoo-xmlrpc-client';
import { safeLogger } from '@/lib/logger';

const ORDER_FIELDS = [
  'id',
  'name',
  'partner_id',
  'date_order',
  'state',
  'amount_untaxed',
  'amount_tax',
  'amount_total',
  'currency_id',
  'payment_term_id',
  'user_id',
  'note',
  'order_line',
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

interface RawOrderRecord {
  id: number;
  name: string;
  partner_id: [number, string] | false;
  date_order: string | false;
  state: string;
  amount_untaxed: number;
  amount_tax: number;
  amount_total: number;
  currency_id?: [number, string] | false;
  payment_term_id?: [number, string] | false;
  user_id?: [number, string] | false;
  note?: string | false;
  order_line?: number[];
}

interface RawOrderLineRecord {
  id: number;
  product_id: [number, string] | false;
  name: string | false;
  product_uom_qty: number;
  price_unit: number;
  price_subtotal: number;
  discount?: number;
}

function mapOdooCurrencySymbol(currencyName = 'USD'): string {
  const code = currencyName.toUpperCase();
  if (code.includes('EGP')) return 'EGP ';
  if (code.includes('EUR')) return '€';
  if (code.includes('GBP')) return '£';
  if (code.includes('SAR')) return 'SAR ';
  if (code.includes('AED')) return 'AED ';
  return '$';
}

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

function mapRawLineToOrderLine(raw: RawOrderLineRecord): SalesOrderLine {
  let productId = 0;
  let productName = 'Unknown Item';

  if (Array.isArray(raw.product_id)) {
    productId = raw.product_id[0];
    productName = raw.product_id[1];
  } else if (typeof raw.name === 'string') {
    productName = raw.name.split('\n')[0];
  }

  return {
    id: raw.id,
    productId,
    productName,
    description: typeof raw.name === 'string' ? raw.name : undefined,
    productUomQty: raw.product_uom_qty || 1,
    priceUnit: raw.price_unit || 0,
    priceSubtotal: raw.price_subtotal || 0,
    discount: raw.discount || undefined,
  };
}

function mapRawOrderToSalesOrder(raw: RawOrderRecord, lines: SalesOrderLine[] = []): SalesOrder {
  let customerId = 0;
  let customerName = 'Unknown Customer';

  if (Array.isArray(raw.partner_id)) {
    customerId = raw.partner_id[0];
    customerName = raw.partner_id[1];
  }

  let currencySymbol = '$';
  if (Array.isArray(raw.currency_id) && typeof raw.currency_id[1] === 'string') {
    currencySymbol = mapOdooCurrencySymbol(raw.currency_id[1]);
  }

  let salesperson: string | undefined;
  if (Array.isArray(raw.user_id) && typeof raw.user_id[1] === 'string') {
    salesperson = raw.user_id[1];
  }

  let paymentTerm: string | undefined;
  if (Array.isArray(raw.payment_term_id) && typeof raw.payment_term_id[1] === 'string') {
    paymentTerm = raw.payment_term_id[1];
  }

  return {
    id: raw.id,
    name: raw.name || `SO-${raw.id}`,
    customerId,
    customerName,
    dateOrder: typeof raw.date_order === 'string' ? raw.date_order : new Date().toISOString(),
    state: normalizeState(raw.state),
    amountUntaxed: raw.amount_untaxed || 0,
    amountTax: raw.amount_tax || 0,
    amountTotal: raw.amount_total || 0,
    currencySymbol,
    paymentTerm,
    salesperson,
    lines,
    notes: typeof raw.note === 'string' ? raw.note : undefined,
  };
}

export class OdooXmlRpcSalesOrderService implements ISalesOrderService {
  private client: OdooXmlRpcClient;

  constructor(client: OdooXmlRpcClient = defaultOdooXmlRpcClient) {
    this.client = client;
  }

  private assertInternalAccess(): void {
    if (!this.client.isInternalUser()) {
      throw new Error('Access Denied: Portal users are not authorized to access internal sales orders.');
    }
  }

  async getSalesOrders(): Promise<SalesOrder[]> {
    this.assertInternalAccess();
    safeLogger.info('OdooXmlRpcSalesOrderService: fetching sales orders via XML-RPC');

    const orders = await this.client.executeKw<RawOrderRecord[]>(
      'sale.order',
      'search_read',
      [[]],
      {
        fields: ORDER_FIELDS,
        limit: 100,
        order: 'date_order desc',
      }
    );

    if (!Array.isArray(orders)) {
      return [];
    }

    return orders.map((o) => mapRawOrderToSalesOrder(o, []));
  }

  async getSalesOrderById(id: number | string): Promise<SalesOrder> {
    this.assertInternalAccess();
    safeLogger.info('OdooXmlRpcSalesOrderService: fetching sales order by id via XML-RPC:', id);

    const numericId = Number(id);
    if (!numericId || isNaN(numericId)) {
      throw new Error(`Invalid sales order ID: ${id}`);
    }

    const orderRows = await this.client.executeKw<RawOrderRecord[]>(
      'sale.order',
      'read',
      [[numericId]],
      { fields: ORDER_FIELDS }
    );

    if (!Array.isArray(orderRows) || orderRows.length === 0) {
      throw new Error(`Sales Order #${id} not found.`);
    }

    const rawOrder = orderRows[0];
    let lines: SalesOrderLine[] = [];

    if (Array.isArray(rawOrder.order_line) && rawOrder.order_line.length > 0) {
      try {
        const rawLines = await this.client.executeKw<RawOrderLineRecord[]>(
          'sale.order.line',
          'read',
          [rawOrder.order_line],
          { fields: ORDER_LINE_FIELDS }
        );

        if (Array.isArray(rawLines)) {
          lines = rawLines.map(mapRawLineToOrderLine);
        }
      } catch (err) {
        safeLogger.warn('OdooXmlRpcSalesOrderService: failed to load order lines:', err);
      }
    }

    return mapRawOrderToSalesOrder(rawOrder, lines);
  }

  async confirmQuotation(id: number | string): Promise<SalesOrder> {
    this.assertInternalAccess();
    safeLogger.info(`OdooXmlRpcSalesOrderService: confirming quotation #${id} via XML-RPC`);

    const numericId = Number(id);
    if (!numericId || isNaN(numericId)) {
      throw new Error(`Invalid sales order ID: ${id}`);
    }

    const currentOrder = await this.getSalesOrderById(numericId);
    if (currentOrder.state !== 'draft' && currentOrder.state !== 'sent') {
      throw new Error(
        `Quotation #${currentOrder.name} cannot be confirmed (current status: ${currentOrder.state}).`
      );
    }

    // Call action_confirm
    await this.client.executeKw<boolean>(
      'sale.order',
      'action_confirm',
      [[numericId]]
    );

    // Re-read order to confirm transition
    const confirmedOrder = await this.getSalesOrderById(numericId);
    if (confirmedOrder.state !== 'sale' && confirmedOrder.state !== 'done') {
      throw new Error(`Confirmation verification failed: order state remains "${confirmedOrder.state}"`);
    }

    safeLogger.info(`OdooXmlRpcSalesOrderService: successfully confirmed quotation #${id}`);
    return confirmedOrder;
  }
}
