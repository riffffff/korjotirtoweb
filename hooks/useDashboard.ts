import { useState, useEffect, useCallback } from 'react';
import { dashboardClient } from '@/services/client/dashboard.client';

interface PeriodStats {
    period: string;
    periodLabel: string;
    totalBills: number;
    paidCount: number;
    payingCustomerCount: number;
    unpaidCount: number;
}

export interface DashboardData {
    totalCustomers: number;
    totalRevenue?: number;
    totalOutstanding: number;
    periods: PeriodStats[];
}

// In-memory cache for dashboard data
let dashboardCache: DashboardData | null = null;
let dashboardCacheTime = 0;
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

/**
 * Hook for fetching dashboard data with stale-while-revalidate caching
 */
export function useDashboard() {
    // Show cached data immediately if available
    const [data, setData] = useState<DashboardData | null>(() => dashboardCache);
    const [loading, setLoading] = useState(() => !dashboardCache);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async (force = false) => {
        const now = Date.now();
        
        // Use cache if fresh and not forcing refresh
        if (!force && dashboardCache && (now - dashboardCacheTime) < CACHE_EXPIRY) {
            setData(dashboardCache);
            setLoading(false);
            return;
        }

        try {
            // Only show skeleton if we have NO data in cache yet
            if (!dashboardCache) {
                setLoading(true);
            }
            setError(null);
            
            const result = await dashboardClient.getStats();
            dashboardCache = result;
            dashboardCacheTime = Date.now();
            setData(result);
        } catch (err) {
            console.error('Failed to fetch dashboard:', err);
            if (!dashboardCache) {
                setError('Gagal memuat dashboard');
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
        dashboardCache = null;
        dashboardCacheTime = 0;
        fetchData(true);
    }, [fetchData]);

    return { data, loading, error, refetch };
}

/**
 * Utility to clear dashboard cache
 */
export function clearDashboardCache() {
    dashboardCache = null;
    dashboardCacheTime = 0;
}
