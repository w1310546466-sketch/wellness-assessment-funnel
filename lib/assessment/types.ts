export const STEP_KEYS = ["gender", "goal", "body", "activity"] as const;

export type StepKey = (typeof STEP_KEYS)[number];

export type Gender = "FEMALE" | "MALE" | "NON_BINARY";

export type Goal =
  | "LOSE_WEIGHT"
  | "BUILD_STRENGTH"
  | "IMPROVE_ENERGY"
  | "INCREASE_FLEXIBILITY";

export type ActivityLevel = "LOW" | "MODERATE" | "HIGH";

export type AssessmentStatus = "IN_PROGRESS" | "COMPLETED";

export type SubscriptionStatus = "FREE" | "ACTIVE" | "EXPIRED";

export type PaymentEventStatus = "SUCCESS" | "FAILED";

export interface AnonymousUserRecord {
  id: string;
  sessionToken: string;
  createdAt: Date;
  updatedAt: Date;
  lastSeenAt: Date;
}

export interface AssessmentRecord {
  id: string;
  userId: string;
  status: AssessmentStatus;
  currentStep: string;
  gender: Gender | null;
  goal: Goal | null;
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
  targetWeightKg: number | null;
  activityLevel: ActivityLevel | null;
  version: number;
  submittedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PredictionPoint {
  week: number;
  date: string;
  estimatedWeightKg: number;
}

export interface AssessmentResultRecord {
  id: string;
  assessmentId: string;
  bmi: number;
  bmiCategory: string;
  bmr: number;
  tdee: number;
  suggestedCaloriesMin: number;
  suggestedCaloriesMax: number;
  targetDate: Date | null;
  summary: string;
  unsafeTargetWarning: string | null;
  predictionCurve: PredictionPoint[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionRecord {
  id: string;
  userId: string;
  status: SubscriptionStatus;
  paidAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WellnessInput {
  gender: Gender;
  goal: Goal;
  age: number;
  heightCm: number;
  weightKg: number;
  targetWeightKg: number;
  activityLevel: ActivityLevel;
}

export interface WellnessEstimate {
  bmi: number;
  bmiCategory: string;
  bmr: number;
  tdee: number;
  suggestedCaloriesMin: number;
  suggestedCaloriesMax: number;
  targetDate: string | null;
  summary: string;
  unsafeTargetWarning: string | null;
  predictionCurve: PredictionPoint[];
}

