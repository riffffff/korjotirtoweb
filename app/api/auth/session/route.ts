import { NextRequest } from 'next/server';
import { errorResponse, successResponse } from '@/lib/api-response';
import { AuthError, verifySessionRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        const session = verifySessionRequest(request);
        return successResponse({
            username: session.username,
            role: session.role,
        });
    } catch (error) {
        if (error instanceof AuthError) return errorResponse(error.message, error.status);
        console.error('Session verification error:', error);
        return errorResponse('Gagal memverifikasi sesi', 500);
    }
}
