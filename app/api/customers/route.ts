import { NextRequest, NextResponse } from 'next/server';
import { AuthError, requireAdmin } from '@/lib/auth';
import { createCustomer, getAllCustomers } from '@/services/server/customer.service';

/**
 * GET /api/customers
 * List all customers with their outstanding balance
 * Phone numbers are hidden for non-admin users
 */
export async function GET(request: NextRequest) {
    try {
        const isAdmin = (() => {
            try {
                requireAdmin(request);
                return true;
            } catch {
                return false;
            }
        })();
        const formattedCustomers = await getAllCustomers(isAdmin);

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
 * Customer number is auto-generated
 */
export async function POST(request: NextRequest) {
    try {
        requireAdmin(request);
        const body = await request.json();
        const { name, phone } = body;

        if (!name) {
            return NextResponse.json(
                { success: false, error: 'Nama wajib diisi' },
                { status: 400 }
            );
        }

        const customer = await createCustomer(name.trim(), typeof phone === 'string' ? phone : null);

        return NextResponse.json({
            success: true,
            data: customer,
        });
    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json({ success: false, error: error.message }, { status: error.status });
        }
        console.error('Error creating customer:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create customer' },
            { status: 500 }
        );
    }
}
