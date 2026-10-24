import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

/**
 * Resolve customer identifier from URL param.
 * Supports both primary id and customerNumber.
 * Priority: id first (backward compatibility), then customerNumber.
 */
export async function resolveCustomerId(identifier: string): Promise<string | null> {
    const numericValue = Number(identifier);

    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier)) {
        const [byId] = await prisma.$queryRaw<Array<{ id: string }>>(
            Prisma.sql`SELECT id FROM "customers" WHERE id = ${identifier}::uuid AND deleted_at IS NULL LIMIT 1`,
        );
        return byId?.id ?? null;
    }

    if (!Number.isInteger(numericValue) || numericValue <= 0) return null;
    const [byCustomerNumber] = await prisma.$queryRaw<Array<{ id: string }>>(
        Prisma.sql`SELECT id FROM "customers" WHERE customer_number = ${numericValue} AND deleted_at IS NULL LIMIT 1`,
    );

    return byCustomerNumber?.id ?? null;
}
