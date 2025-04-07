import { createControllerMiddlewareDecorator } from "../decorators/generator";
import { LRUCache } from "lru-cache";
import { HttpStatusCode } from "../http-status";
import { BaseError } from "../error";

/**
 * Sample Controller middleware
 * Throttle middleware - limits requests per IP address
 * @param rateLimit Requests allowed per window
 * @param windowMs Time window in milliseconds
 */
export const Throttle = (
  rateLimit: number = 100,
  windowMs: number = 60 * 1000
) => {
  const cache = new LRUCache<string, number>({
    max: 1e5,
    ttl: windowMs,
    noUpdateTTL: true,
  });

  return createControllerMiddlewareDecorator((req, next) => {
    const ip =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const count = cache.get(ip) || 0;

    if (count >= rateLimit) {
      throw new BaseError("Too Many Requests", HttpStatusCode.TooManyRequests);
    }

    cache.set(ip, count + 1);
  });
};
