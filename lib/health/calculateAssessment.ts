import { z } from "zod";
import { AppError } from "@/lib/errors";
import { activityLevelSchema, bodyMetricsSchema, genderSchema, goalSchema } from "@/lib/assessment/validation";
import type { ActivityLevel, Gender, Goal, PredictionPoint, WellnessEstimate, WellnessInput } from "@/lib/assessment/types";

const wellnessInputSchema = bodyMetricsSchema.extend({
  gender: genderSchema,
  goal: goalSchema,
  activityLevel: activityLevelSchema
});

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  LOW: 1.2,
  MODERATE: 1.45,
  HIGH: 1.7
};

const SAFE_WEEKLY_LOSS_KG = 0.45;
const SAFE_WEEKLY_GAIN_KG = 0.25;

export function calculateWellnessEstimate(
  input: WellnessInput,
  options: { today?: Date } = {}
): WellnessEstimate {
  const parsed = wellnessInputSchema.safeParse(input);

  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", "Invalid wellness input", 400, {
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message
      }))
    });
  }

  const validInput = parsed.data;
  const today = normalizeDate(options.today ?? new Date());
  const bmi = roundTo(validInput.weightKg / Math.pow(validInput.heightCm / 100, 2), 1);
  const bmr = Math.round(calculateBmr(validInput));
  const tdee = Math.round(bmr * ACTIVITY_MULTIPLIERS[validInput.activityLevel]);
  const calorieRange = calculateSuggestedCalories(tdee, validInput.goal, validInput.weightKg, validInput.targetWeightKg);
  const timeline = calculateTimeline(validInput.weightKg, validInput.targetWeightKg, today);
  const targetBmi = roundTo(validInput.targetWeightKg / Math.pow(validInput.heightCm / 100, 2), 1);
  const unsafeTargetWarning = buildUnsafeTargetWarning(validInput, targetBmi);

  return {
    bmi,
    bmiCategory: categorizeBmi(bmi),
    bmr,
    tdee,
    suggestedCaloriesMin: calorieRange.min,
    suggestedCaloriesMax: calorieRange.max,
    targetDate: timeline.targetDate,
    summary: buildSummary(validInput.goal, bmi, timeline.weeks),
    unsafeTargetWarning,
    predictionCurve: timeline.predictionCurve
  };
}

function calculateBmr(input: WellnessInput): number {
  const base = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age;
  const genderOffset: Record<Gender, number> = {
    FEMALE: -161,
    MALE: 5,
    NON_BINARY: -78
  };

  return base + genderOffset[input.gender];
}

function calculateSuggestedCalories(tdee: number, goal: Goal, currentWeight: number, targetWeight: number): { min: number; max: number } {
  const wantsLoss = targetWeight < currentWeight || goal === "LOSE_WEIGHT";
  const wantsGain = targetWeight > currentWeight || goal === "BUILD_STRENGTH";

  if (wantsLoss) {
    return {
      min: clamp(Math.round(tdee - 500), 1200, 4200),
      max: clamp(Math.round(tdee - 300), 1200, 4200)
    };
  }

  if (wantsGain) {
    return {
      min: clamp(Math.round(tdee + 200), 1200, 4200),
      max: clamp(Math.round(tdee + 350), 1200, 4200)
    };
  }

  return {
    min: clamp(Math.round(tdee - 100), 1200, 4200),
    max: clamp(Math.round(tdee + 100), 1200, 4200)
  };
}

function calculateTimeline(currentWeight: number, targetWeight: number, today: Date): {
  targetDate: string | null;
  weeks: number;
  predictionCurve: PredictionPoint[];
} {
  const delta = targetWeight - currentWeight;

  if (Math.abs(delta) < 0.1) {
    return {
      targetDate: toIsoDate(today),
      weeks: 0,
      predictionCurve: [{ week: 0, date: toIsoDate(today), estimatedWeightKg: roundTo(currentWeight, 1) }]
    };
  }

  const weeklyChange = delta < 0 ? -SAFE_WEEKLY_LOSS_KG : SAFE_WEEKLY_GAIN_KG;
  const weeks = Math.ceil(Math.abs(delta / weeklyChange));
  const targetDate = addDays(today, weeks * 7);
  const predictionCurve: PredictionPoint[] = [];

  for (let week = 0; week <= weeks; week += 1) {
    const estimated = week === weeks ? targetWeight : currentWeight + weeklyChange * week;
    predictionCurve.push({
      week,
      date: toIsoDate(addDays(today, week * 7)),
      estimatedWeightKg: roundTo(estimated, 1)
    });
  }

  return {
    targetDate: toIsoDate(targetDate),
    weeks,
    predictionCurve
  };
}

function buildUnsafeTargetWarning(input: WellnessInput, targetBmi: number): string | null {
  const weightChangeRatio = Math.abs(input.targetWeightKg - input.weightKg) / input.weightKg;

  if (targetBmi < 18.5) {
    return "The selected target may be below a typical wellness range. Consider choosing a more conservative target.";
  }

  if (targetBmi > 32) {
    return "The selected target may still be above a typical wellness range. Consider using the estimate as a gradual planning guide.";
  }

  if (weightChangeRatio > 0.25) {
    return "This target represents a large change. A slower timeline may be more realistic and comfortable.";
  }

  return null;
}

function buildSummary(goal: Goal, bmi: number, weeks: number): string {
  const goalCopy: Record<Goal, string> = {
    LOSE_WEIGHT: "Your estimate focuses on gradual weight change and steady daily habits.",
    BUILD_STRENGTH: "Your estimate supports strength-focused progress with enough daily energy.",
    IMPROVE_ENERGY: "Your estimate is tuned toward consistent energy and manageable routines.",
    INCREASE_FLEXIBILITY: "Your estimate supports a light, sustainable wellness routine."
  };

  const timelineCopy = weeks === 0 ? "Your target is already close to your current baseline." : `The estimated timeline is about ${weeks} weeks.`;

  return `${goalCopy[goal]} Your BMI estimate is ${bmi}. ${timelineCopy} This is informational and not medical advice.`;
}

function categorizeBmi(bmi: number): string {
  if (bmi < 18.5) {
    return "LOW_RANGE";
  }

  if (bmi < 25) {
    return "TYPICAL_RANGE";
  }

  if (bmi < 30) {
    return "ELEVATED_RANGE";
  }

  return "HIGH_RANGE";
}

function normalizeDate(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function roundTo(value: number, digits: number): number {
  const factor = Math.pow(10, digits);
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

