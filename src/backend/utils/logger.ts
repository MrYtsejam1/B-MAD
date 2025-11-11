/**
 * Simple logger utility
 * In production, this would use Winston or similar
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: any;
}

export class Logger {
  private static formatLog(level: LogLevel, message: string, data?: any): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      data
    };
  }

  static info(message: string, data?: any): void {
    const log = this.formatLog('info', message, data);
    console.log(JSON.stringify(log));
  }

  static warn(message: string, data?: any): void {
    const log = this.formatLog('warn', message, data);
    console.warn(JSON.stringify(log));
  }

  static error(message: string, data?: any): void {
    const log = this.formatLog('error', message, data);
    console.error(JSON.stringify(log));
  }

  static debug(message: string, data?: any): void {
    if (process.env.NODE_ENV === 'development' || process.env.LOG_LEVEL === 'debug') {
      const log = this.formatLog('debug', message, data);
      console.debug(JSON.stringify(log));
    }
  }
}

export const logger = Logger;
