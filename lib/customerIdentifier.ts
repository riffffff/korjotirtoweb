import prisma from '@/lib/prisma';

/**
 * Resolve customer identifier from URL param.
 * Supports both primary id and customerNumber.
 * Priority: id first (backward compatibility), then customerNumber.
 */
export async function resolveCustomerId(identifier: string): Promise<number | null> {
    const numericValue = Number(identifier);

    if (!Number.isInteger(numericValue) || numericValue <= 0) {
        return null;
    }

    const byId = await prisma.customer.findUnique({
        where: { id: numericValue },
        select: { id: true },
    });

    if (byId) {
        return byId.id;
    }

    const byCustomerNumber = await prisma.customer.findUnique({
        where: { customerNumber: numericValue },
        select: { id: true },
    });

    return byCustomerNumber?.id ?? null;
}
