import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * DELETE /api/customers/clear
 * Delete all customers and related data (admin only)
 */
export async function DELETE(request: NextRequest) {
    try {
        const body = await request.json();
        const { role, confirmDelete } = body;

        // Check admin role
        if (role !== 'admin') {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
            );
        }

        // Require explicit confirmation
        if (confirmDelete !== 'HAPUS_SEMUA') {
            return NextResponse.json(
                { success: false, error: 'Konfirmasi diperlukan' },
                { status: 400 }
            );
        }

        // Delete in correct order (foreign key constraints)
        await prisma.$transaction(async (tx) => {
            await tx.payment.deleteMany({});
            await tx.billItem.deleteMany({});
            await tx.bill.deleteMany({});
            await tx.meterReading.deleteMany({});
            await tx.customer.deleteMany({});
        });

        return NextResponse.json({
            success: true,
            message: 'Semua data pelanggan berhasil dihapus',
        });
    } catch (error) {
        console.error('Error clearing data:', error);
        return NextResponse.json(
            { success: false, error: 'Gagal menghapus data' },
            { status: 500 }
        );
    }
}
