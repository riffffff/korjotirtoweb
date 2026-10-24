import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextRequest } from 'next/server';

const SESSION_COOKIE = 'korjo_session';
const SESSION_TTL_SECONDS = 60 * 60 * 8;

interface SessionPayload {
    sub: string;
    username: string;
    role: 'admin';
    exp: number;
}

export class AuthError extends Error {
    constructor(
        message: string,
        public readonly status: 401 | 403,
    ) {
        super(message);
        this.name = 'AuthError';
    }
}

function getAuthSecret(): string {
    const secret = process.env.AUTH_SECRET;
    if (!secret || secret.length < 32) {
        throw new Error('AUTH_SECRET must be configured with at least 32 characters');
    }
    return secret;
}

function encode(value: string): string {
    return Buffer.from(value, 'utf8').toString('base64url');
}

function sign(value: string): string {
    return createHmac('sha256', getAuthSecret()).update(value).digest('base64url');
}

/**
 * Creates a signed, expiring session token for an authenticated admin.
 */
export function createSessionToken(payload: Omit<SessionPayload, 'exp'>): string {
    const body = encode(JSON.stringify({
        ...payload,
        exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    }));
    return `${body}.${sign(body)}`;
}

/**
 * Verifies a session token and returns its trusted payload.
 */
export function verifySessionToken(token: string): SessionPayload {
    const [body, signature] = token.split('.');
    if (!body || !signature) throw new AuthError('Sesi tidak valid', 401);

    const expectedSignature = sign(body);
    const actual = Buffer.from(signature);
    const expected = Buffer.from(expectedSignature);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
        throw new AuthError('Sesi tidak valid', 401);
    }

    let payload: SessionPayload;
    try {
        payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
    } catch {
        throw new AuthError('Sesi tidak valid', 401);
    }

    if (
        payload.role !== 'admin' ||
        typeof payload.sub !== 'string' ||
        typeof payload.username !== 'string' ||
        typeof payload.exp !== 'number' ||
        payload.exp <= Math.floor(Date.now() / 1000)
    ) {
        throw new AuthError('Sesi kedaluwarsa atau tidak valid', 401);
    }
    return payload;
}

/**
 * Reads and verifies the session from the HTTP-only cookie or Authorization header.
 */
export function verifySessionRequest(request: NextRequest): SessionPayload {
    const cookieToken = request.cookies.get(SESSION_COOKIE)?.value;
    const authorization = request.headers.get('authorization');
    const headerToken = authorization?.startsWith('Bearer ')
        ? authorization.slice('Bearer '.length)
        : undefined;
    const token = cookieToken || headerToken;

    if (!token) throw new AuthError('Autentikasi diperlukan', 401);
    return verifySessionToken(token);
}

/**
 * Requires an authenticated admin session for a protected API route.
 */
export function requireAdmin(request: NextRequest): SessionPayload {
    const session = verifySessionRequest(request);
    if (session.role !== 'admin') throw new AuthError('Akses admin diperlukan', 403);
    return session;
}

export const authCookie = {
    name: SESSION_COOKIE,
    maxAge: SESSION_TTL_SECONDS,
};
