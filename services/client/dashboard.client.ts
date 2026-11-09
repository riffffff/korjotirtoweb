import api from './api';
import type { DashboardStatsDTO } from '@/types';

export const dashboardClient = {
    getStats: async (): Promise<DashboardStatsDTO> => (await api.get('/dashboard')).data.data,
};
