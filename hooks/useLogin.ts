import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/services/client/auth.client';

interface LoginResult {
    success: boolean;
    user?: {
        id: string;
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
            const data = await authClient.login(username, password);

            router.push('/');

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
