import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
    try {
        const { username, password } = await request.json();

        if (!username || !password) {
            return NextResponse.json(
                { error: 'Username dan password harus diisi' },
                { status: 400 }
            );
        }

        // Find user
        const user = await prisma.users.findUnique({
            where: { username },
        });

        if (!user) {
            return NextResponse.json(
                { error: 'Username atau password salah' },
                { status: 401 }
            );
        }

        // Check if user is active
        if (!user.is_active) {
            return NextResponse.json(
                { error: 'Akun tidak aktif' },
                { status: 401 }
            );
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            return NextResponse.json(
                { error: 'Username atau password salah' },
                { status: 401 }
            );
        }

        // Generate simple token (in production, use JWT)
        const token = Buffer.from(`${user.id}:${user.username}:${Date.now()}`).toString('base64');

        return NextResponse.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan saat login' },
            { status: 500 }
        );
    }
}
