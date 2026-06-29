import type { AssessmentRecord, StepKey, WellnessInput } from "@/lib/assessment/types";

export interface AssessmentProgress {
  assessmentId: string;
  status: AssessmentRecord["status"];
  currentStep: string;
  completedSteps: StepKey[];
  nextStep: StepKey | null;
  values: {
    gender: AssessmentRecord["gender"];
    goal: AssessmentRecord["goal"];
    age: AssessmentRecord["age"];
    heightCm: AssessmentRecord["heightCm"];
    weightKg: AssessmentRecord["weightKg"];
    targetWeightKg: AssessmentRecord["targetWeightKg"];
    activityLevel: AssessmentRecord["activityLevel"];
  };
}

export function deriveCompletedSteps(assessment: AssessmentRecord): StepKey[] {
  const completed: StepKey[] = [];

  if (assessment.gender) {
    completed.push("gender");
  }

  if (assessment.goal) {
    completed.push("goal");
  }

  if (
    assessment.age !== null &&
    assessment.heightCm !== null &&
    assessment.weightKg !== null &&
    assessment.targetWeightKg !== null
  ) {
    completed.push("body");
  }

  if (assessment.activityLevel) {
    completed.push("activity");
  }

  return completed;
}

export function deriveNextStep(assessment: AssessmentRecord): StepKey | null {
  const completed = new Set(deriveCompletedSteps(assessment));
  const order: StepKey[] = ["gender", "goal", "body", "activity"];
  return order.find((step) => !completed.has(step)) ?? null;
}

export function isAssessmentComplete(assessment: AssessmentRecord): boolean {
  return deriveNextStep(assessment) === null;
}

export function toAssessmentProgress(assessment: AssessmentRecord): AssessmentProgress {
  const nextStep = assessment.status === "COMPLETED" ? null : deriveNextStep(assessment);

  return {
    assessmentId: assessment.id,
    status: assessment.status,
    currentStep: assessment.status === "COMPLETED" ? "completed" : nextStep ?? "review",
    completedSteps: deriveCompletedSteps(assessment),
    nextStep,
    values: {
      gender: assessment.gender,
      goal: assessment.goal,
      age: assessment.age,
      heightCm: assessment.heightCm,
      weightKg: assessment.weightKg,
      targetWeightKg: assessment.targetWeightKg,
      activityLevel: assessment.activityLevel
    }
  };
}

export function toWellnessInput(assessment: AssessmentRecord): WellnessInput | null {
  if (
    !assessment.gender ||
    !assessment.goal ||
    assessment.age === null ||
    assessment.heightCm === null ||
    assessment.weightKg === null ||
    assessment.targetWeightKg === null ||
    !assessment.activityLevel
  ) {
    return null;
  }

  return {
    gender: assessment.gender,
    goal: assessment.goal,
    age: assessment.age,
    heightCm: assessment.heightCm,
    weightKg: assessment.weightKg,
    targetWeightKg: assessment.targetWeightKg,
    activityLevel: assessment.activityLevel
  };
}

