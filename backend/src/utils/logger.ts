// ============================================================
// Structured Logger Utility
// ============================================================

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

/**
 * Structured logger for Lambda functions.
 * Outputs JSON-formatted logs for CloudWatch.
 */
class Logger {
  private serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    const entry: LogEntry & { service: string } = {
      level,
      message,
      timestamp: new Date().toISOString(),
      service: this.serviceName,
      ...(context && { context }),
    };
    console.log(JSON.stringify(entry));
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('INFO', message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log('WARN', message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log('ERROR', message, context);
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log('DEBUG', message, context);
  }
}

export function createLogger(serviceName: string): Logger {
  return new Logger(serviceName);
}
