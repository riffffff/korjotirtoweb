import { NextRequest, NextResponse } from 'next/server';
import { authCookie, createSessionToken } from '@/lib/auth';
import { authenticateAdmin } from '@/services/server/auth.service';

export async function POST(request: NextRequest) {
    try {
        const { username, password } = await request.json();

        if (!username || !password) {
            return NextResponse.json(
                { error: 'Username dan password harus diisi' },
                { status: 400 }
            );
        }

        const user = await authenticateAdmin(username, password);
        if (!user) {
            return NextResponse.json(
                { error: 'Username atau password salah' },
                { status: 401 }
            );
        }

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
