import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const { pathname, search } = request.nextUrl;

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
    matcher: ['/customers/:path*'],
};
