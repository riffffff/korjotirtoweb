import { NextRequest } from 'next/server';
import { AuthError, requireAdmin } from '@/lib/auth';
import { errorResponse, successResponse } from '@/lib/api-response';
import { verifyAdminPassword } from '@/services/server/auth.service';

export async function POST(request: NextRequest) {
    try {
        const session = requireAdmin(request);
        const body = await request.json() as { password?: unknown };
        if (typeof body.password !== 'string' || body.password.length === 0) {
            return errorResponse('Password harus diisi', 400);
        }

        if (!(await verifyAdminPassword(session.sub, body.password))) {
            return errorResponse('Password salah', 401);
        }
        return successResponse({ verified: true });
    } catch (error) {
        if (error instanceof AuthError) return errorResponse(error.message, error.status);
        console.error('Password verification error:', error);
        return errorResponse('Gagal memverifikasi password', 500);
    }
}
