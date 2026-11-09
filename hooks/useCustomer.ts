import { useState, useEffect, useCallback } from 'react';
import { customerClient, CustomerListItem, CustomerDetail } from '@/services/client/customer.client';
import { clearDashboardCache } from './useDashboard';

// In-memory cache for customer list
let customerListCache: CustomerListItem[] | null = null;
let customerListCacheTime = 0;

// In-memory cache for customer details
const customerDetailCache = new Map<string, { data: CustomerDetail; time: number }>();

// Cache expiry times (Stale-While-Revalidate: data is shown instantly, revalidated in background)
const LIST_CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
const DETAIL_CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

/**
 * Hook for fetching all customers with caching
 */
export function useCustomers() {
    // Show cached data immediately if available
    const [customers, setCustomers] = useState<CustomerListItem[]>(() => customerListCache || []);
    const [loading, setLoading] = useState(() => !customerListCache);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async (force = false) => {
        const now = Date.now();
        
        // Use cache if fresh and not forcing refresh
        if (!force && customerListCache && (now - customerListCacheTime) < LIST_CACHE_EXPIRY) {
            setCustomers(customerListCache);
            setLoading(false);
            return;
        }

        try {
            // Only show skeleton on first load when no cache exists
            if (!customerListCache) {
                setLoading(true);
            }
            setError(null);
            
            const data = await customerClient.getAll();
            
            // Update cache
            customerListCache = data;
            customerListCacheTime = Date.now();
            
            setCustomers(data);
        } catch (err) {
            console.error('Failed to fetch customers:', err);
            if (!customerListCache) {
                setError('Gagal memuat data pelanggan');
            }
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
export function useCustomerDetail(id: string | null) {
    const [data, setData] = useState<CustomerDetail | null>(() => {
        if (id && customerDetailCache.has(id)) {
            return customerDetailCache.get(id)!.data;
        }
        return null;
    });
    const [loading, setLoading] = useState(() => {
        if (!id) return false;
        return !customerDetailCache.has(id);
    });
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async (force = false) => {
        if (!id) {
            setLoading(false);
            return;
        }

        const now = Date.now();
        const cached = customerDetailCache.get(id);

        // Use cache if fresh and not forcing
        if (!force && cached && (now - cached.time) < DETAIL_CACHE_EXPIRY) {
            setData(cached.data);
            setLoading(false);
            return;
        }

        try {
            // Only show skeleton if customer is not in cache yet
            if (!cached) {
                setLoading(true);
            }
            setError(null);
            
            const result = await customerClient.getById(id);
            
            // Update cache
            customerDetailCache.set(id, { data: result, time: Date.now() });
            
            setData(result);
        } catch (err) {
            console.error('Failed to fetch customer detail:', err);
            if (!cached) {
                setError('Gagal memuat data pelanggan');
            }
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
 * Also clears dashboard cache to keep stats in sync
 */
export function clearCustomerCaches() {
    customerListCache = null;
    customerListCacheTime = 0;
    customerDetailCache.clear();
    // Also clear dashboard cache to sync stats
    clearDashboardCache();
}
