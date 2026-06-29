import { AppError } from "@/lib/errors";
import type { AnonymousUserRecord } from "@/lib/assessment/types";
import type { AppStore } from "@/lib/db/store";

export const SESSION_COOKIE_NAME = "rq_session";

export interface SessionResolution {
  user: AnonymousUserRecord;
  sessionToken: string;
  shouldSetCookie: boolean;
}

export async function getOrCreateAnonymousSession(
  store: AppStore,
  existingSessionToken?: string
): Promise<SessionResolution> {
  if (existingSessionToken) {
    const existingUser = await store.findUserBySessionToken(existingSessionToken);

    if (existingUser) {
      await store.touchAnonymousUser(existingUser.id, new Date());
      return {
        user: existingUser,
        sessionToken: existingSessionToken,
        shouldSetCookie: false
      };
    }
  }

  const sessionToken = crypto.randomUUID();
  const user = await store.createAnonymousUser(sessionToken);

  return {
    user,
    sessionToken,
    shouldSetCookie: true
  };
}

export async function requireAnonymousUser(
  store: AppStore,
  sessionToken?: string
): Promise<AnonymousUserRecord> {
  if (!sessionToken) {
    throw new AppError("UNAUTHORIZED", "Missing anonymous session", 401);
  }

  const user = await store.findUserBySessionToken(sessionToken);

  if (!user) {
    throw new AppError("UNAUTHORIZED", "Invalid anonymous session", 401);
  }

  await store.touchAnonymousUser(user.id, new Date());
  return user;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  };
}

