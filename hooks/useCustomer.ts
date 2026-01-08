import { useState, useEffect, useCallback } from 'react';
import { customerService, CustomerListItem, CustomerDetail } from '@/services/customerService';

// Hook for fetching all customers
export function useCustomers() {
    const [customers, setCustomers] = useState<CustomerListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refetch = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await customerService.getAll();
            setCustomers(data);
        } catch (err) {
            setError('Gagal memuat data pelanggan');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refetch();
    }, [refetch]);

    return { customers, loading, error, refetch };
}

// Hook for fetching single customer with bill history
export function useCustomerDetail(id: number | null) {
    const [data, setData] = useState<CustomerDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refetch = useCallback(async () => {
        if (!id) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const result = await customerService.getById(id);
            setData(result);
        } catch (err) {
            setError('Gagal memuat data pelanggan');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        refetch();
    }, [refetch]);

    return {
        customer: data?.customer ?? null,
        bills: data?.bills ?? [],
        payments: data?.payments ?? [],
        loading,
        error,
        refetch,
    };
}
