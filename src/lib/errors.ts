export class NotFoundError extends Error {
  status = 404;
  constructor(msg: string) {
    super(msg);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends Error {
  status = 400;
  constructor(msg: string) {
    super(msg);
    this.name = "ValidationError";
  }
}

export class BadRequestError extends Error {
  status = 400;
  constructor(msg: string) {
    super(msg);
    this.name = "BadRequestError";
  }
}

export class UnauthorizedError extends Error {
  status = 401;
  constructor(msg: string) {
    super(msg);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  status = 403;
  constructor(msg: string) {
    super(msg);
    this.name = "ForbiddenError";
  }
}

export class InternalServerError extends Error {
  status = 500;
  requestId?: string;
  constructor(msg: string, requestId?: string) {
    super(msg);
    this.name = "InternalServerError";
    this.requestId = requestId;
  }
}
