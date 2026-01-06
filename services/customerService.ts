import api from "@/lib/api";

export interface CustomerListItem {
    id: number;
    name: string;
    customerNumber: number;
    phone: string | null;
    totalBill: number;
    totalPaid: number;
    outstandingBalance: number;
}

export interface BillHistoryItem {
    id: number;
    period: string;
    meterStart: number;
    meterEnd: number;
    usage: number;
    totalAmount: number;
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
}

export const customerService = {
    // GET /customers - List all customers
    getAll: async (): Promise<CustomerListItem[]> => {
        const res = await api.get('/customers');
        return res.data.data || [];
    },

    // GET /customers/:id - Get customer with bill history
    getById: async (id: number): Promise<CustomerDetail> => {
        const res = await api.get(`/customers/${id}`);
        return res.data.data;
    },

    // PATCH /customers/:id/pay - Pay customer (FIFO)
    pay: async (id: number, amount: number) => {
        const role = typeof window !== 'undefined' ? localStorage.getItem('role') : null;
        const res = await api.patch(`/customers/${id}/pay`, { amount, role });
        return res.data;
    },
};
