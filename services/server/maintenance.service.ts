import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function resetDevelopmentData() {
    await prisma.$executeRawUnsafe(
        'TRUNCATE TABLE "payments", "bill_items", "bills", "meter_readings", "customers", "settings", "users" CASCADE;',
    );

    await prisma.setting.createMany({
        data: [
            { key: 'RATE_K1', value: '1800', description: 'Tarif per m³ untuk 0-40m³' },
            { key: 'RATE_K2', value: '3000', description: 'Tarif per m³ untuk >40m³' },
            { key: 'ADMIN_FEE', value: '3000', description: 'Biaya admin bulanan' },
            { key: 'PENALTY_RATE', value: '5000', description: 'Denda keterlambatan' },
        ],
        skipDuplicates: true,
    });

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
}
