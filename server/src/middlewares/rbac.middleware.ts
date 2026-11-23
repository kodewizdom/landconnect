import { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";

/**
 * Dual-layer RBAC middleware
 * Ensures user is authenticated (401) and holds one of the required roles (403).
 */
export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized: Authentication required" });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: "Forbidden: You do not have permission to perform this action",
        requiredRoles: allowedRoles,
        userRole: req.user.role,
      });
      return;
    }

    next();
  };
}
