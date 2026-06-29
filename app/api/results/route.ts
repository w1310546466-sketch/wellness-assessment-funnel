import type { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api/response";
import { SESSION_COOKIE_NAME, requireAnonymousUser } from "@/lib/auth/session";
import { getStore } from "@/lib/db";
import { getResultForUser } from "@/lib/subscription/service";

export async function GET(request: NextRequest) {
  try {
    const store = getStore();
    const user = await requireAnonymousUser(store, request.cookies.get(SESSION_COOKIE_NAME)?.value);
    const result = await getResultForUser(store, user.id);
    return ok(result);
  } catch (error) {
    return fail(error);
  }
}

