import { NextRequest, NextResponse } from 'next/server';
import { resolveCustomerId } from '@/lib/customerIdentifier';
import { AuthError, requireAdmin } from '@/lib/auth';
import { processCustomerPayment } from '@/services/server/payment.service';

type RouteParams = {
    params: Promise<{
        id: string;
    }>;
};


/**
 * PATCH /api/customers/:id/pay
 * Process payment for a customer using FIFO allocation
 * Allocates payment to oldest unpaid bills first
 * Optionally saves part of change to customer balance
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        requireAdmin(request);
        const { id } = await params;
        const customerId = await resolveCustomerId(id);
        const body = await request.json();
        const { amount, saveToBalance = 0, balanceUsed = 0 } = body;

        if (!customerId) {
            return NextResponse.json(
                { success: false, error: 'Customer not found' },
                { status: 404 }
            );
        }

        // Validate amount
        if (typeof amount !== 'number' || amount <= 0) {
            return NextResponse.json(
                { success: false, error: 'Invalid payment amount' },
                { status: 400 }
            );
        }

        // Validate saveToBalance & balanceUsed
        if (typeof saveToBalance !== 'number' || saveToBalance < 0) {
            return NextResponse.json(
                { success: false, error: 'Invalid saveToBalance amount' },
                { status: 400 }
            );
        }
        if (typeof balanceUsed !== 'number' || balanceUsed < 0) {
            return NextResponse.json(
                { success: false, error: 'Invalid balanceUsed amount' },
                { status: 400 }
            );
        }

        const result = await processCustomerPayment({
            customerId,
            cashAmount: amount,
            saveToDeposit: saveToBalance,
            useDeposit: balanceUsed,
        });

        return NextResponse.json({
            success: true,
            data: {
                customer: {
                    id: result.customer.id,
                    name: result.customer.name,
                    totalBill: Number(result.customer.totalBill),
                    totalPaid: Number(result.customer.totalPaid),
                    balance: Number(result.customer.balance),
                },
                payment: {
                    amount: amount,
                    allocated: result.allocation.allocatedAmount,
                    change: result.allocation.change,
                    savedToBalance: saveToBalance,
                    cashChange: result.cashChange,
                },
                billsUpdated: result.allocation.bills,
            },
            message: saveToBalance > 0
                ? `Pembayaran berhasil! Kembalian cash: Rp ${result.cashChange.toLocaleString()}, Simpan ke saldo: Rp ${saveToBalance.toLocaleString()}`
                : result.allocation.change > 0
                    ? `Pembayaran berhasil! Kembalian: Rp ${result.allocation.change.toLocaleString()}`
                    : result.allocation.bills.some(b => b.paymentStatus === 'PAID')
                        ? `${result.allocation.bills.filter(b => b.paymentStatus === 'PAID').length} tagihan lunas.`
                        : 'Pembayaran sebagian tercatat.',
        });
    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json({ success: false, error: error.message }, { status: error.status });
        }
        console.error('Error processing payment:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to process payment' },
            { status: 500 }
        );
    }
}
