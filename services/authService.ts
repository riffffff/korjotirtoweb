import api from "@/lib/api";

export const authService = {
    login: async (username: string, password: string) => {
        const res = await api.post('/auth/login', { username, password });
        return res.data;
    },

    verifyPassword: async (password: string) => {
        const username = localStorage.getItem('username');
        await api.post('/auth/login', { username, password });
        return true;
    },
}