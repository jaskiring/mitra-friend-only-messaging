import { randomUUID } from "node:crypto";
import type { Request, Response, NextFunction } from "express";

export function requestContext(req: Request, res: Response, next: NextFunction) {
  const requestId = randomUUID();
  res.setHeader("x-request-id", requestId);

  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    console.log(`[${requestId}] ${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`);
  });

  next();
}
