import { HttpStatusCode } from "./http-status";

export class BaseError extends Error {
  constructor(
    public message: string,
    public code: number
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends BaseError {
  constructor(message?: string) {
    super(message ?? "Not found", HttpStatusCode.NotFound);
  }
}

export class MethodNotAllowedError extends BaseError {
  constructor(message?: string) {
    super(message ?? "Method not allowed", HttpStatusCode.MethodNotAllowed);
  }
}
