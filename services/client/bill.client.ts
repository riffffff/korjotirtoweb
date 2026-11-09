import api from './api';
import type { PeriodBillDetailDTO } from '@/types';

export const billClient = {
    createForCustomer: async (customerId: string, data: { period: string; meterStart?: number; meterEnd: number }) =>
        (await api.post(`/customers/${customerId}/bills`, data)).data,
    createBulkByPeriod: async (period: string) =>
        (await api.post('/bills/create', { period })).data,
    getByPeriod: async (period: string): Promise<{ period: string; totalBills: number; paid: PeriodBillDetailDTO[]; unpaid: PeriodBillDetailDTO[] }> =>
        (await api.get(`/bills/period/${period}`)).data.data,
    deleteById: async (billId: string) => (await api.delete(`/bills/${billId}`)).data,
    deleteByPeriod: async (period: string) => (await api.delete(`/bills/period/${period}`)).data,
};
