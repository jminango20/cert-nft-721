import { Request, Response, NextFunction } from "express";

export function requireApiKey(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const apiKey = process.env.API_KEY;
  const provided = req.headers["x-api-key"];

  if (!apiKey || provided !== apiKey) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
