import type { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api/response";
import { submitAssessment } from "@/lib/assessment/service";
import { SESSION_COOKIE_NAME, requireAnonymousUser } from "@/lib/auth/session";
import { getStore } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const store = getStore();
    const user = await requireAnonymousUser(store, request.cookies.get(SESSION_COOKIE_NAME)?.value);
    const submitted = await submitAssessment(store, user.id);

    return ok({
      assessmentId: submitted.assessment.id,
      resultId: submitted.result.id,
      status: submitted.assessment.status
    });
  } catch (error) {
    return fail(error);
  }
}

