import type { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api/response";
import { saveAssessmentStep } from "@/lib/assessment/service";
import { SESSION_COOKIE_NAME, requireAnonymousUser } from "@/lib/auth/session";
import { getStore } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ stepKey: string }> }
) {
  try {
    const store = getStore();
    const user = await requireAnonymousUser(store, request.cookies.get(SESSION_COOKIE_NAME)?.value);
    const { stepKey } = await context.params;
    const payload = await request.json();
    const progress = await saveAssessmentStep(store, user.id, stepKey, payload);
    return ok(progress);
  } catch (error) {
    return fail(error);
  }
}

