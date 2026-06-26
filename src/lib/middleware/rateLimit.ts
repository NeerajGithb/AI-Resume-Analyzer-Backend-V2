import { NextRequest } from 'next/server';
import { AppError } from '../utils/errors';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

/**
 * Simple in-memory rate limiter for serverless
 * Note: In production with multiple instances, use Redis or Vercel KV
 */
export function rateLimit(windowMs: number, maxRequests: number) {
  return async (request: NextRequest) => {
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    const key = `${ip}-${request.nextUrl.pathname}`;
    const now = Date.now();

    if (!store[key] || now > store[key].resetTime) {
      store[key] = {
        count: 1,
        resetTime: now + windowMs,
      };
      return;
    }

    store[key].count++;

    if (store[key].count > maxRequests) {
      throw new AppError(429, 'Too many requests. Please try again later.');
    }
  };
}

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach(key => {
    if (now > store[key].resetTime) {
      delete store[key];
    }
  });
}, 5 * 60 * 1000);
