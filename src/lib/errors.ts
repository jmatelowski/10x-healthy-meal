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
