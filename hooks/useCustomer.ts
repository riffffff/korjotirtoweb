import { useState, useEffect, useCallback } from 'react';
import { customerService, CustomerListItem, CustomerDetail } from '@/services/customerService';

// In-memory cache for customer list
let customerListCache: CustomerListItem[] | null = null;
let customerListCacheTime = 0;

// In-memory cache for customer details
const customerDetailCache = new Map<number, { data: CustomerDetail; time: number }>();

// Cache expiry times
const LIST_CACHE_EXPIRY = 30 * 1000; // 30 seconds
const DETAIL_CACHE_EXPIRY = 60 * 1000; // 1 minute

/**
 * Hook for fetching all customers with caching
 */
export function useCustomers() {
    // Initialize with cached data if available
    const [customers, setCustomers] = useState<CustomerListItem[]>(() => customerListCache || []);
    const [loading, setLoading] = useState(() => !customerListCache);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async (force = false) => {
        const now = Date.now();
        
        // Use cache if valid and not forcing refresh
        if (!force && customerListCache && (now - customerListCacheTime) < LIST_CACHE_EXPIRY) {
            setCustomers(customerListCache);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            
            const data = await customerService.getAll();
            
            // Update cache
            customerListCache = data;
            customerListCacheTime = Date.now();
            
            setCustomers(data);
        } catch (err) {
            console.error('Failed to fetch customers:', err);
            setError('Gagal memuat data pelanggan');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Force refresh and clear cache
    const refetch = useCallback(() => {
        customerListCache = null;
        customerListCacheTime = 0;
        fetchData(true);
    }, [fetchData]);

    return { customers, loading, error, refetch };
}

/**
 * Hook for fetching single customer with bill history (with caching)
 */
export function useCustomerDetail(id: number | null) {
    const [data, setData] = useState<CustomerDetail | null>(() => {
        if (id && customerDetailCache.has(id)) {
            const cached = customerDetailCache.get(id)!;
            if (Date.now() - cached.time < DETAIL_CACHE_EXPIRY) {
                return cached.data;
            }
        }
        return null;
    });
    const [loading, setLoading] = useState(() => {
        if (!id) return false;
        const cached = customerDetailCache.get(id);
        return !cached || (Date.now() - cached.time) >= DETAIL_CACHE_EXPIRY;
    });
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async (force = false) => {
        if (!id) {
            setLoading(false);
            return;
        }

        const now = Date.now();
        const cached = customerDetailCache.get(id);

        // Use cache if valid and not forcing
        if (!force && cached && (now - cached.time) < DETAIL_CACHE_EXPIRY) {
            setData(cached.data);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            
            const result = await customerService.getById(id);
            
            // Update cache
            customerDetailCache.set(id, { data: result, time: Date.now() });
            
            setData(result);
        } catch (err) {
            console.error('Failed to fetch customer detail:', err);
            setError('Gagal memuat data pelanggan');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Force refresh
    const refetch = useCallback(() => {
        if (id) {
            customerDetailCache.delete(id);
        }
        fetchData(true);
    }, [id, fetchData]);

    return {
        customer: data?.customer ?? null,
        bills: data?.bills ?? [],
        payments: data?.payments ?? [],
        loading,
        error,
        refetch,
    };
}

/**
 * Utility to clear all caches (call after import/delete operations)
 */
export function clearCustomerCaches() {
    customerListCache = null;
    customerListCacheTime = 0;
    customerDetailCache.clear();
}
