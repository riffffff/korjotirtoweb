import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { Pool } from 'pg';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath, override: true });
} else {
    dotenv.config();
}

const rawConnectionString = process.env.DIRECT_URL || process.env.DATABASE_URL || '';
if (rawConnectionString.includes('ckdyaepuvgrxjbkchrpw')) {
    console.error('🚨 SAFETY BLOCK: Dilarang menghapus data pada database PRODUCTION (ckdyaepuvgrxjbkchrpw)!');
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
    console.log('Mengosongkan data pelanggan, tagihan, dan pembayaran...');

    await prisma.$transaction(async (tx) => {
        await tx.paymentProof.deleteMany({});
        await tx.payment.deleteMany({});
        await tx.billItem.deleteMany({});
        await tx.bill.deleteMany({});
        await tx.meterReading.deleteMany({});
        await tx.customer.deleteMany({});
    });

    const [customers, bills, payments] = await Promise.all([
        prisma.customer.count(),
        prisma.bill.count(),
        prisma.payment.count(),
    ]);

    console.log(`✅ Sukses! Data berhasil dikosongkan.`);
    console.log(`Status saat ini -> Pelanggan: ${customers}, Tagihan: ${bills}, Pembayaran: ${payments}`);
    console.log(`(Data akun admin dan pengaturan tarif tetap aman)`);

    await prisma.$disconnect();
    await pool.end();
}

main().catch(async (e) => {
    console.error('Gagal mengosongkan database:', e);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
});
