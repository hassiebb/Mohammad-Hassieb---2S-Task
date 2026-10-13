import { ISalesOrderService, SalesOrder } from '@/types/sales-order';
import { INITIAL_MOCK_ORDERS } from './mock-data';
import { safeLogger } from '@/lib/logger';

export class MockSalesOrderService implements ISalesOrderService {
  private orders: SalesOrder[] = [...INITIAL_MOCK_ORDERS];

  async getSalesOrders(): Promise<SalesOrder[]> {
    safeLogger.info('MockSalesOrderService: getSalesOrders');
    await new Promise((resolve) => setTimeout(resolve, 300));
    return [...this.orders];
  }

  async getSalesOrderById(id: number | string): Promise<SalesOrder> {
    safeLogger.info('MockSalesOrderService: getSalesOrderById:', id);
    await new Promise((resolve) => setTimeout(resolve, 200));

    const numericId = Number(id);
    const order = this.orders.find((o) => o.id === numericId);

    if (!order) {
      throw new Error(`Sales Order #${id} not found.`);
    }

    return { ...order };
  }

  async confirmQuotation(id: number | string): Promise<SalesOrder> {
    safeLogger.info('MockSalesOrderService: confirmQuotation for id:', id);
    await new Promise((resolve) => setTimeout(resolve, 400));

    const numericId = Number(id);
    const index = this.orders.findIndex((o) => o.id === numericId);

    if (index === -1) {
      throw new Error(`Sales Order #${id} not found.`);
    }

    const current = this.orders[index];
    if (current.state !== 'draft' && current.state !== 'sent') {
      throw new Error(`Quotation #${current.name} cannot be confirmed (current state: ${current.state}).`);
    }

    const updated: SalesOrder = {
      ...current,
      state: 'sale',
    };

    this.orders[index] = updated;
    return { ...updated };
  }
}
