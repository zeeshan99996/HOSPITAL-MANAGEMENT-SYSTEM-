import { Request, Response, NextFunction } from 'express';

interface RateLimitInfo {
  count: number;
  resetTime: number;
}

const store: Record<string, RateLimitInfo> = {};

// Clean up expired keys every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const key in store) {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  }
}, 300000);

/**
 * Enhanced memory-based rate limiting middleware.
 * Supports reverse proxies, user IDs, and admin exemptions.
 * @param limit Maximum number of requests allowed in the time window.
 * @param windowMs Time window in milliseconds.
 */
export const rateLimiter = (limit: number, windowMs: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    // System Admins get elevated rate limits for operational management
    const effectiveLimit = user?.role === 'admin' ? Math.max(limit * 5, 60) : limit;

    const forwarded = req.headers['x-forwarded-for'];
    const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : (req.ip || req.socket.remoteAddress || 'unknown');
    const key = user?.id ? `user_${user.id}_${req.baseUrl || ''}` : `${ip}_${req.baseUrl || ''}`;
    const now = Date.now();

    // Check if store record exists or expired
    if (!store[key] || now > store[key].resetTime) {
      store[key] = {
        count: 1,
        resetTime: now + windowMs
      };
      return next();
    }

    // Increment request count
    store[key].count++;

    // Check if limit exceeded
    if (store[key].count > effectiveLimit) {
      const retryAfter = Math.ceil((store[key].resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({
        message: `Too many requests. Please wait ${retryAfter}s before retrying.`
      });
    }

    next();
  };
};
