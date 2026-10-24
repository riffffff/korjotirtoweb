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

export async function verifyAdminPassword(userId: string, password: string): Promise<boolean> {
    const user = await prisma.users.findUnique({
        where: { id: userId },
        select: { password: true, is_active: true },
    });
    return Boolean(user?.is_active && await bcrypt.compare(password, user.password));
}
