import { NextResponse, type NextRequest } from 'next/server';

function isSessionValid(token: string): boolean {
    const [body, signature] = token.split('.');
    if (!body || !signature) return false;

    try {
        // Base64URL decode in standard Web / Edge Runtime
        const base64 = body.replace(/-/g, '+').replace(/_/g, '/');
        const jsonString = atob(base64);
        const payload = JSON.parse(jsonString);

        if (
            payload.role !== 'admin' ||
            typeof payload.sub !== 'string' ||
            typeof payload.exp !== 'number' ||
            payload.exp <= Math.floor(Date.now() / 1000)
        ) {
            return false;
        }

        return true;
    } catch {
        return false;
    }
}

export function middleware(request: NextRequest) {
    const { pathname, search } = request.nextUrl;

    // Proteksi rute admin di level server/middleware
    if (pathname.startsWith('/admin')) {
        const sessionCookie = request.cookies.get('korjo_session')?.value;

        if (!sessionCookie || !isSessionValid(sessionCookie)) {
            const loginUrl = request.nextUrl.clone();
            loginUrl.pathname = '/login';
            loginUrl.search = `?redirect=${encodeURIComponent(pathname + search)}`;
            const response = NextResponse.redirect(loginUrl);
            if (sessionCookie) {
                response.cookies.delete('korjo_session');
            }
            return response;
        }
    }

    if (pathname.startsWith('/customers/')) {
        const identifier = pathname.replace('/customers/', '');

        if (!identifier || identifier.includes('/')) {
            return NextResponse.next();
        }

        const targetUrl = request.nextUrl.clone();
        targetUrl.pathname = `/customerNumber/${identifier}`;
        targetUrl.search = search;

        return NextResponse.redirect(targetUrl, 308);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*', '/customers/:path*'],
};
