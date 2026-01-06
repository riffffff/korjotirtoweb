import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaClient } from '.prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('Starting seed...');

    // Clear existing data (optional - comment out if you want to keep existing data)
    await prisma.billItem.deleteMany();
    await prisma.bill.deleteMany();
    await prisma.meterReading.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.setting.deleteMany();
    await prisma.users.deleteMany();

    // 1. Create Settings
    const settings = await prisma.setting.createMany({
        data: [
            { key: 'RATE_K1', value: '1200', description: 'Tarif per m³ untuk 0-40m³' },
            { key: 'RATE_K2', value: '3000', description: 'Tarif per m³ untuk >40m³' },
            { key: 'ADMIN_FEE', value: '5000', description: 'Biaya admin bulanan' },
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

    // 4. Create Meter Readings & Bills for current month
    const currentDate = new Date();
    const period = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

    for (const customer of customers) {
        // Random meter values
        const meterStart = Math.floor(Math.random() * 100) + 100;
        const usage = Math.floor(Math.random() * 60) + 20; // 20-80 m³
        const meterEnd = meterStart + usage;

        // Calculate charges
        const k1Usage = Math.min(usage, 40);
        const k2Usage = Math.max(0, usage - 40);
        const k1Amount = k1Usage * 1200;
        const k2Amount = k2Usage * 3000;
        const adminFee = 5000;
        const totalAmount = k1Amount + k2Amount + adminFee;

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
                    paymentStatus: 'pending',
                    remaining: totalAmount,
                    items: {
                        create: [
                            { type: 'ADMIN_FEE', usage: 0, rate: adminFee, amount: adminFee },
                            { type: 'K1', usage: k1Usage, rate: 1200, amount: k1Amount },
                            ...(k2Usage > 0 ? [{ type: 'K2', usage: k2Usage, rate: 3000, amount: k2Amount }] : []),
                        ],
                    },
                },
            });

            // Update customer totalBill and outstandingBalance
            await prisma.customer.update({
                where: { id: customer.id },
                data: {
                    totalBill: { increment: totalAmount },
                    outstandingBalance: { increment: totalAmount },
                },
            });
        }
    }
    console.log(`Created meter readings & bills for period ${period}`);

    console.log('Seed completed!');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
