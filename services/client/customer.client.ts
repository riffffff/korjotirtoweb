import api from './api';
import type {
    BillDTO,
    CustomerDetailDTO,
    CustomerSummaryDTO,
    DashboardStatsDTO,
    PaymentHistoryDTO,
} from '@/types';

export type CustomerListItem = CustomerSummaryDTO;
export type BillHistoryItem = BillDTO;
export type CustomerDetail = CustomerDetailDTO;
export type DashboardStats = DashboardStatsDTO;

export const customerClient = {
    getAll: async (): Promise<CustomerListItem[]> => (await api.get('/customers')).data.data || [],
    getById: async (id: string): Promise<CustomerDetail> => (await api.get(`/customers/${id}`)).data.data,
    create: async (data: { name: string; phone?: string }) => (await api.post('/customers', data)).data,
    update: async (id: string, data: { name: string; phone?: string }) => (await api.put(`/customers/${id}`, data)).data,
    delete: async (id: string) => (await api.delete(`/customers/${id}`)).data,
    pay: async (id: string, amount: number, saveToBalance = 0, balanceUsed = 0) =>
        (await api.patch(`/customers/${id}/pay`, { amount, saveToBalance, balanceUsed })).data,
    notify: async (id: string) => (await api.patch(`/customers/${id}/notify`)).data,
    getDashboard: async (): Promise<DashboardStats> => (await api.get('/dashboard')).data.data,
    clearAll: async () => (await api.delete('/customers/clear', { data: { confirmDelete: 'HAPUS_SEMUA' } })).data,
    deleteBill: async (billId: string) => (await api.delete(`/bills/${billId}`)).data,
    deleteBillsByPeriod: async (period: string) => (await api.delete(`/bills/period/${period}`)).data,
};

export type { PaymentHistoryDTO };
