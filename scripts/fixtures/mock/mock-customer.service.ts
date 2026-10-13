import { Customer, ICustomerService } from '@/types/customer';
import { INITIAL_MOCK_CUSTOMERS } from './mock-data';
import { safeLogger } from '@/lib/logger';
import { validatePhoneNumber } from '@/lib/validation';

export class MockCustomerService implements ICustomerService {
  private customers: Customer[] = [...INITIAL_MOCK_CUSTOMERS];

  async getCustomers(query?: string): Promise<Customer[]> {
    safeLogger.info('MockCustomerService: getCustomers query:', query);
    // Simulate brief network latency
    await new Promise((resolve) => setTimeout(resolve, 300));

    if (!query || !query.trim()) {
      return [...this.customers];
    }

    const q = query.trim().toLowerCase();
    return this.customers.filter((c) => {
      const matchName = c.name.toLowerCase().includes(q);
      const matchDisplayName = c.displayName?.toLowerCase().includes(q);
      const matchCity = c.city?.toLowerCase().includes(q);
      const matchPhone = c.phone?.toLowerCase().includes(q) || c.mobile?.toLowerCase().includes(q);
      return matchName || matchDisplayName || matchCity || matchPhone;
    });
  }

  async getCustomerById(id: number | string): Promise<Customer> {
    safeLogger.info('MockCustomerService: getCustomerById:', id);
    await new Promise((resolve) => setTimeout(resolve, 200));

    const numericId = Number(id);
    const customer = this.customers.find((c) => c.id === numericId);

    if (!customer) {
      throw new Error(`Customer with ID ${id} not found.`);
    }

    return { ...customer };
  }

  async updateCustomerPhone(id: number | string, phone: string): Promise<Customer> {
    safeLogger.info('MockCustomerService: updateCustomerPhone for id:', id);
    await new Promise((resolve) => setTimeout(resolve, 350));

    const validation = validatePhoneNumber(phone);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid phone number format');
    }

    const numericId = Number(id);
    const index = this.customers.findIndex((c) => c.id === numericId);

    if (index === -1) {
      throw new Error(`Customer with ID ${id} not found.`);
    }

    const updated: Customer = {
      ...this.customers[index],
      phone: phone.trim(),
    };

    this.customers[index] = updated;
    return { ...updated };
  }
}
