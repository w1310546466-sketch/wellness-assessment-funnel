import { NextResponse } from "next/server";
import { AppError, isAppError } from "@/lib/errors";

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(
    {
      ok: true,
      data
    },
    { status }
  );
}

export function fail(error: unknown): NextResponse {
  const appError =
    isAppError(error) ?
      error :
      new AppError("INTERNAL_ERROR", "Unexpected server error", 500);

  return NextResponse.json(
    {
      ok: false,
      error: {
        code: appError.code,
        message: appError.message,
        details: appError.details ?? {}
      }
    },
    { status: appError.status }
  );
}

