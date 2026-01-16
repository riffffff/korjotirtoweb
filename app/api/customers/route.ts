import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/customers
 * List all customers with their outstanding balance
 * Fast query - penalty calculation done in frontend for list view
 */
export async function GET() {
    try {
        const customers = await prisma.customer.findMany({
            orderBy: { customerNumber: 'asc' },
            select: {
                id: true,
                name: true,
                customerNumber: true,
                phone: true,
                totalBill: true,
                totalPaid: true,
                outstandingBalance: true,
                lastNotifiedAt: true,
            },
        });

        const formattedCustomers = customers.map((customer) => ({
            id: customer.id,
            name: customer.name,
            customerNumber: customer.customerNumber,
            phone: customer.phone,
            totalBill: Number(customer.totalBill),
            totalPaid: Number(customer.totalPaid),
            outstandingBalance: Number(customer.outstandingBalance),
            lastNotifiedAt: customer.lastNotifiedAt,
        }));

        return NextResponse.json({
            success: true,
            data: formattedCustomers,
        });
    } catch (error) {
        console.error('Error fetching customers:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch customers' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/customers
 * Create a new customer (admin only)
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, customerNumber, phone, role } = body;

        if (role !== 'admin') {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
            );
        }

        if (!name || !customerNumber) {
            return NextResponse.json(
                { success: false, error: 'Nama dan nomor pelanggan wajib diisi' },
                { status: 400 }
            );
        }

        const existing = await prisma.customer.findUnique({
            where: { customerNumber: parseInt(customerNumber) },
        });

        if (existing) {
            return NextResponse.json(
                { success: false, error: 'Nomor pelanggan sudah digunakan' },
                { status: 400 }
            );
        }

        const customer = await prisma.customer.create({
            data: {
                name,
                customerNumber: parseInt(customerNumber),
                phone: phone || null,
            },
        });

        return NextResponse.json({
            success: true,
            data: customer,
        });
    } catch (error) {
        console.error('Error creating customer:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create customer' },
            { status: 500 }
        );
    }
}
