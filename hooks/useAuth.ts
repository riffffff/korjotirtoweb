'use client';

import { useState, useEffect } from 'react';

interface User {
    username: string;
    role: string;
}

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check localStorage for user data
        const username = localStorage.getItem('username');
        const role = localStorage.getItem('role');
        const token = localStorage.getItem('token');

        if (username && role && token) {
            setUser({ username, role });
            setIsAdmin(role === 'admin');
        } else {
            setUser(null);
            setIsAdmin(false);
        }

        setIsLoading(false);
    }, []);

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('role');
        setUser(null);
        setIsAdmin(false);
    };

    return {
        user,
        isAdmin,
        isLoading,
        isLoggedIn: !!user,
        logout,
    };
}
