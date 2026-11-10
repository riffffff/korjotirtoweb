import { NextRequest, NextResponse } from 'next/server';
import { authCookie, createSessionToken } from '@/lib/auth';
import { authenticateAdmin } from '@/services/server/auth.service';
import { getClientIp, loginRateLimiter } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
    try {
        const clientIp = getClientIp(request);
        const blockStatus = loginRateLimiter.isBlocked(clientIp);
        if (blockStatus.blocked) {
            const minutes = Math.ceil(blockStatus.retryAfterSeconds / 60);
            return NextResponse.json(
                { error: `Terlalu banyak percobaan login gagal. Silakan coba lagi dalam ${minutes} menit.` },
                {
                    status: 429,
                    headers: { 'Retry-After': String(blockStatus.retryAfterSeconds) },
                }
            );
        }

        const { username, password } = await request.json();

        if (!username || !password) {
            return NextResponse.json(
                { error: 'Username dan password harus diisi' },
                { status: 400 }
            );
        }

        const user = await authenticateAdmin(username, password);
        if (!user) {
            const failStatus = loginRateLimiter.recordFailure(clientIp);
            if (failStatus.blocked) {
                const minutes = Math.ceil(failStatus.retryAfterSeconds / 60);
                return NextResponse.json(
                    { error: `Terlalu banyak percobaan login gagal. Akses dibatasi sementara selama ${minutes} menit.` },
                    {
                        status: 429,
                        headers: { 'Retry-After': String(failStatus.retryAfterSeconds) },
                    }
                );
            }
            return NextResponse.json(
                { error: 'Username atau password salah' },
                { status: 401 }
            );
        }

        loginRateLimiter.recordSuccess(clientIp);

        const token = createSessionToken({
            sub: user.id.toString(),
            username: user.username,
            role: 'admin',
        });

        const response = NextResponse.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role,
            },
        });
        response.cookies.set({
            name: authCookie.name,
            value: token,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: authCookie.maxAge,
        });
        return response;
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan saat login' },
            { status: 500 }
        );
    }
}
