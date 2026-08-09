import jwt, { type SignOptions } from "jsonwebtoken";
import { Role } from "@prisma/client";
import { env, isProd } from "../config/env.js";
import { AppError } from "./error.js";
import { prisma } from "../lib/prisma.js";
import { NextFunction, Request, Response } from "express";

export type AuthUser = {
  id: string;
  email: string;
  role: Role;
  fullName: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

type JwtPayload = {
  sub: string;
  email: string;
  role: Role;
};

const SESSION_MS = 8 * 60 * 60 * 1000;
const REMEMBER_MS = 30 * 24 * 60 * 60 * 1000;

export function signToken(user: AuthUser, rememberMe = false) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    env.JWT_SECRET,
    {
      expiresIn: rememberMe ? "30d" : env.JWT_EXPIRES_IN,
    } as SignOptions
  );
}

export function setAuthCookie(
  res: Response,
  token: string,
  rememberMe = false
) {
  res.cookie("token", token, {
    httpOnly: true,
    secure: isProd,
    // Same-site via Vercel /api proxy (works on mobile Safari)
    sameSite: "lax",
    maxAge: rememberMe ? REMEMBER_MS : SESSION_MS,
    path: "/",
  });
}

export function clearAuthCookie(res: Response) {
  res.clearCookie("token", {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
  });
}

async function attachUser(req: Request, allowInactive = false) {
  const token = req.cookies?.token as string | undefined;
  if (!token) return null;

  const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) return null;
  if (!user.isActive && !allowInactive) {
    throw new AppError("Account is deactivated", 403);
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
  } satisfies AuthUser;
}

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    const user = await attachUser(req);
    if (!user) throw new AppError("Authentication required", 401);
    req.user = user;
    next();
  } catch (err) {
    if (err instanceof AppError) return next(err);
    next(new AppError("Authentication required", 401));
  }
}

export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    const user = await attachUser(req);
    if (user) req.user = user;
  } catch {
    // ignore invalid token for optional auth
  }
  next();
}

export function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  if (
    !req.user ||
    (req.user.role !== "ADMIN" && req.user.role !== "SUPER_ADMIN")
  ) {
    return next(new AppError("Admin access required", 403));
  }
  next();
}

export function requireSuperAdmin(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  if (!req.user || req.user.role !== "SUPER_ADMIN") {
    return next(new AppError("Super admin access required", 403));
  }
  next();
}

export function requireContractorOrAdmin(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  if (
    !req.user ||
    !["CONTRACTOR", "ADMIN", "SUPER_ADMIN"].includes(req.user.role)
  ) {
    return next(new AppError("Contractor or admin access required", 403));
  }
  next();
}
