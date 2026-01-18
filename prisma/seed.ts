import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('Starting seed...');

    // Clear existing data (optional - comment out if you want to keep existing data)
    // Clear existing data AND reset IDs (Restart Identity)
    try {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "payments", "bill_items", "bills", "meter_readings", "customers", "settings", "users" RESTART IDENTITY CASCADE;`);
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

    // 2. Create Customers
    const customersData = [
        { name: 'Nasekun', customerNumber: 1, phone: '085227797555' },
        { name: 'Siti Fauziyah', customerNumber: 2, phone: '085643222417' },
        { name: 'Ma\'rifatul Mentul', customerNumber: 3, phone: '085726106702' },
        { name: 'Izzatul be Mature', customerNumber: 4, phone: '08117302075' },
        { name: 'Agus Pratama', customerNumber: 5, phone: '085869669377' },
    ];

    for (const data of customersData) {
        const existing = await prisma.customer.findFirst({
            where: { customerNumber: data.customerNumber },
        });
        if (!existing) {
            await prisma.customer.create({ data });
        }
    }
    console.log(`Created ${customersData.length} customers`);

    // 3. Get customers for meter readings
    const customers = await prisma.customer.findMany();

    // 4. Create Meter Readings & Bills for 12 months (Feb 2025 - Jan 2026)
    // Paid: Feb 2025 - Nov 2025 (paid at end of their respective months)
    // Unpaid: Dec 2025 - Jan 2026
    const periods = [
        '2025-02', '2025-03', '2025-04', '2025-05', '2025-06',
        '2025-07', '2025-08', '2025-09', '2025-10', '2025-11',
        '2025-12', '2026-01'
    ];

    const RATE_K1 = 1800;
    const RATE_K2 = 3000;
    const ADMIN_FEE = 3000;

    for (const customer of customers) {
        let lastMeterEnd = Math.floor(Math.random() * 50) + 50; // Starting meter

        for (const period of periods) {
            // Random usage 20-80 m³
            const usage = Math.floor(Math.random() * 60) + 20;
            const meterStart = lastMeterEnd;
            const meterEnd = meterStart + usage;
            lastMeterEnd = meterEnd;

            // Calculate charges with correct rates
            const k1Usage = Math.min(usage, 40);
            const k2Usage = Math.max(0, usage - 40);
            const k1Amount = k1Usage * RATE_K1;
            const k2Amount = k2Usage * RATE_K2;
            const totalAmount = k1Amount + k2Amount + ADMIN_FEE;

            // Determine payment status: Unpaid for Dec 2025 onwards
            const [year, month] = period.split('-').map(Number);
            const isPaid = period < '2025-12';

            // For paid bills, set paidAt to end of that month
            const paidAt = isPaid ? new Date(year, month, 0) : null; // Last day of month

            // Create meter reading
            const meterReading = await prisma.meterReading.upsert({
                where: {
                    customerId_period: {
                        customerId: customer.id,
                        period: period,
                    },
                },
                update: {},
                create: {
                    customerId: customer.id,
                    period: period,
                    meterStart: meterStart,
                    meterEnd: meterEnd,
                    usage: usage,
                },
            });

            // Create bill with items
            const existingBill = await prisma.bill.findUnique({
                where: { meterReadingId: meterReading.id },
            });

            if (!existingBill) {
                await prisma.bill.create({
                    data: {
                        meterReadingId: meterReading.id,
                        totalAmount: totalAmount,
                        paymentStatus: isPaid ? 'paid' : 'pending',
                        amountPaid: isPaid ? totalAmount : 0,
                        remaining: isPaid ? 0 : totalAmount,
                        paidAt: paidAt,
                        items: {
                            create: [
                                { type: 'ADMIN_FEE', usage: 0, rate: ADMIN_FEE, amount: ADMIN_FEE },
                                { type: 'K1', usage: k1Usage, rate: RATE_K1, amount: k1Amount },
                                ...(k2Usage > 0 ? [{ type: 'K2', usage: k2Usage, rate: RATE_K2, amount: k2Amount }] : []),
                            ],
                        },
                    },
                });

                // Update customer totalBill
                await prisma.customer.update({
                    where: { id: customer.id },
                    data: {
                        totalBill: { increment: totalAmount },
                        totalPaid: { increment: isPaid ? totalAmount : 0 },
                    },
                });
            }
        }
    }
    console.log(`Created meter readings & bills for ${periods.length} months (${periods[0]} to ${periods[periods.length - 1]})`);

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
