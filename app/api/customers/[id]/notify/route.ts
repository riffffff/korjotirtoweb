import { NextRequest, NextResponse } from 'next/server';
import { resolveCustomerId } from '@/lib/customerIdentifier';
import { AuthError, requireAdmin } from '@/lib/auth';
import { markCustomerNotified } from '@/services/server/customer.service';

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
        requireAdmin(request);
        const { id } = await params;
        const customerId = await resolveCustomerId(id);

        if (!customerId) {
            return NextResponse.json(
                { success: false, error: 'Customer not found' },
                { status: 404 }
            );
        }

        const customer = await markCustomerNotified(customerId);

        return NextResponse.json({
            success: true,
            data: customer,
        });
    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json({ success: false, error: error.message }, { status: error.status });
        }
        console.error('Error updating notification time:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update notification time' },
            { status: 500 }
        );
    }
}
