import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

type RouteParams = {
    params: Promise<{
        id: string;
    }>;
};

/**
 * POST /api/customers/:id/bills
 * Create a new bill for a specific customer
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const customerId = parseInt(id, 10);
        const body = await request.json();
        const { period, meterStart: inputMeterStart, meterEnd, role } = body;

        // Check admin role
        if (role !== 'admin') {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
            );
        }

        // Validate inputs
        if (!period || meterEnd === undefined) {
            return NextResponse.json(
                { success: false, error: 'Period dan meter akhir wajib diisi' },
                { status: 400 }
            );
        }

        // Check if customer exists
        const customer = await prisma.customer.findUnique({
            where: { id: customerId },
        });

        if (!customer) {
            return NextResponse.json(
                { success: false, error: 'Customer not found' },
                { status: 404 }
            );
        }

        // Check if bill already exists for this period
        const existingReading = await prisma.meterReading.findFirst({
            where: {
                customerId: customerId,
                period: period,
            },
        });

        if (existingReading) {
            return NextResponse.json(
                { success: false, error: 'Tagihan untuk periode ini sudah ada' },
                { status: 400 }
            );
        }

        // Get previous meter reading to calculate usage
        const prevReading = await prisma.meterReading.findFirst({
            where: {
                customerId: customerId,
            },
            orderBy: { period: 'desc' },
        });

        // Use input meter start if provided, otherwise use previous meter end
        let meterStart: number;
        if (prevReading) {
            meterStart = prevReading.meterEnd;
        } else if (inputMeterStart !== undefined) {
            meterStart = inputMeterStart;
        } else {
            return NextResponse.json(
                { success: false, error: 'Meter awal wajib diisi untuk tagihan pertama', needMeterStart: true },
                { status: 400 }
            );
        }

        const usage = Math.max(meterEnd - meterStart, 0);

        // Calculate bill amounts
        const K1_RATE = 1800;
        const K2_RATE = 3000;
        const K1_LIMIT = 40;
        const ADMIN_FEE = 3000;

        const usageK1 = Math.min(usage, K1_LIMIT);
        const usageK2 = Math.max(usage - K1_LIMIT, 0);
        const amountK1 = usageK1 * K1_RATE;
        const amountK2 = usageK2 * K2_RATE;
        const totalAmount = ADMIN_FEE + amountK1 + amountK2;

        // Create bill in transaction
        const result = await prisma.$transaction(async (tx) => {
            // Create meter reading
            const meterReading = await tx.meterReading.create({
                data: {
                    customerId: customerId,
                    period: period,
                    meterStart: meterStart,
                    meterEnd: meterEnd,
                    usage: usage,
                },
            });

            // Create bill
            const bill = await tx.bill.create({
                data: {
                    meterReadingId: meterReading.id,
                    totalAmount: totalAmount,
                    amountPaid: 0,
                    remaining: totalAmount,
                    paymentStatus: 'unpaid',
                },
            });

            // Create bill items
            const billItems: {
                billId: number;
                type: string;
                usage: number;
                rate: number;
                amount: number;
            }[] = [
                    {
                        billId: bill.id,
                        type: 'beban',
                        usage: 0,
                        rate: ADMIN_FEE,
                        amount: ADMIN_FEE,
                    },
                ];

            if (usageK1 > 0) {
                billItems.push({
                    billId: bill.id,
                    type: 'K1',
                    usage: usageK1,
                    rate: K1_RATE,
                    amount: amountK1,
                });
            }

            if (usageK2 > 0) {
                billItems.push({
                    billId: bill.id,
                    type: 'K2',
                    usage: usageK2,
                    rate: K2_RATE,
                    amount: amountK2,
                });
            }

            await tx.billItem.createMany({ data: billItems });

            // Update customer totals - only increment totalBill
            // balance is NOT touched here - it only stores saveToBalance deposits
            await tx.customer.update({
                where: { id: customerId },
                data: {
                    totalBill: { increment: totalAmount },
                },
            });

            return { bill, meterReading };
        });

        return NextResponse.json({
            success: true,
            data: {
                billId: result.bill.id,
                period,
                meterStart,
                meterEnd,
                usage,
                totalAmount,
            },
            message: 'Tagihan berhasil dibuat',
        });
    } catch (error) {
        console.error('Error creating bill:', error);
        return NextResponse.json(
            { success: false, error: 'Gagal membuat tagihan' },
            { status: 500 }
        );
    }
}
