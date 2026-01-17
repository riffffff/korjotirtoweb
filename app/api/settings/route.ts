import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/settings - Get all settings
export async function GET() {
    try {
        const settings = await prisma.setting.findMany({
            orderBy: { key: 'asc' }
        });

        // Convert to key-value object for easier use
        const settingsMap: Record<string, string> = {};
        settings.forEach(s => {
            settingsMap[s.key] = s.value;
        });

        return NextResponse.json({
            success: true,
            data: settingsMap,
            raw: settings
        });
    } catch (error) {
        console.error('Failed to fetch settings:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch settings' }, { status: 500 });
    }
}

// PUT /api/settings - Update settings (admin only)
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { role, settings } = body;

        if (role !== 'admin') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
        }

        if (!settings || typeof settings !== 'object') {
            return NextResponse.json({ success: false, error: 'Invalid settings data' }, { status: 400 });
        }

        // Update each setting
        const updates = Object.entries(settings).map(([key, value]) =>
            prisma.setting.upsert({
                where: { key },
                update: { value: String(value) },
                create: { key, value: String(value) }
            })
        );

        await Promise.all(updates);

        return NextResponse.json({ success: true, message: 'Settings updated' });
    } catch (error) {
        console.error('Failed to update settings:', error);
        return NextResponse.json({ success: false, error: 'Failed to update settings' }, { status: 500 });
    }
}
