import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { Pool } from 'pg';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath, override: true });
} else {
    dotenv.config();
}

const rawConnectionString = process.env.DIRECT_URL || process.env.DATABASE_URL || '';
if (rawConnectionString.includes('ckdyaepuvgrxjbkchrpw')) {
    console.error('🚨 SAFETY BLOCK: Dilarang menjalankan seed/truncate pada database PRODUCTION (ckdyaepuvgrxjbkchrpw)!');
    process.exit(1);
}

const connectionString = rawConnectionString.replace(/[?&]pgbouncer=true/g, '');
const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('supabase.com') ? { rejectUnauthorized: false } : undefined,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('Starting seed...');

    // Clear existing data (optional - comment out if you want to keep existing data)
    // Clear existing data AND reset IDs (Restart Identity)
    try {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "audit_logs", "payments", "bill_items", "bills", "meter_readings", "customers", "settings", "users" RESTART IDENTITY CASCADE;`);
        console.log('Database cleared and IDs reset.');
    } catch (error) {
        console.error('Error truncating tables:', error);
        // Fallback for non-Postgres or permissions issues
        await prisma.payment.deleteMany();
        await prisma.billItem.deleteMany();
        await prisma.bill.deleteMany();
        await prisma.meterReading.deleteMany();
        await prisma.customer.deleteMany();
        await prisma.setting.deleteMany();
        await prisma.users.deleteMany();
    }

    // 1. Create Settings
    const settings = await prisma.setting.createMany({
        data: [
            { key: 'RATE_K1', value: '1800', description: 'Tarif per m³ untuk 0-40m³' },
            { key: 'RATE_K2', value: '3000', description: 'Tarif per m³ untuk >40m³' },
            { key: 'ADMIN_FEE', value: '3000', description: 'Biaya admin bulanan' },
            { key: 'PENALTY_RATE', value: '5000', description: 'Denda keterlambatan' },
        ],
        skipDuplicates: true,
    });
    console.log(`Created ${settings.count} settings`);

    // 2. Create Admin User
    const existingAdmin = await prisma.users.findUnique({
        where: { username: 'admin' },
    });

    if (!existingAdmin) {
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
        console.log('Created admin user (username: admin, password: admin123)');
    } else {
        console.log('Admin user already exists');
    }

    // 3. Create 10 customers and deterministic 8-month billing history.
    const customersData = [
        { name: 'Nasekun', phone: '085227797555', balance: 0 },
        { name: 'Siti Fauziyah', phone: '085643222417', balance: 25000 },
        { name: 'Ma\'rifatul Mentul', phone: '085726106702', balance: 0 },
        { name: 'Agus Pratama', phone: '085869669377', balance: 0 },
        { name: 'Budi Santoso', phone: '081234567890', balance: 15000 },
        { name: 'Dewi Lestari', phone: '082233445566', balance: 0 },
        { name: 'Fajar Hidayat', phone: '083344556677', balance: 30000 },
        { name: 'Rina Kartika', phone: '084455667788', balance: 0 },
        { name: 'Wahyu Setiawan', phone: '085566778899', balance: 10000 },
    ];
    const periods = [
        '2026-03', '2026-04', '2026-05', '2026-06',
        '2026-07', '2026-08', '2026-09', '2026-10',
    ];
    // FIFO-consistent histories: once a customer has an outstanding bill,
    // later periods cannot be PAID before that older bill is settled.
    const statusPatterns = [
        ['PAID', 'PAID', 'PAID', 'PARTIAL', 'UNPAID', 'UNPAID', 'UNPAID', 'UNPAID'],
        ['PAID', 'PARTIAL', 'PARTIAL', 'UNPAID', 'UNPAID', 'UNPAID', 'UNPAID', 'UNPAID'],
        ['UNPAID', 'UNPAID', 'UNPAID', 'UNPAID', 'UNPAID', 'UNPAID', 'UNPAID', 'UNPAID'],
        ['PAID', 'PAID', 'PAID', 'PAID', 'PAID', 'PAID', 'PAID', 'PAID'],
        ['PARTIAL', 'PARTIAL', 'UNPAID', 'UNPAID', 'UNPAID', 'UNPAID', 'UNPAID', 'UNPAID'],
        ['PAID', 'UNPAID', 'UNPAID', 'UNPAID', 'UNPAID', 'UNPAID', 'UNPAID', 'UNPAID'],
        ['PAID', 'PAID', 'PARTIAL', 'UNPAID', 'UNPAID', 'UNPAID', 'UNPAID', 'UNPAID'],
        ['UNPAID', 'UNPAID', 'UNPAID', 'UNPAID', 'UNPAID', 'UNPAID', 'UNPAID', 'UNPAID'],
        ['PAID', 'PARTIAL', 'UNPAID', 'UNPAID', 'UNPAID', 'UNPAID', 'UNPAID', 'UNPAID'],
        ['PARTIAL', 'UNPAID', 'UNPAID', 'UNPAID', 'UNPAID', 'UNPAID', 'UNPAID', 'UNPAID'],
    ] as const;

    const RATE_K1 = 1800;
    const RATE_K2 = 3000;
    const ADMIN_FEE = 3000;
    let billCount = 0;
    let paymentCount = 0;

    for (let customerIndex = 0; customerIndex < customersData.length; customerIndex += 1) {
        const customerData = customersData[customerIndex];
        const customer = await prisma.customer.create({
            data: {
                name: customerData.name,
                customerNumber: customerIndex + 1,
                phone: customerData.phone,
                balance: customerData.balance,
            },
        });
        let lastMeterEnd = 100 + customerIndex * 12;
        let totalBill = 0;
        let totalPaid = 0;

        for (let periodIndex = 0; periodIndex < periods.length; periodIndex += 1) {
            const period = periods[periodIndex];
            const usage = 24 + ((customerIndex * 7 + periodIndex * 5) % 45);
            const meterStart = lastMeterEnd;
            const meterEnd = meterStart + usage;
            lastMeterEnd = meterEnd;
            const k1Usage = Math.min(usage, 40);
            const k2Usage = Math.max(0, usage - 40);
            const k1Amount = k1Usage * RATE_K1;
            const k2Amount = k2Usage * RATE_K2;
            const totalAmount = k1Amount + k2Amount + ADMIN_FEE;
            const status = statusPatterns[customerIndex][periodIndex];
            const penalty = status === 'PAID' || periodIndex >= 7 ? 0 : 5000;
            const amountDue = totalAmount + penalty;
            const amountPaid = status === 'PAID'
                ? amountDue
                : status === 'PARTIAL'
                    ? Math.floor(amountDue * 0.45)
                    : 0;
            const remaining = amountDue - amountPaid;
            const [year, month] = period.split('-').map(Number);
            const paidAt = status === 'PAID' ? new Date(Date.UTC(year, month, 0, 12)) : null;

            const meterReading = await prisma.meterReading.create({
                data: { customerId: customer.id, period, meterStart, meterEnd, usage },
            });
            await prisma.bill.create({
                data: {
                    meterReadingId: meterReading.id,
                    totalAmount,
                    penalty,
                    paymentStatus: status,
                    amountPaid,
                    remaining,
                    paidAt,
                    items: {
                        create: [
                            { type: 'BEBAN', usage: 0, rate: ADMIN_FEE, amount: ADMIN_FEE },
                            { type: 'K1', usage: k1Usage, rate: RATE_K1, amount: k1Amount },
                            ...(k2Usage > 0 ? [{ type: 'K2', usage: k2Usage, rate: RATE_K2, amount: k2Amount }] : []),
                        ],
                    },
                },
            });
            totalBill += totalAmount;
            totalPaid += amountPaid;
            billCount += 1;

            if (amountPaid > 0) {
                await prisma.payment.create({
                    data: {
                        customerId: customer.id,
                        amount: amountPaid,
                        description: status === 'PAID'
                            ? `Pembayaran tagihan ${period}`
                            : `Pembayaran sebagian tagihan ${period}`,
                        createdAt: paidAt ?? new Date(Date.UTC(year, month, 15, 12)),
                    },
                });
                paymentCount += 1;
            }
        }

        await prisma.customer.update({
            where: { id: customer.id },
            data: {
                totalBill,
                totalPaid,
                lastNotifiedAt: customerIndex % 2 === 0 ? new Date('2026-10-15T12:00:00.000Z') : null,
            },
        });
    }
    console.log(`Created ${customersData.length} customers, ${billCount} bills, and ${paymentCount} payment records across ${periods.length} months`);

    console.log('Seed completed!');
}

main()
    .catch((e) => {
        console.error('Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
