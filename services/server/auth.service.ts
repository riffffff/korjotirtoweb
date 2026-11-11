import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

export async function authenticateAdmin(username: string, password: string) {
    const user = await prisma.users.findUnique({ where: { username } });
    if (!user || !user.is_active || !(await bcrypt.compare(password, user.password))) return null;
    return {
        id: user.id,
        username: user.username,
        name: user.name,
        role: 'admin' as const,
    };
}

export async function verifyAdminPassword(userId: string, password: string, username?: string): Promise<boolean> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    const user = await prisma.users.findFirst({
        where: {
            OR: [
                ...(isUuid ? [{ id: userId }] : []),
                ...(username ? [{ username }] : [{ username: userId }]),
            ],
        },
        select: { password: true, is_active: true },
    });
    return Boolean(user?.is_active && (await bcrypt.compare(password, user.password)));
}
