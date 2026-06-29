import type { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api/response";
import { SESSION_COOKIE_NAME, requireAnonymousUser } from "@/lib/auth/session";
import { getStore } from "@/lib/db";
import { mockPayForUser } from "@/lib/subscription/service";

export async function POST(request: NextRequest) {
  try {
    const store = getStore();
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const user = await requireAnonymousUser(store, sessionToken);
    const rawPayload = await request.json().catch(() => ({}));
    const subscription = await mockPayForUser(store, {
      userId: user.id,
      sessionToken: sessionToken ?? "",
      rawPayload
    });

    return ok({
      status: subscription.status,
      paidAt: subscription.paidAt?.toISOString() ?? null
    });
  } catch (error) {
    return fail(error);
  }
}

