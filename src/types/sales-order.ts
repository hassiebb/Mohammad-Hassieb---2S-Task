export type SalesOrderStatus = 'draft' | 'sent' | 'sale' | 'done' | 'cancel';

export interface SalesOrderLine {
  id: number;
  productId: number;
  productName: string;
  description?: string;
  productUomQty: number;
  priceUnit: number;
  priceSubtotal: number;
  discount?: number;
}

export interface SalesOrder {
  id: number;
  name: string; // e.g. "SO001"
  customerId: number;
  customerName: string;
  dateOrder: string;
  state: SalesOrderStatus;
  amountUntaxed: number;
  amountTax: number;
  amountTotal: number;
  currencySymbol: string;
  paymentTerm?: string;
  salesperson?: string;
  lines: SalesOrderLine[];
  notes?: string;
}

export interface ISalesOrderService {
  getSalesOrders(): Promise<SalesOrder[]>;
  getSalesOrderById(id: number | string): Promise<SalesOrder>;
  confirmQuotation(id: number | string): Promise<SalesOrder>;
}
