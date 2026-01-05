import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface LoginResult {
    success: boolean;
    user?: {
        id: number;
        username: string;
        name: string;
        role: string;
    };
}

export function useLogin() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent): Promise<LoginResult> => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Login gagal');
            }

            // Save to localStorage
            localStorage.setItem('token', data.token);
            localStorage.setItem('username', data.user.username);
            localStorage.setItem('role', data.user.role);

            // Redirect to admin dashboard
            router.push('/admin');

            return { success: true, user: data.user };
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan';
            setError(errorMessage);
            return { success: false };
        } finally {
            setLoading(false);
        }
    };

    const clearError = () => setError('');

    return {
        username,
        setUsername,
        password,
        setPassword,
        error,
        loading,
        handleLogin,
        clearError,
    };
}
