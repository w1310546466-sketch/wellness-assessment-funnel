import type { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api/response";
import { SESSION_COOKIE_NAME, requireAnonymousUser } from "@/lib/auth/session";
import { getCurrentAssessmentProgress } from "@/lib/assessment/service";
import { getStore } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const store = getStore();
    const user = await requireAnonymousUser(store, request.cookies.get(SESSION_COOKIE_NAME)?.value);
    const progress = await getCurrentAssessmentProgress(store, user.id);
    return ok(progress);
  } catch (error) {
    return fail(error);
  }
}

