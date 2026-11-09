import api from './api';

export const settingClient = {
    getAll: async (): Promise<Record<string, string>> => (await api.get('/settings')).data.data || {},
    update: async (settings: Record<string, string>) => (await api.put('/settings', { settings })).data,
};
