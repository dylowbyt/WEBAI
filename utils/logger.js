// utils/logger.js

export function log(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  const prefix = { info: "INFO", warn: "WARN", error: "ERROR" }[level] || level.toUpperCase();
  console.log(`[${timestamp}] ${prefix}: ${message}`, Object.keys(data).length ? data : "");
}

export const logger = {
  info:  (msg, data) => log("info",  msg, data),
  warn:  (msg, data) => log("warn",  msg, data),
  error: (msg, data) => log("error", msg, data),
};
