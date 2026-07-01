import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

export function requireApiKey(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const apiKey = process.env.API_KEY;
  const provided = req.headers["x-api-key"];

  if (!apiKey || typeof provided !== "string" || !timingSafeEqual(provided, apiKey)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
