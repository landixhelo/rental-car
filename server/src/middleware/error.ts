import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
  }
}

export function notFound(_req: Request, _res: Response, next: NextFunction) {
  next(new AppError("Route not found", 404));
}

function isAppError(err: unknown): err is AppError {
  return (
    err instanceof AppError ||
    (typeof err === "object" &&
      err !== null &&
      (err as { name?: string }).name === "AppError" &&
      typeof (err as { statusCode?: unknown }).statusCode === "number" &&
      typeof (err as { message?: unknown }).message === "string")
  );
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ZodError || (err as { name?: string })?.name === "ZodError") {
    const zodErr = err as ZodError;
    return res.status(400).json({
      message: "Validation failed",
      errors: typeof zodErr.flatten === "function" ? zodErr.flatten() : undefined,
    });
  }

  if (isAppError(err)) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  // Multer file filter / size errors
  const multerErr = err as { code?: string; message?: string };
  if (multerErr?.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      message: "Foto shumë e madhe (max 3MB për skedar). Kompreso ose zgjidh foto më të vogël.",
    });
  }
  if (multerErr?.code === "LIMIT_FILE_COUNT" || multerErr?.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).json({ message: "Shumë skedarë. Maksimumi është 8 foto." });
  }
  if (err instanceof Error && /File too large|Only JPG|Unexpected field/i.test(err.message)) {
    return res.status(400).json({ message: err.message });
  }

  console.error(err);
  return res.status(500).json({
    message: err instanceof Error ? err.message : "Internal server error",
  });
}
