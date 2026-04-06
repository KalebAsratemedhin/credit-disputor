export class AppError extends Error {
  public readonly exposeDetailsToClient: boolean;

  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code?: string,
    public readonly details?: unknown,
    exposeDetailsToClient = false
  ) {
    super(message);
    this.name = "AppError";
    this.exposeDetailsToClient = exposeDetailsToClient;
    Error.captureStackTrace?.(this, this.constructor);
  }
}
