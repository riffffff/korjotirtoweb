'use client';

import { useState, useEffect, useCallback } from 'react';
import { authClient } from '@/services/client/auth.client';

interface User {
    username: string;
    role: string;
}

let sessionCache: User | null | undefined;
let sessionRequest: Promise<User | null> | null = null;
const sessionListeners = new Set<(user: User | null) => void>();

function publishSession(user: User | null) {
    sessionCache = user;
    sessionListeners.forEach((listener) => listener(user));
}

export function setAuthSession(user: Pick<User, 'username' | 'role'>) {
    publishSession({ username: user.username, role: user.role });
}

export function clearAuthSession() {
    sessionRequest = null;
    publishSession(null);
}

export function invalidateAuthSession() {
    sessionCache = undefined;
    sessionRequest = null;
}

function loadSession(): Promise<User | null> {
    if (sessionCache !== undefined) return Promise.resolve(sessionCache);
    if (!sessionRequest) {
        sessionRequest = authClient.getSession()
            .then((session) => {
                const user: User = { username: session.username, role: session.role };
                publishSession(user);
                return user;
            })
            .catch(() => {
                publishSession(null);
                return null;
            })
            .finally(() => {
                sessionRequest = null;
            });
    }
    return sessionRequest;
}

export function useAuth() {
    const [user, setUser] = useState<User | null>(sessionCache ?? null);
    const [isLoading, setIsLoading] = useState(sessionCache === undefined);

    useEffect(() => {
        sessionListeners.add(setUser);
        if (sessionCache === undefined) {
            void loadSession().then((currentUser) => {
                setUser(currentUser);
                setIsLoading(false);
            });
        }
        return () => {
            sessionListeners.delete(setUser);
        };
    }, []);

    const logout = useCallback(async () => {
        try {
            await authClient.logout();
        } finally {
            clearAuthSession();
        }
    }, []);

    return {
        user,
        isAdmin: user?.role === 'admin',
        isLoading,
        isLoggedIn: !!user,
        logout,
    };
}
