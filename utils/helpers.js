// utils/helpers.js

export function sanitizeInput(input) {
  return input.trim().replace(/\s+/g, " ").slice(0, 4000);
}

export function buildErrorResponse(message, code = 500) {
  return { error: true, message, code };
}

export function buildSuccessResponse(data, meta) {
  return { error: false, data, ...(meta ? { meta } : {}) };
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
