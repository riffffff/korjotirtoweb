import { NextRequest } from 'next/server';
import { errorResponse, successResponse } from '@/lib/api-response';
import { AuthError, verifySessionRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        const session = verifySessionRequest(request);
        return successResponse({
            authenticated: true,
            username: session.username,
            role: session.role,
        });
    } catch (error) {
        if (error instanceof AuthError) {
            return successResponse({
                authenticated: false,
                username: null,
                role: null,
            });
        }
        console.error('Session verification error:', error);
        return errorResponse('Gagal memverifikasi sesi', 500);
    }
}
