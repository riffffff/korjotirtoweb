import { NextResponse } from 'next/server';
import { authCookie } from '@/lib/auth';

export async function POST() {
    const response = NextResponse.json({ success: true });
    response.cookies.set({
        name: authCookie.name,
        value: '',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
    });
    return response;
}
