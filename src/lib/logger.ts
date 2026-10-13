/**
 * Safe logger that redacts sensitive fields such as passwords, tokens, and authorization headers.
 */

const SENSITIVE_KEYS = ['password', 'token', 'access_token', 'authorization', 'secret', 'apiKey'];

function sanitize(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return value;
  if (typeof value !== 'object') return value;

  if (Array.isArray(value)) {
    return value.map(sanitize);
  }

  const sanitizedObj: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.some((sensitive) => k.toLowerCase().includes(sensitive.toLowerCase()))) {
      sanitizedObj[k] = '***REDACTED***';
    } else if (typeof v === 'object' && v !== null) {
      sanitizedObj[k] = sanitize(v);
    } else {
      sanitizedObj[k] = v;
    }
  }
  return sanitizedObj;
}

const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

export const safeLogger = {
  info: (message: string, ...args: unknown[]) => {
    if (isDev) {
      console.log(`[INFO] ${message}`, ...args.map(sanitize));
    }
  },
  warn: (message: string, ...args: unknown[]) => {
    if (isDev) {
      console.warn(`[WARN] ${message}`, ...args.map(sanitize));
    }
  },
  error: (message: string, ...args: unknown[]) => {
    if (isDev) {
      console.error(`[ERROR] ${message}`, ...args.map(sanitize));
    }
  },
};
