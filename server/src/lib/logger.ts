import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "node:path";
import os from "node:os";

const isProduction = process.env.NODE_ENV === "production";
const logsDir = path.join(os.homedir(), ".devtodo", "logs");

const consoleFormat = isProduction
  ? winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
    )
  : winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: "HH:mm:ss" }),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? " " + JSON.stringify(meta) : "";
        return `${timestamp} ${level}: ${message}${metaStr}`;
      }),
    );

const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json(),
);

const appRotateTransport = new DailyRotateFile({
  filename: path.join(logsDir, "app-%DATE%.log"),
  datePattern: "YYYY-MM-DD",
  maxSize: "20m",
  maxFiles: "30d",
  zippedArchive: true,
  format: fileFormat,
});

const errorRotateTransport = new DailyRotateFile({
  filename: path.join(logsDir, "error-%DATE%.log"),
  datePattern: "YYYY-MM-DD",
  maxSize: "20m",
  maxFiles: "30d",
  zippedArchive: true,
  level: "error",
  format: fileFormat,
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
  transports: [
    new winston.transports.Console({ format: consoleFormat }),
    appRotateTransport,
    errorRotateTransport,
  ],
});
