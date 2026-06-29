import { AppError } from "@/lib/errors";
import type { AssessmentResultRecord } from "@/lib/assessment/types";
import type { AppStore } from "@/lib/db/store";

export interface RedactedResultResponse {
  isPaid: false;
  bmi: number;
  bmiCategory: string;
  summary: string;
  unsafeTargetWarning: string | null;
  lockedFields: string[];
  paywallMessage: string;
}

export interface FullResultResponse {
  isPaid: true;
  bmi: number;
  bmiCategory: string;
  bmr: number;
  tdee: number;
  suggestedCaloriesMin: number;
  suggestedCaloriesMax: number;
  targetDate: string | null;
  summary: string;
  unsafeTargetWarning: string | null;
  predictionCurve: AssessmentResultRecord["predictionCurve"];
}

export type ResultResponse = RedactedResultResponse | FullResultResponse;

export async function getResultForUser(store: AppStore, userId: string): Promise<ResultResponse> {
  const completed = await store.findLatestCompletedAssessmentWithResult(userId);

  if (!completed) {
    throw new AppError("NOT_FOUND", "Completed assessment result not found", 404);
  }

  const subscription = await store.findSubscription(userId);
  const isPaid = subscription?.status === "ACTIVE" && (!subscription.expiresAt || subscription.expiresAt > new Date());

  return buildResultResponse(completed.result, isPaid);
}

export function buildResultResponse(result: AssessmentResultRecord, isPaid: boolean): ResultResponse {
  if (!isPaid) {
    return {
      isPaid: false,
      bmi: result.bmi,
      bmiCategory: result.bmiCategory,
      summary: result.summary,
      unsafeTargetWarning: result.unsafeTargetWarning,
      lockedFields: ["bmr", "tdee", "suggestedCaloriesMin", "suggestedCaloriesMax", "targetDate", "predictionCurve"],
      paywallMessage: "Unlock your full wellness estimate and estimated timeline."
    };
  }

  return {
    isPaid: true,
    bmi: result.bmi,
    bmiCategory: result.bmiCategory,
    bmr: result.bmr,
    tdee: result.tdee,
    suggestedCaloriesMin: result.suggestedCaloriesMin,
    suggestedCaloriesMax: result.suggestedCaloriesMax,
    targetDate: result.targetDate ? result.targetDate.toISOString().slice(0, 10) : null,
    summary: result.summary,
    unsafeTargetWarning: result.unsafeTargetWarning,
    predictionCurve: result.predictionCurve
  };
}

export async function mockPayForUser(
  store: AppStore,
  input: {
    userId: string;
    sessionToken: string;
    rawPayload: unknown;
  }
) {
  const now = new Date();
  const subscription = await store.upsertActiveSubscription(input.userId, now);

  await store.createPaymentEvent({
    userId: input.userId,
    sessionToken: input.sessionToken,
    type: "MOCK_PAY_SUCCESS",
    status: "SUCCESS",
    rawPayload: input.rawPayload ?? {}
  });

  return subscription;
}

