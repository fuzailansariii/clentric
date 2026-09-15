export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function logError(context: string, error: unknown) {
  console.error(`[${context}]`, error);
}
