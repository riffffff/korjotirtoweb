import api from "@/lib/api";
import { Payment } from "@/types";

export interface CustomerListItem {
    id: number;
    name: string;
    customerNumber: number;
    phone: string | null;
    totalBill: number;
    totalPaid: number;
    outstanding: number; // sisa tagihan (totalBill - totalPaid + penalties)
    balance: number;     // saldo simpanan (dari saveToBalance)
    lastNotifiedAt: string | null;
}

export interface BillHistoryItem {
    id: number;
    period: string;
    meterStart: number;
    meterEnd: number;
    usage: number;
    totalAmount: number;
    penalty: number;
    totalWithPenalty: number;
    amountPaid: number;
    remaining: number;
    paymentStatus: string;
    paidAt: string | null;
    items: Array<{
        type: string;
        usage: number;
        rate: number;
        amount: number;
    }>;
}

export interface CustomerDetail {
    customer: CustomerListItem;
    bills: BillHistoryItem[];
    payments: Payment[];
}

export interface DashboardStats {
    totalCustomers: number;
    totalRevenue: number;
    totalPaid: number;
    totalOutstanding: number;
    customersWithDebt: number;
    customersPaidFull: number;
    thisMonthBills: number;
    currentPeriod: string;
}

export const customerService = {
    // GET /customers - List all customers
    getAll: async (): Promise<CustomerListItem[]> => {
        const role = typeof window !== 'undefined' ? localStorage.getItem('role') : null;
        const res = await api.get(`/customers${role ? `?role=${role}` : ''}`);
        return res.data.data || [];
    },

    // GET /customers/:id - Get customer with bill history
    getById: async (id: number): Promise<CustomerDetail> => {
        const res = await api.get(`/customers/${id}`);
        return res.data.data;
    },

    // POST /customers - Create new customer
    create: async (data: { name: string; customerNumber: string; phone?: string }) => {
        const role = typeof window !== 'undefined' ? localStorage.getItem('role') : null;
        const res = await api.post('/customers', { ...data, role });
        return res.data;
    },

    // PUT /customers/:id - Update customer
    update: async (id: number, data: { name: string; phone?: string }) => {
        const role = typeof window !== 'undefined' ? localStorage.getItem('role') : null;
        const res = await api.put(`/customers/${id}`, { ...data, role });
        return res.data;
    },

    // DELETE /customers/:id - Soft delete customer
    delete: async (id: number) => {
        const role = typeof window !== 'undefined' ? localStorage.getItem('role') : null;
        const res = await api.delete(`/customers/${id}`, { data: { role } });
        return res.data;
    },

    // PATCH /customers/:id/pay - Pay customer (FIFO) with optional balance saving
    pay: async (id: number, amount: number, saveToBalance: number = 0) => {
        const role = typeof window !== 'undefined' ? localStorage.getItem('role') : null;
        const res = await api.patch(`/customers/${id}/pay`, { amount, role, saveToBalance });
        return res.data;
    },

    // PATCH /customers/:id/notify - Update last notified timestamp
    notify: async (id: number) => {
        const res = await api.patch(`/customers/${id}/notify`);
        return res.data;
    },

    // GET /dashboard - Get dashboard stats
    getDashboard: async (): Promise<DashboardStats> => {
        const res = await api.get('/dashboard');
        return res.data.data;
    },

    // POST /import - Import customers from Excel
    importFromExcel: async () => {
        const role = typeof window !== 'undefined' ? localStorage.getItem('role') : null;
        const res = await api.post('/import', { role });
        return res.data;
    },

    // DELETE /customers/clear - Clear all customer data
    clearAll: async () => {
        const role = typeof window !== 'undefined' ? localStorage.getItem('role') : null;
        const res = await api.delete('/customers/clear', {
            data: { role, confirmDelete: 'HAPUS_SEMUA' }
        });
        return res.data;
    },

    // DELETE /bills/:id - Soft delete a bill
    deleteBill: async (billId: number) => {
        const role = typeof window !== 'undefined' ? localStorage.getItem('role') : null;
        const res = await api.delete(`/bills/${billId}`, { data: { role } });
        return res.data;
    },

    // DELETE /bills/period/:period - Soft delete all bills for a period
    deleteBillsByPeriod: async (period: string) => {
        const role = typeof window !== 'undefined' ? localStorage.getItem('role') : null;
        const res = await api.delete(`/bills/period/${period}`, { data: { role } });
        return res.data;
    },
};
