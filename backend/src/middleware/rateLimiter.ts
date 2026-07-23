import { Request, Response, NextFunction } from 'express';

interface RateLimitInfo {
  count: number;
  resetTime: number;
}

const store: Record<string, RateLimitInfo> = {};

/**
 * Custom memory-based rate limiting middleware.
 * @param limit Maximum number of requests allowed in the time window.
 * @param windowMs Time window in milliseconds.
 */
export const rateLimiter = (limit: number, windowMs: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    // Check if store record exists or expired
    if (!store[ip] || now > store[ip].resetTime) {
      store[ip] = {
        count: 1,
        resetTime: now + windowMs
      };
      return next();
    }

    // Increment request count
    store[ip].count++;

    // Check if limit exceeded
    if (store[ip].count > limit) {
      const retryAfter = Math.ceil((store[ip].resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({
        message: `Too many requests from this client. Please try again after ${retryAfter} seconds.`
      });
    }

    next();
  };
};
