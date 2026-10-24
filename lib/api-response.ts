import { NextResponse } from 'next/server';

export function successResponse<T>(
    data?: T,
    message?: string,
    status = 200,
): NextResponse {
    return NextResponse.json(
        {
            success: true,
            ...(data === undefined ? {} : { data }),
            ...(message ? { message } : {}),
        },
        { status },
    );
}

export function errorResponse(error: string, status = 400): NextResponse {
    return NextResponse.json(
        {
            success: false,
            error,
        },
        { status },
    );
}
