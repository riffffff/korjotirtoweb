import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

type RouteParams = {
    params: Promise<{
        id: string;
    }>;
};

/**
 * PATCH /api/customers/:id/notify
 * Update lastNotifiedAt timestamp after sending WA notification
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const customerId = parseInt(id, 10);

        const customer = await prisma.customer.update({
            where: { id: customerId },
            data: {
                lastNotifiedAt: new Date(),
            },
            select: {
                id: true,
                lastNotifiedAt: true,
            },
        });

        return NextResponse.json({
            success: true,
            data: customer,
        });
    } catch (error) {
        console.error('Error updating notification time:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update notification time' },
            { status: 500 }
        );
    }
}
