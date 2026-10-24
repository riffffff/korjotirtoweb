import { NextRequest, NextResponse } from 'next/server';
import { AuthError, requireAdmin } from '@/lib/auth';
import { resetDevelopmentData } from '@/services/server/maintenance.service';

export async function GET(request: NextRequest) {
    try {
        requireAdmin(request);
        await resetDevelopmentData();
        return NextResponse.json({
            success: true,
            message: 'Database reset specific tables and Admin recreated',
        });
    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json({ success: false, error: error.message }, { status: error.status });
        }
        const message = error instanceof Error ? error.message : 'Database reset failed';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
