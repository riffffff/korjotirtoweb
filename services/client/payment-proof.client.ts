import api from './api';

export interface PaymentProofCustomer {
    id: string;
    name: string;
    customerNumber: number;
    phone: string | null;
}

export interface PaymentProof {
    id: string;
    customerId: string;
    phone: string;
    amount: number;
    proofUrl: string;
    originalName: string | null;
    mimeType: string;
    note: string | null;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    rejectionReason: string | null;
    verifiedAt: string | null;
    notifiedAt: string | null;
    createdAt: string;
    customer: PaymentProofCustomer;
}

export interface CustomerPaymentProofStatus {
    id: string;
    phone: string;
    amount: number;
    status: PaymentProof['status'];
    rejectionReason: string | null;
    createdAt: string;
}

export const paymentProofClient = {
    create: async (data: {
        customerId: string;
        phone: string;
        amount: number;
        proof: File;
        note?: string;
    }) => {
        const formData = new FormData();
        formData.append('customerId', data.customerId);
        formData.append('phone', data.phone);
        formData.append('amount', String(data.amount));
        formData.append('proof', data.proof);
        if (data.note) formData.append('note', data.note);
        return (await api.post('/payment-proofs', formData)).data;
    },
    list: async (status?: string): Promise<PaymentProof[]> =>
        (await api.get('/payment-proofs', { params: status ? { status } : undefined })).data.data || [],
    latestForCustomer: async (customerId: string): Promise<CustomerPaymentProofStatus | null> =>
        (await api.get('/payment-proofs', { params: { customerId } })).data.data || null,
    approve: async (id: string) => (await api.post(`/payment-proofs/${id}/approve`)).data,
    reject: async (id: string, reason: string) =>
        (await api.post(`/payment-proofs/${id}/reject`, { reason })).data,
    notify: async (id: string): Promise<PaymentProof> =>
        (await api.patch(`/payment-proofs/${id}/notify`)).data.data,
};
