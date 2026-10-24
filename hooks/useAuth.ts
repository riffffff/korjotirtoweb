'use client';

import { useState, useEffect } from 'react';
import api from '@/services/client/api';
import { authClient } from '@/services/client/auth.client';

interface User {
    username: string;
    role: string;
}

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadSession = async () => {
            try {
                const response = await api.get('/auth/session');
                const session = response.data.data;
                setUser({ username: session.username, role: session.role });
                setIsAdmin(session.role === 'admin');
            } catch {
                setUser(null);
                setIsAdmin(false);
            } finally {
                setIsLoading(false);
            }
        };
        void loadSession();
    }, []);

    const logout = async () => {
        try {
            await authClient.logout();
        } finally {
            setUser(null);
            setIsAdmin(false);
        }
    };

    return {
        user,
        isAdmin,
        isLoading,
        isLoggedIn: !!user,
        logout,
    };
}
