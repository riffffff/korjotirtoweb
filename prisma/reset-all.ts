import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('Starting full database reset...');

    try {
        // Truncate all tables and restart identities
        // This deletes ALL data and resets ID counters to 1
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "payments", "bill_items", "bills", "meter_readings", "customers", "settings", "users" RESTART IDENTITY CASCADE;`);
        console.log('✅ Database cleared successfully.');
        console.log('✅ All IDs reset to 1.');
        console.log('⚠️  Tables are now EMPTY. Ready for manual import.');
    } catch (error) {
        console.error('❌ Error resetting database:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
