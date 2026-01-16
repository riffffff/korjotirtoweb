import { useState, useEffect, useCallback, useRef } from 'react';
import { customerService, CustomerListItem, CustomerDetail } from '@/services/customerService';

// Cache object for customer list (persists across navigation)
const customerCache: {
    data: CustomerListItem[] | null;
    timestamp: number;
} = {
    data: null,
    timestamp: 0,
};

// Cache expiry: 30 seconds
const CACHE_EXPIRY = 30 * 1000;

// Hook for fetching all customers with caching
export function useCustomers() {
    const [customers, setCustomers] = useState<CustomerListItem[]>(customerCache.data || []);
    const [loading, setLoading] = useState(!customerCache.data);
    const [error, setError] = useState<string | null>(null);
    const isMounted = useRef(true);

    const refetch = useCallback(async (forceRefresh = false) => {
        // Check cache validity
        const now = Date.now();
        if (!forceRefresh && customerCache.data && (now - customerCache.timestamp) < CACHE_EXPIRY) {
            setCustomers(customerCache.data);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const data = await customerService.getAll();

            // Update cache
            customerCache.data = data;
            customerCache.timestamp = Date.now();

            if (isMounted.current) {
                setCustomers(data);
            }
        } catch (err) {
            if (isMounted.current) {
                setError('Gagal memuat data pelanggan');
            }
            console.error(err);
        } finally {
            if (isMounted.current) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        isMounted.current = true;
        refetch();
        return () => {
            isMounted.current = false;
        };
    }, [refetch]);

    // Force refresh function for when data changes
    const forceRefresh = useCallback(() => {
        customerCache.data = null;
        customerCache.timestamp = 0;
        refetch(true);
    }, [refetch]);

    return { customers, loading, error, refetch: forceRefresh };
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
