import api from "@/lib/api";
import { BillPeriodResponse, BillDetail, BillHistoryResponse, PayBillRequest } from "@/types";

export interface BillFilters {
    month?: string;
    year?: string;
    search?: string;
}

export interface BillListResponse {
    month: string;
    year: string;
    period: string;
    search: string | null;
    data: BillPeriodResponse['data'];
}

export const billService = {
    // GET /bills - List bills with filters
    getAll: async (filters?: BillFilters): Promise<BillListResponse> => {
        const params = new URLSearchParams();
        if (filters?.month) params.append('month', filters.month);
        if (filters?.year) params.append('year', filters.year);
        if (filters?.search) params.append('search', filters.search);

        const res = await api.get(`/bills?${params.toString()}`);
        return res.data.data || res.data;
    },

    // GET /bills/period/:period - List bills per period
    getByPeriod: async (period: string): Promise<BillPeriodResponse> => {
        const res = await api.get(`/bills/period/${period}`);
        const data = res.data.data || res.data || [];
        return { period, data };
    },

    // GET /bills/:id - Get bill detail
    getById: async (id: number): Promise<BillDetail> => {
        const res = await api.get(`/bills/${id}`);
        return res.data.data || res.data;
    },

    // GET /bills/customer/:customerId - Get bill history
    getByCustomer: async (customerId: number): Promise<BillHistoryResponse> => {
        const res = await api.get(`/bills/customer/${customerId}`);
        return res.data.data || res.data;
    },

    // GET /customers/:customerId/bills/:year/:month - Get bill by customer + period
    getByCustomerPeriod: async (customerId: number, year: string, month: string): Promise<BillDetail> => {
        const res = await api.get(`/customers/${customerId}/bills/${year}/${month}`);
        return res.data.data || res.data;
    },

    // PATCH /bills/:id/pay - Pay bill (admin only)
    pay: async (id: number, data: PayBillRequest) => {
        const role = typeof window !== 'undefined' ? localStorage.getItem('role') : null;
        const res = await api.patch(`/bills/${id}/pay`, { ...data, role });
        return res.data.data || res.data;
    },
};