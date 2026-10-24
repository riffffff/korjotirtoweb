import { NextRequest, NextResponse } from 'next/server';
import { resolveCustomerId } from '@/lib/customerIdentifier';
import { AuthError, requireAdmin } from '@/lib/auth';
import { getCustomerDetail, softDeleteCustomer, updateCustomer } from '@/services/server/customer.service';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
    try {
        const customerId = await resolveCustomerId((await params).id);
        if (!customerId) return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 });
        const data = await getCustomerDetail(customerId);
        if (!data) return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 });
        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching customer:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch customer' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        requireAdmin(request);
        const customerId = await resolveCustomerId((await params).id);
        if (!customerId) return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 });
        const { name, phone } = await request.json();
        if (typeof name !== 'string' || !name.trim()) {
            return NextResponse.json({ success: false, error: 'Nama wajib diisi' }, { status: 400 });
        }
        const customer = await updateCustomer(customerId, name.trim(), typeof phone === 'string' ? phone : null);
        return NextResponse.json({ success: true, data: customer });
    } catch (error) {
        if (error instanceof AuthError) return NextResponse.json({ success: false, error: error.message }, { status: error.status });
        console.error('Error updating customer:', error);
        return NextResponse.json({ success: false, error: 'Failed to update customer' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        requireAdmin(request);
        const customerId = await resolveCustomerId((await params).id);
        if (!customerId) return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 });
        await softDeleteCustomer(customerId);
        return NextResponse.json({ success: true, message: 'Customer deleted successfully' });
    } catch (error) {
        if (error instanceof AuthError) return NextResponse.json({ success: false, error: error.message }, { status: error.status });
        console.error('Error deleting customer:', error);
        return NextResponse.json({ success: false, error: 'Failed to delete customer' }, { status: 500 });
    }
}
