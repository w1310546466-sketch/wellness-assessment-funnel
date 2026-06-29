import { AppError } from "@/lib/errors";
import { calculateWellnessEstimate } from "@/lib/health/calculateAssessment";
import { deriveNextStep, isAssessmentComplete, toAssessmentProgress, toWellnessInput } from "@/lib/assessment/progress";
import { validateStepPayload } from "@/lib/assessment/validation";
import type { AssessmentProgress } from "@/lib/assessment/progress";
import type { AssessmentRecord, AssessmentResultRecord } from "@/lib/assessment/types";
import type { AppStore } from "@/lib/db/store";

export async function getCurrentAssessmentProgress(store: AppStore, userId: string): Promise<AssessmentProgress> {
  const current = await store.findCurrentAssessment(userId);

  if (current) {
    return toAssessmentProgress(current);
  }

  const latest = await store.findLatestAssessment(userId);

  if (latest?.status === "COMPLETED") {
    return toAssessmentProgress(latest);
  }

  const created = await store.createAssessment(userId);
  return toAssessmentProgress(created);
}

export async function saveAssessmentStep(
  store: AppStore,
  userId: string,
  stepKey: string,
  payload: unknown
): Promise<AssessmentProgress> {
  const patch = validateStepPayload(stepKey, payload);
  const current = (await store.findCurrentAssessment(userId)) ?? (await store.createAssessment(userId));
  const merged = {
    ...current,
    ...patch
  } satisfies AssessmentRecord;
  const nextStep = deriveNextStep(merged);
  const updated = await store.updateAssessment(current.id, {
    ...patch,
    currentStep: nextStep ?? "review"
  });

  return toAssessmentProgress(updated);
}

export async function submitAssessment(
  store: AppStore,
  userId: string,
  options: { today?: Date } = {}
): Promise<{
  assessment: AssessmentRecord;
  result: AssessmentResultRecord;
}> {
  const current = await store.findCurrentAssessment(userId);

  if (!current) {
    const latestCompleted = await store.findLatestCompletedAssessmentWithResult(userId);

    if (latestCompleted) {
      return latestCompleted;
    }

    throw new AppError("NOT_FOUND", "Assessment not found", 404);
  }

  if (!isAssessmentComplete(current)) {
    throw new AppError("INCOMPLETE_ASSESSMENT", "Assessment is not complete", 409, {
      nextStep: deriveNextStep(current)
    });
  }

  const input = toWellnessInput(current);

  if (!input) {
    throw new AppError("INCOMPLETE_ASSESSMENT", "Assessment is not complete", 409);
  }

  const estimate = calculateWellnessEstimate(input, options);

  return store.completeAssessmentWithResult(
    current.id,
    {
      assessmentId: current.id,
      bmi: estimate.bmi,
      bmiCategory: estimate.bmiCategory,
      bmr: estimate.bmr,
      tdee: estimate.tdee,
      suggestedCaloriesMin: estimate.suggestedCaloriesMin,
      suggestedCaloriesMax: estimate.suggestedCaloriesMax,
      targetDate: estimate.targetDate ? new Date(`${estimate.targetDate}T00:00:00.000Z`) : null,
      summary: estimate.summary,
      unsafeTargetWarning: estimate.unsafeTargetWarning,
      predictionCurve: estimate.predictionCurve
    },
    new Date()
  );
}

