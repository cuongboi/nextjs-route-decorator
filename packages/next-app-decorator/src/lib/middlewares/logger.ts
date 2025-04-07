import { createMethodMiddlewareDecorator } from "../decorators/generator";
import { HttpStatusCode } from "../http-status";
import { BaseError } from "../error";
import { LoggerService, LogLevel } from "../logger";

/**
 * Sample Method middleware
 * Logging middleware - logs request method and URL by Timestamp
 */
export const Logger = (level: LogLevel) => {
  if (!Object.values(LogLevel).includes(level)) {
    throw new BaseError("Invalid log level", HttpStatusCode.BadRequest);
  }

  const logger = new LoggerService({ level });

  return createMethodMiddlewareDecorator(async (req) => {
    const method = req.method;
    const url = req.url;

    logger.debug(`${method} ${url}`);
  });
};
