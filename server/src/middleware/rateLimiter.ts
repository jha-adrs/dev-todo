import rateLimit from "express-rate-limit";
import { logger } from "../lib/logger.js";

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 10,                     // 10 attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts, try again later" },
  handler: (req, res, _next, options) => {
    logger.warn("rate limit exceeded", { ip: req.ip, path: req.path });
    res.status(429).json(options.message);
  },
});
