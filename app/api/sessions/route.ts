import type { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api/response";
import { getOrCreateAnonymousSession, SESSION_COOKIE_NAME, sessionCookieOptions } from "@/lib/auth/session";
import { getStore } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const store = getStore();
    const existingToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = await getOrCreateAnonymousSession(store, existingToken);
    const response = ok(
      {
        userId: session.user.id,
        sessionCookie: SESSION_COOKIE_NAME
      },
      session.shouldSetCookie ? 201 : 200
    );

    if (session.shouldSetCookie) {
      response.cookies.set(SESSION_COOKIE_NAME, session.sessionToken, sessionCookieOptions());
    }

    return response;
  } catch (error) {
    return fail(error);
  }
}

