import { NextRequest, NextResponse } from 'next/server';
import { getAllSettings, updateSettings } from '@/services/server/setting.service';
import { AuthError, requireAdmin } from '@/lib/auth';

// GET /api/settings - Get all settings
export async function GET() {
    try {
        const settings = await getAllSettings();

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
        requireAdmin(request);
        const body = await request.json();
        const { settings } = body;

        if (!settings || typeof settings !== 'object') {
            return NextResponse.json({ success: false, error: 'Invalid settings data' }, { status: 400 });
        }

        // Update each setting
        await updateSettings(settings as Record<string, unknown>);

        return NextResponse.json({ success: true, message: 'Settings updated' });
    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json({ success: false, error: error.message }, { status: error.status });
        }
        console.error('Failed to update settings:', error);
        return NextResponse.json({ success: false, error: 'Failed to update settings' }, { status: 500 });
    }
}
