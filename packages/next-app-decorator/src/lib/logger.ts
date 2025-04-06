import toSource from "tosource";
import { injectable } from "tsyringe";

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  metadata?: Record<string, any>;
}

// Configuration interface for dependency injection
interface LoggerConfig {
  level?: LogLevel;
}

@injectable()
export class LoggerService {
  private currentLevel: LogLevel;
  private readonly colors = {
    [LogLevel.DEBUG]: "\x1b[36m", // Cyan
    [LogLevel.INFO]: "\x1b[32m", // Green
    [LogLevel.WARN]: "\x1b[33m", // Yellow
    [LogLevel.ERROR]: "\x1b[31m", // Red
    RESET: "\x1b[0m", // Reset color
  };

  // Constructor accepts optional config for injection
  constructor(config: LoggerConfig = {}) {
    this.currentLevel = config.level ?? LogLevel.INFO;
  }

  public setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  private formatMessage(entry: LogEntry): string {
    const levelStr = LogLevel[entry.level].padEnd(5);
    const timeStr = entry.timestamp.toISOString();
    const color = this.colors[entry.level];
    const reset = this.colors.RESET;

    let message = `${color}[${timeStr}] [${levelStr}] ${entry.message}${reset}`;

    if (entry.metadata) {
      message += ` ${toSource(entry.metadata)}`;
    }
    return message;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.currentLevel;
  }

  private log(
    level: LogLevel,
    message: string,
    metadata?: Record<string, any>
  ): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      metadata,
    };

    const formattedMessage = this.formatMessage(entry);

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage);
        break;
    }
  }

  public debug(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  public info(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, metadata);
  }

  public warn(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, metadata);
  }

  public error(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, metadata);
  }
}
