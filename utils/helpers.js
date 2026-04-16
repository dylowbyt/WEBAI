export function sanitizeInput(input: string): string {
  return input.trim().replace(/\s+/g, " ").slice(0, 4000);
}

export function buildErrorResponse(message: string, code = 500) {
  return { error: true, message, code };
}

export function buildSuccessResponse<T>(data: T, meta?: Record<string, unknown>) {
  return { error: false, data, ...(meta ? { meta } : {}) };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
