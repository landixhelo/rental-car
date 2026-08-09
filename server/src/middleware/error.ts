import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { isProd } from "../config/env.js";

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

/** Never echo secrets / API keys / connection strings to the client. */
function safePublicMessage(raw: string | undefined): string {
  if (!raw) return "Ndodhi një gabim. Provo përsëri.";
  if (
    /sk_live_|sk_test_|whsec_|postgres(ql)?:\/\//i.test(raw) ||
    /Invalid API Key|API key/i.test(raw) ||
    /password|secret|token/i.test(raw)
  ) {
    return "Konfigurimi i pagesës ose serverit dështoi. Provo Cash/Transfer ose kontakto support.";
  }
  // Looks like a raw password / opaque secret dumped as message
  if (/^[A-Za-z0-9#@$%!&*]{10,40}$/.test(raw) && !/\s/.test(raw)) {
    return "Ndodhi një gabim teknik. Provo përsëri ose zgjidh Cash/Transfer.";
  }
  return raw;
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ZodError || (err as { name?: string })?.name === "ZodError") {
    const zodErr = err as ZodError;
    const first = zodErr.issues?.[0];
    const message =
      (first?.message && first.message !== "Required"
        ? first.message
        : first?.path?.length
          ? `${first.path.join(".")}: e detyrueshme`
          : null) || "Validimi dështoi. Kontrollo fushat.";
    return res.status(400).json({
      message,
      errors: typeof zodErr.flatten === "function" ? zodErr.flatten() : undefined,
    });
  }

  if (isAppError(err)) {
    return res
      .status(err.statusCode)
      .json({ message: safePublicMessage(err.message) });
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

  const prismaCode = (err as { code?: string })?.code;
  if (
    prismaCode === "P2022" ||
    (err instanceof Error && /column .* does not exist/i.test(err.message))
  ) {
    return res.status(500).json({
      message:
        "Databaza po përditësohet. Prisni 1 minutë dhe provo përsëri rezervimin.",
    });
  }

  return res.status(500).json({
    message: isProd
      ? "Ndodhi një gabim në server. Provo përsëri."
      : safePublicMessage(err instanceof Error ? err.message : undefined),
  });
}
