import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString = process.env.DATABASE_URL;

declare global {
    // eslint-disable-next-line no-var
    var prisma: PrismaClient | undefined;
}

function createPrismaClient() {
    const pool = new Pool({
        connectionString,
        max: 1,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
}

export const prisma = global.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
    global.prisma = prisma;
}

export default prisma;
