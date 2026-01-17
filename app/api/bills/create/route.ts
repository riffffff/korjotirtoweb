import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * POST /api/bills/create
 * Create bills for all customers for a specific period
 * Based on previous month's meter readings
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { role, period } = body;

        // Check admin role
        if (role !== 'admin') {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
            );
        }

        // Validate period format
        if (!period || !/^\d{4}-\d{2}$/.test(period)) {
            return NextResponse.json(
                { success: false, error: 'Invalid period format. Use YYYY-MM' },
                { status: 400 }
            );
        }

        // Calculate previous period
        const [year, month] = period.split('-').map(Number);
        const prevDate = new Date(year, month - 2, 1); // month - 1 for 0-indexed, -1 for previous
        const prevPeriod = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

        // Get all active customers
        const customers = await prisma.customer.findMany({
            include: {
                meterReadings: {
                    where: {
                        period: prevPeriod,
                    },
                    include: {
                        bill: true,
                    },
                },
            },
        });

        // Check which customers already have bills for this period
        const existingBills = await prisma.meterReading.findMany({
            where: {
                period: period,
            },
            select: { customerId: true },
        });
        const customersWithBill = new Set(existingBills.map(b => b.customerId));

        // Settings for bill calculation
        const K1_RATE = 1800;
        const K2_RATE = 3000;
        const K1_LIMIT = 40;
        const ADMIN_FEE = 3000;

        let billsCreated = 0;
        const skippedCustomers: string[] = [];

        // Process each customer
        for (const customer of customers) {
            // Skip if already has bill for this period
            if (customersWithBill.has(customer.id)) {
                skippedCustomers.push(`${customer.name} (sudah ada tagihan)`);
                continue;
            }

            // Get previous meter reading
            const prevReading = customer.meterReadings[0];
            if (!prevReading) {
                skippedCustomers.push(`${customer.name} (tidak ada data meter bulan lalu)`);
                continue;
            }

            // For new period, meter start = previous meter end
            // Meter end needs to be input separately (via import or manual input)
            // For now, we'll create a bill based on previous month's usage as estimate
            const meterStart = prevReading.meterEnd;
            const estimatedUsage = prevReading.usage; // Use same usage as last month
            const meterEnd = meterStart + estimatedUsage;

            const usage = estimatedUsage;
            const usageK1 = Math.min(usage, K1_LIMIT);
            const usageK2 = Math.max(usage - K1_LIMIT, 0);
            const amountK1 = usageK1 * K1_RATE;
            const amountK2 = usageK2 * K2_RATE;
            const totalAmount = ADMIN_FEE + amountK1 + amountK2;

            await prisma.$transaction(async (tx) => {
                // Create meter reading
                const meterReading = await tx.meterReading.create({
                    data: {
                        customerId: customer.id,
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

                // Update customer totals
                await tx.customer.update({
                    where: { id: customer.id },
                    data: {
                        totalBill: { increment: totalAmount },
                        balance: { increment: totalAmount },
                    },
                });

                billsCreated++;
            });
        }

        // Create audit log
        await prisma.audit_logs.create({
            data: {
                action: 'BULK_CREATE',
                entity_type: 'Bill',
                performed_by: 'Admin',
                description: `Created ${billsCreated} bills for period ${period}`,
                details: {
                    period,
                    billsCreated,
                    skippedCount: skippedCustomers.length,
                },
            },
        });

        return NextResponse.json({
            success: true,
            count: billsCreated,
            skipped: skippedCustomers.length,
            skippedCustomers: skippedCustomers.slice(0, 10),
            message: `Berhasil membuat ${billsCreated} tagihan untuk periode ${period}`,
        });
    } catch (error) {
        console.error('Error creating bills:', error);
        return NextResponse.json(
            { success: false, error: 'Gagal membuat tagihan' },
            { status: 500 }
        );
    }
}
