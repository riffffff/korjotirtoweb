import api from './api';

export const authClient = {
    login: async (username: string, password: string) => {
        const response = await api.post('/auth/login', { username, password });
        return response.data;
    },

    verifyPassword: async (password: string) => {
        const response = await api.post('/auth/verify', { password });
        return response.data;
    },

    logout: async () => {
        const response = await api.post('/auth/logout');
        return response.data;
    },
};
