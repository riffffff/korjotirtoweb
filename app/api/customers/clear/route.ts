import { NextRequest, NextResponse } from 'next/server';
import { AuthError, requireAdmin } from '@/lib/auth';
import { clearAllCustomerData } from '@/services/server/customer.service';

/**
 * DELETE /api/customers/clear
 * Delete all customers and related data (admin only)
 */
export async function DELETE(request: NextRequest) {
    try {
        requireAdmin(request);
        const body = await request.json();
        const { confirmDelete } = body;

        // Require explicit confirmation
        if (confirmDelete !== 'HAPUS_SEMUA') {
            return NextResponse.json(
                { success: false, error: 'Konfirmasi diperlukan' },
                { status: 400 }
            );
        }

        await clearAllCustomerData();

        return NextResponse.json({
            success: true,
            message: 'Semua data pelanggan berhasil dihapus',
        });
    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json({ success: false, error: error.message }, { status: error.status });
        }
        console.error('Error clearing data:', error);
        return NextResponse.json(
            { success: false, error: 'Gagal menghapus data' },
            { status: 500 }
        );
    }
}
