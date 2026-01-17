import { useState, useEffect, useCallback } from 'react';

// In-memory cache for settings
let settingsCache: Record<string, string> | null = null;
let settingsCacheTime = 0;
const CACHE_EXPIRY = 2 * 60 * 1000; // 2 minutes (settings rarely change)

/**
 * Hook for fetching settings with caching
 */
export function useSettings() {
    // Initialize with cached data if available and valid
    const [settings, setSettings] = useState<Record<string, string>>(() => {
        if (settingsCache && (Date.now() - settingsCacheTime) < CACHE_EXPIRY) {
            return settingsCache;
        }
        return {};
    });
    const [loading, setLoading] = useState(() => {
        // Only show loading if no valid cache
        return !settingsCache || (Date.now() - settingsCacheTime) >= CACHE_EXPIRY;
    });
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async (force = false) => {
        const now = Date.now();
        
        // Use cache if valid and not forcing refresh
        if (!force && settingsCache && (now - settingsCacheTime) < CACHE_EXPIRY) {
            setSettings(settingsCache);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            
            const res = await fetch('/api/settings');
            const result = await res.json();
            
            if (result.success) {
                // Update cache
                settingsCache = result.data || {};
                settingsCacheTime = Date.now();
                setSettings(result.data || {});
            } else {
                setError(result.error || 'Gagal memuat pengaturan');
            }
        } catch (err) {
            console.error('Failed to fetch settings:', err);
            setError('Gagal memuat pengaturan');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Update local settings (for form editing)
    const updateSettings = useCallback((key: string, value: string) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    }, []);

    // Force refresh and clear cache
    const refetch = useCallback(() => {
        settingsCache = null;
        settingsCacheTime = 0;
        fetchData(true);
    }, [fetchData]);
    
    // Invalidate cache (call after save)
    const invalidateCache = useCallback(() => {
        settingsCache = null;
        settingsCacheTime = 0;
    }, []);

    // Update cache after successful save
    const updateCache = useCallback((newSettings: Record<string, string>) => {
        settingsCache = newSettings;
        settingsCacheTime = Date.now();
        setSettings(newSettings);
    }, []);

    return { settings, loading, error, updateSettings, refetch, invalidateCache, updateCache };
}

/**
 * Utility to clear settings cache
 */
export function clearSettingsCache() {
    settingsCache = null;
    settingsCacheTime = 0;
}
