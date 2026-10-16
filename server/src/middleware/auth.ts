import { Request, Response, NextFunction } from "express";
import { config } from "../config";

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: "Unauthorized: Missing Authorization header" });
    return;
  }

  const parts = authHeader.split(" ");
  const token = parts.length === 2 && parts[0] === "Bearer" ? parts[1] : authHeader;

  if (token !== config.authToken) {
    res.status(403).json({ error: "Forbidden: Invalid token" });
    return;
  }

  next();
}

export function validateWsToken(token: string | undefined): boolean {
  return token === config.authToken;
}
