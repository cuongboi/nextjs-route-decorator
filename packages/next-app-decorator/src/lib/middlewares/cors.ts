import { RouteMiddleware } from "../types";

interface CorsOptions {
  allowedOrigins?: string[];
  allowedMethods?: string[];
  allowedHeaders?: string[];
  allowCredentials?: boolean;
  maxAge?: number;
}

export const Cors =
  (options?: CorsOptions): RouteMiddleware =>
  (request) => {
    const {
      allowedOrigins = ["*"],
      allowedMethods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders = ["Content-Type", "Authorization"],
      allowCredentials = false,
      maxAge = 86400,
    } = options || {};

    const origin = request.headers.get("Origin");

    if (
      allowedOrigins.includes("*") ||
      (origin && allowedOrigins.includes(origin))
    ) {
      const headers: HeadersInit = {
        "Access-Control-Allow-Origin": origin || "*",
        "Access-Control-Allow-Methods": allowedMethods.join(", "),
        "Access-Control-Allow-Headers": allowedHeaders.join(", "),
        "Access-Control-Max-Age": maxAge.toString(),
      };

      if (allowCredentials) {
        headers["Access-Control-Allow-Credentials"] = "true";
      }

      return {
        headers,
      }
    }

    return {};
  };
