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
    console.error('🚨 SAFETY BLOCK: Dilarang menjalankan seed pada database PRODUCTION (ckdyaepuvgrxjbkchrpw)!');
    process.exit(1);
}

const connectionString = rawConnectionString.replace(/[?&]pgbouncer=true/g, '');
const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('supabase.com') ? { rejectUnauthorized: false } : undefined,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const RATE_K1 = 1800;
const RATE_K2 = 3000;
const ADMIN_FEE = 3000;

/*
function calculateBill(usage: number) {
    const k1 = Math.min(usage, 40);
    const k2 = Math.max(0, usage - 40);
    const amount = (k1 * RATE_K1) + (k2 * RATE_K2) + ADMIN_FEE;
    return amount;
}
*/

async function main() {
    console.log('🌱 Starting Insights Seeder for Test Database...');

    // 1. Truncate test tables cleanly
    try {
        await prisma.$executeRawUnsafe(
            `TRUNCATE TABLE "payment_proofs", "audit_logs", "payments", "bill_items", "bills", "meter_readings", "customers", "settings", "users" RESTART IDENTITY CASCADE;`
        );
        console.log('✔ Database cleared cleanly.');
    } catch {
        await prisma.paymentProof.deleteMany();
        await prisma.payment.deleteMany();
        await prisma.billItem.deleteMany();
        await prisma.bill.deleteMany();
        await prisma.meterReading.deleteMany();
        await prisma.customer.deleteMany();
        await prisma.setting.deleteMany();
        await prisma.users.deleteMany();
    }

    // 2. Settings
    await prisma.setting.createMany({
        data: [
            { key: 'RATE_K1', value: '1800', description: 'Tarif per m³ untuk 0-40m³' },
            { key: 'RATE_K2', value: '3000', description: 'Tarif per m³ untuk >40m³' },
            { key: 'ADMIN_FEE', value: '3000', description: 'Biaya admin bulanan' },
            { key: 'PENALTY_RATE', value: '5000', description: 'Denda keterlambatan' },
        ],
    });

    // 3. Admin User (admin / admin123)
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminUser = await prisma.users.create({
        data: {
            username: 'admin',
            password: hashedPassword,
            name: 'Administrator',
            role: 'admin',
            is_active: true,
        },
    });
    console.log('✔ Admin user ready (admin / admin123).');

    // Periods for seeding: 6 months history (May - Oct 2026)
    const periods = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'];

    // 4. Customers definitions designed to test all insights:
    // - Customer 1: Nasekun -> Lunas, has 1 APPROVED proof with notifiedAt=null (for testing proof confirmation)
    // - Customer 2: Siti Fauziyah -> Unpaid 5 months (Top Delinquent #1), SPIKE anomaly (10 -> 35 m³), 1 PENDING proof
    // - Customer 3: Budi Santoso -> Unpaid 3 months (Top Delinquent #2), Highest Usage (55 m³), 1 PENDING proof
    // - Customer 4: Rina Kartika -> Unpaid 2 months (Top Delinquent #3), normal usage
    // - Customer 5: Wahyu Setiawan -> Unpaid 1 month (Top Delinquent #4), normal usage
    // - Customer 6: Dewi Lestari -> ZERO_USAGE anomaly (0 m³ in Oct), Lunas
    // - Customer 7: Agus Pratama -> Lunas, normal usage
    // - Customer 8: Fajar Hidayat -> Lunas, normal usage
    // - Customer 9: Ma'rifatul Mentul -> Unpaid 1 month (Top Delinquent #5), normal usage
    const customerConfigs = [
        {
            name: 'Nasekun',
            phone: '085227797555',
            unpaidMonthsCount: 0,
            usages: [20, 22, 21, 24, 25, 24],
        },
        {
            name: 'Siti Fauziyah',
            phone: '085643222417',
            unpaidMonthsCount: 5, // Unpaid Jun, Jul, Aug, Sep, Oct
            usages: [15, 14, 16, 12, 10, 35], // 10 -> 35 m³ = SPIKE ANOMALY (+250%)
        },
        {
            name: 'Budi Santoso',
            phone: '081234567890',
            unpaidMonthsCount: 3, // Unpaid Aug, Sep, Oct
            usages: [28, 30, 32, 35, 38, 55], // 55 m³ = HIGHEST USAGE
        },
        {
            name: 'Rina Kartika',
            phone: '084455667788',
            unpaidMonthsCount: 2, // Unpaid Sep, Oct
            usages: [18, 19, 20, 22, 21, 23],
        },
        {
            name: 'Wahyu Setiawan',
            phone: '085566778899',
            unpaidMonthsCount: 1, // Unpaid Oct
            usages: [22, 24, 23, 25, 24, 26],
        },
        {
            name: 'Dewi Lestari',
            phone: '082233445566',
            unpaidMonthsCount: 0,
            usages: [16, 17, 18, 19, 18, 0], // 0 m³ in Oct = ZERO_USAGE ANOMALY
        },
        {
            name: 'Agus Pratama',
            phone: '085869669377',
            unpaidMonthsCount: 0,
            usages: [21, 22, 23, 22, 24, 23],
        },
        {
            name: 'Fajar Hidayat',
            phone: '083344556677',
            unpaidMonthsCount: 0,
            usages: [25, 26, 25, 27, 26, 28],
        },
        {
            name: 'Ma\'rifatul Mentul',
            phone: '085726106702',
            unpaidMonthsCount: 1, // Unpaid Oct
            usages: [19, 20, 19, 21, 20, 22],
        },
    ];

    const createdCustomers: { id: string; name: string; phone: string; customerNumber: number }[] = [];

    for (let i = 0; i < customerConfigs.length; i++) {
        const conf = customerConfigs[i];
        const customerNumber = i + 1;

        let totalCustomerBill = 0;
        let totalCustomerPaid = 0;

        const customer = await prisma.customer.create({
            data: {
                name: conf.name,
                customerNumber,
                phone: conf.phone,
                balance: 0,
            },
        });
        createdCustomers.push({
            id: customer.id,
            name: customer.name,
            phone: customer.phone!,
            customerNumber,
        });

        let currentMeter = 100 + i * 20;

        for (let pIdx = 0; pIdx < periods.length; pIdx++) {
            const period = periods[pIdx];
            const usage = conf.usages[pIdx];
            const meterStart = currentMeter;
            const meterEnd = meterStart + usage;
            currentMeter = meterEnd;

            const reading = await prisma.meterReading.create({
                data: {
                    customerId: customer.id,
                    period,
                    meterStart,
                    meterEnd,
                    usage,
                },
            });

            const k1Usage = Math.min(usage, 40);
            const k2Usage = Math.max(0, usage - 40);
            const k1Amount = k1Usage * RATE_K1;
            const k2Amount = k2Usage * RATE_K2;
            const billTotal = k1Amount + k2Amount + ADMIN_FEE;
            totalCustomerBill += billTotal;

            // Determine paid vs unpaid based on unpaidMonthsCount
            // E.g. If unpaidMonthsCount is 3, then last 3 periods (idx 3, 4, 5) are UNPAID
            const isUnpaid = pIdx >= (periods.length - conf.unpaidMonthsCount);
            const paymentStatus = isUnpaid ? 'UNPAID' : 'PAID';
            const amountPaid = isUnpaid ? 0 : billTotal;
            const remaining = isUnpaid ? billTotal : 0;
            const paidAt = isUnpaid ? null : new Date('2026-10-05T08:00:00Z');

            if (!isUnpaid) {
                totalCustomerPaid += billTotal;
            }

            await prisma.bill.create({
                data: {
                    meterReadingId: reading.id,
                    totalAmount: billTotal,
                    amountPaid,
                    remaining,
                    paymentStatus,
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

            // Payment record if paid
            if (!isUnpaid) {
                await prisma.payment.create({
                    data: {
                        customerId: customer.id,
                        amount: billTotal,
                        description: `Pembayaran tagihan periode ${period}`,
                        createdAt: paidAt!,
                    },
                });
            }
        }

        // Update customer totals
        await prisma.customer.update({
            where: { id: customer.id },
            data: {
                totalBill: totalCustomerBill,
                totalPaid: totalCustomerPaid,
            },
        });
    }

    console.log(`✔ Created ${createdCustomers.length} customers with 6-month billing history.`);

    // 5. Seed Payment Proofs to test the Alert Banner & Proofs list
    // - Proof 1: Customer #2 (Siti Fauziyah), PENDING, Rp 185.000
    // - Proof 2: Customer #3 (Budi Santoso), PENDING, Rp 340.000
    // Total Pending = Rp 525.000
    // - Proof 3: Customer #1 (Nasekun), APPROVED, Rp 501.010, notifiedAt = null
    const proofUrlPlaceholder = 'https://xfbkkfnkcivwbuwhqkic.supabase.co/storage/v1/object/public/payment-proofs/sample-proof.jpg';

    await prisma.paymentProof.createMany({
        data: [
            {
                customerId: createdCustomers[1].id, // Siti Fauziyah
                phone: createdCustomers[1].phone,
                amount: 185000,
                proofUrl: proofUrlPlaceholder,
                originalName: 'bukti_transfer_bca.jpg',
                mimeType: 'image/jpeg',
                status: 'PENDING',
                note: 'Transfer via BCA Mobile - Pelanggan #2',
            },
            {
                customerId: createdCustomers[2].id, // Budi Santoso
                phone: createdCustomers[2].phone,
                amount: 340000,
                proofUrl: proofUrlPlaceholder,
                originalName: 'bukti_transfer_mandiri.jpg',
                mimeType: 'image/jpeg',
                status: 'PENDING',
                note: 'Pembayaran tagihan 3 bulan lewat Livin Mandiri',
            },
            {
                customerId: createdCustomers[0].id, // Nasekun
                phone: createdCustomers[0].phone,
                amount: 501010,
                proofUrl: proofUrlPlaceholder,
                originalName: 'bukti_nasekun.jpg',
                mimeType: 'image/jpeg',
                status: 'APPROVED',
                verifiedBy: adminUser.id,
                verifiedAt: new Date(),
                notifiedAt: null, // Untested, ready to click "Kirim Konfirmasi WA"
                note: 'Sudah diverifikasi admin',
            },
        ],
    });

    console.log('✔ Created 3 Payment Proofs (2 PENDING, 1 APPROVED).');
    console.log('\n🎉 Insights Seeding Complete!');
    console.log('----------------------------------------------------');
    console.log('📊 Skenario Siap Diuji pada Dashboard:');
    console.log(' 1. Alert Banner: 2 bukti pembayaran pending (Total Rp 525.000)');
    console.log(' 2. Top Penunggak: Siti Fauziyah (5 bln), Budi Santoso (3 bln), Rina Kartika (2 bln)...');
    console.log(' 3. Anomali Lonjakan: Siti Fauziyah (10 m³ -> 35 m³, +250%)');
    console.log(' 4. Anomali 0 m³: Dewi Lestari (0 m³)');
    console.log(' 5. Pemakaian Tertinggi: Budi Santoso (55 m³)');
    console.log('----------------------------------------------------');
}

main()
    .catch((e) => {
        console.error('❌ Seeder error:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
