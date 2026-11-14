import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const rawConnectionString = process.env.DATABASE_URL || '';
const connectionString = rawConnectionString.replace(/[?&]pgbouncer=true/g, '');
const isRemoteDb =
    process.env.NODE_ENV === 'production' ||
    connectionString.includes('supabase.com') ||
    connectionString.includes('supabase.co');

declare global {
    var prisma: PrismaClient | undefined;
}

function createPrismaClient() {
    const pool = new Pool({
        connectionString,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 15000,
        ssl: isRemoteDb ? { rejectUnauthorized: false } : undefined,
    });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
}

export const prisma = global.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
    global.prisma = prisma;
}

export default prisma;
