import { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger.js";

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  // Skip health checks to avoid log noise from monitoring
  if (req.path === "/api/health") {
    next();
    return;
  }

  const start = Date.now();

  res.on("finish", () => {
    logger.http("request", {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: Date.now() - start,
      ip: req.ip,
    });
  });

  next();
}
