import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    // Simple protection
    if (key !== 'korjo-reset-2026') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // 1. Reset Database
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "payments", "bill_items", "bills", "meter_readings", "customers", "settings", "users" RESTART IDENTITY CASCADE;`);
        
        // 2. Create Settings
        await prisma.setting.createMany({
            data: [
                { key: 'RATE_K1', value: '1800', description: 'Tarif per m³ untuk 0-40m³' },
                { key: 'RATE_K2', value: '3000', description: 'Tarif per m³ untuk >40m³' },
                { key: 'ADMIN_FEE', value: '3000', description: 'Biaya admin bulanan' },
                { key: 'PENALTY_RATE', value: '5000', description: 'Denda keterlambatan' },
            ],
            skipDuplicates: true,
        });

        // 3. Create Admin
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await prisma.users.create({
            data: {
                username: 'admin',
                password: hashedPassword,
                name: 'Administrator',
                role: 'admin',
                is_active: true,
            },
        });

        return NextResponse.json({ success: true, message: 'Database reset specific tables, IDs restarted, and Admin recreated' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
