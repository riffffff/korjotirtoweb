import { NextRequest } from 'next/server';

interface RateLimitRecord {
    count: number;
    resetTime: number;
}

/**
 * Extract client IP from incoming request with fallback to localhost.
 */
export function getClientIp(request: Request | NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        const firstIp = forwarded.split(',')[0]?.trim();
        if (firstIp) return firstIp;
    }
    const realIp = request.headers.get('x-real-ip')?.trim();
    if (realIp) return realIp;

    if ('ip' in request && typeof (request as { ip?: string }).ip === 'string') {
        const reqIp = (request as { ip?: string }).ip?.trim();
        if (reqIp) return reqIp;
    }

    return '127.0.0.1';
}

/**
 * Sliding window rate limiter for counting attempts (e.g., uploads or API calls).
 */
export function createSlidingWindowLimiter(options: {
    maxAttempts: number;
    windowMs: number;
}) {
    const tracker = new Map<string, RateLimitRecord>();

    const cleanup = () => {
        const now = Date.now();
        if (tracker.size > 5000) {
            for (const [key, value] of tracker.entries()) {
                if (now > value.resetTime) {
                    tracker.delete(key);
                }
            }
        }
    };

    return {
        consume(key: string): { success: boolean; remaining: number; retryAfterSeconds: number } {
            cleanup();
            const now = Date.now();
            const record = tracker.get(key);

            if (!record || now > record.resetTime) {
                const resetTime = now + options.windowMs;
                tracker.set(key, { count: 1, resetTime });
                return {
                    success: true,
                    remaining: options.maxAttempts - 1,
                    retryAfterSeconds: Math.ceil(options.windowMs / 1000),
                };
            }

            if (record.count >= options.maxAttempts) {
                const retryAfterSeconds = Math.max(1, Math.ceil((record.resetTime - now) / 1000));
                return {
                    success: false,
                    remaining: 0,
                    retryAfterSeconds,
                };
            }

            record.count += 1;
            const remaining = Math.max(0, options.maxAttempts - record.count);
            const retryAfterSeconds = Math.max(1, Math.ceil((record.resetTime - now) / 1000));
            return {
                success: true,
                remaining,
                retryAfterSeconds,
            };
        },
        reset(key: string) {
            tracker.delete(key);
        },
    };
}

/**
 * Failure-based rate limiter (e.g., login brute-force protection).
 * Only increments when an attempt fails. Clears upon successful authentication.
 */
export function createFailureRateLimiter(options: {
    maxFailures: number;
    windowMs: number;
}) {
    const tracker = new Map<string, RateLimitRecord>();

    const cleanup = () => {
        const now = Date.now();
        if (tracker.size > 5000) {
            for (const [key, value] of tracker.entries()) {
                if (now > value.resetTime) {
                    tracker.delete(key);
                }
            }
        }
    };

    return {
        isBlocked(key: string): { blocked: boolean; retryAfterSeconds: number } {
            cleanup();
            const now = Date.now();
            const record = tracker.get(key);
            if (!record) return { blocked: false, retryAfterSeconds: 0 };
            if (now > record.resetTime) {
                tracker.delete(key);
                return { blocked: false, retryAfterSeconds: 0 };
            }
            if (record.count >= options.maxFailures) {
                return {
                    blocked: true,
                    retryAfterSeconds: Math.max(1, Math.ceil((record.resetTime - now) / 1000)),
                };
            }
            return { blocked: false, retryAfterSeconds: 0 };
        },
        recordFailure(key: string): { blocked: boolean; remaining: number; retryAfterSeconds: number } {
            cleanup();
            const now = Date.now();
            const record = tracker.get(key);

            if (!record || now > record.resetTime) {
                const resetTime = now + options.windowMs;
                tracker.set(key, { count: 1, resetTime });
                return {
                    blocked: options.maxFailures <= 1,
                    remaining: options.maxFailures - 1,
                    retryAfterSeconds: Math.ceil(options.windowMs / 1000),
                };
            }

            record.count += 1;
            const retryAfterSeconds = Math.max(1, Math.ceil((record.resetTime - now) / 1000));
            return {
                blocked: record.count >= options.maxFailures,
                remaining: Math.max(0, options.maxFailures - record.count),
                retryAfterSeconds,
            };
        },
        recordSuccess(key: string) {
            tracker.delete(key);
        },
        reset(key: string) {
            tracker.delete(key);
        },
    };
}

// 5 failed login attempts per 15 minutes per IP
export const loginRateLimiter = createFailureRateLimiter({
    maxFailures: 5,
    windowMs: 15 * 60 * 1000,
});

// 5 payment proof uploads per 10 minutes per IP
export const paymentProofUploadLimiter = createSlidingWindowLimiter({
    maxAttempts: 5,
    windowMs: 10 * 60 * 1000,
});
