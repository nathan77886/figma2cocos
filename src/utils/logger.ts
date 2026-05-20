export interface Logger {
  info(message: string, payload?: unknown): void;
  warn(message: string, payload?: unknown): void;
  error(message: string, payload?: unknown): void;
}

function redact(payload?: unknown): unknown {
  if (!payload || typeof payload !== 'object') return payload;
  const text = JSON.stringify(payload);
  return JSON.parse(text.replace(/figd_[A-Za-z0-9_\-]+/g, '[REDACTED_TOKEN]'));
}

export const logger: Logger = {
  info(message, payload) {
    if (payload === undefined) console.log(message);
    else console.log(message, redact(payload));
  },
  warn(message, payload) {
    if (payload === undefined) console.warn(message);
    else console.warn(message, redact(payload));
  },
  error(message, payload) {
    if (payload === undefined) console.error(message);
    else console.error(message, redact(payload));
  }
};
