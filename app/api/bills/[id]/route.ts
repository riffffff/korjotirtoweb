import { NextRequest, NextResponse } from 'next/server';
import { AuthError, requireAdmin } from '@/lib/auth';
import { softDeleteBill } from '@/services/server/bill.service';

type RouteParams = {
    params: Promise<{
        id: string;
    }>;
};

/**
 * DELETE /api/bills/:id
 * Hard delete a bill (admin only)
 * Also deletes related meter reading and bill items
 * Recalculates customer totals
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        requireAdmin(request);
        const { id } = await params;
        await softDeleteBill(id);

        return NextResponse.json({
            success: true,
            message: 'Bill deleted successfully',
        });
    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json({ success: false, error: error.message }, { status: error.status });
        }
        console.error('Error deleting bill:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete bill' },
            { status: 500 }
        );
    }
}
