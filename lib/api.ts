import axios from "axios";

/**
 * API Client Configuration
 * 
 * Pilihan baseURL:
 * - '/api'                    → Next.js API Routes (fullstack, same-origin)
 * - 'http://localhost:3001'   → NestJS Backend (external server)
 * 
 * Saat ini: Menggunakan Next.js API Routes
 */
const api = axios.create({
    baseURL: '/api'
    // baseURL: 'http://localhost:3001'  // Uncomment untuk pakai NestJS
})

// Interceptor untuk menambahkan token JWT di setiap request
api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    return config
});

export default api;