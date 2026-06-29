import { z } from "zod";
import { AppError } from "@/lib/errors";
import type { StepKey } from "@/lib/assessment/types";

export const genderSchema = z.enum(["FEMALE", "MALE", "NON_BINARY"]);
export const goalSchema = z.enum([
  "LOSE_WEIGHT",
  "BUILD_STRENGTH",
  "IMPROVE_ENERGY",
  "INCREASE_FLEXIBILITY"
]);
export const activityLevelSchema = z.enum(["LOW", "MODERATE", "HIGH"]);

export const bodyMetricsSchema = z
  .object({
    age: z.number().int().min(16).max(85),
    heightCm: z.number().min(120).max(230),
    weightKg: z.number().min(35).max(250),
    targetWeightKg: z.number().min(35).max(250)
  })
  .strict();

const stepSchemas = {
  gender: z.object({ gender: genderSchema }).strict(),
  goal: z.object({ goal: goalSchema }).strict(),
  body: bodyMetricsSchema,
  activity: z.object({ activityLevel: activityLevelSchema }).strict()
} satisfies Record<StepKey, z.ZodTypeAny>;

export type StepPatch = Partial<{
  gender: z.infer<typeof genderSchema>;
  goal: z.infer<typeof goalSchema>;
  age: number;
  heightCm: number;
  weightKg: number;
  targetWeightKg: number;
  activityLevel: z.infer<typeof activityLevelSchema>;
}>;

export function validateStepPayload(stepKey: string, payload: unknown): StepPatch {
  if (!isStepKey(stepKey)) {
    throw new AppError("VALIDATION_ERROR", "Unsupported assessment step", 400, {
      stepKey
    });
  }

  const parsed = stepSchemas[stepKey].safeParse(payload);

  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", "Invalid assessment step payload", 400, {
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message
      }))
    });
  }

  return parsed.data;
}

export function isStepKey(value: string): value is StepKey {
  return ["gender", "goal", "body", "activity"].includes(value);
}

