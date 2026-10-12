export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogContext = Record<string, unknown>;
type LogWriter = Pick<Console, 'debug' | 'info' | 'warn' | 'error'>;

const sensitiveKeyPattern = /(token|secret|password|authorization|cookie)/i;

function redact(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redact);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        sensitiveKeyPattern.test(key) ? '[REDACTED]' : redact(nestedValue),
      ]),
    );
  }
  return value;
}

export type Logger = {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
};

export function createLogger(minimumLevel: LogLevel, write: LogWriter = console): Logger {
  const priorities: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

  function log(level: LogLevel, message: string, context?: LogContext): void {
    if (priorities[level] < priorities[minimumLevel]) {
      return;
    }
    const entry = JSON.stringify({
      level,
      message,
      ...(context === undefined ? {} : { context: redact(context) }),
      timestamp: new Date().toISOString(),
    });
    write[level](entry);
  }

  return {
    debug: (message, context) => log('debug', message, context),
    info: (message, context) => log('info', message, context),
    warn: (message, context) => log('warn', message, context),
    error: (message, context) => log('error', message, context),
  };
}
