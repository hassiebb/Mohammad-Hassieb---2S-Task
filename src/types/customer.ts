export interface Customer {
  id: number;
  name: string;
  displayName: string;
  email: string;
  phone: string;
  mobile?: string;
  street?: string;
  city: string;
  state?: string;
  zip?: string;
  country?: string;
  isCompany: boolean;
  totalOrders?: number;
  totalInvoiced?: number;
  avatarUrl?: string;
  isCached?: boolean;
  hasPendingUpdate?: boolean;
  pendingPhone?: string;
  cachedAt?: string;
}

export interface CustomerUpdateInput {
  phone: string;
}

export interface ICustomerService {
  getCustomers(query?: string): Promise<Customer[]>;
  getCustomerById(id: number | string): Promise<Customer>;
  updateCustomerPhone(id: number | string, phone: string): Promise<Customer>;
}
