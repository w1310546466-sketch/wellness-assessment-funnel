import type {
  AnonymousUserRecord,
  AssessmentRecord,
  AssessmentResultRecord,
  PaymentEventStatus,
  PredictionPoint,
  SubscriptionRecord
} from "@/lib/assessment/types";

export interface AssessmentResultInput {
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
}

export interface PaymentEventInput {
  userId: string;
  sessionToken: string;
  type: string;
  status: PaymentEventStatus;
  rawPayload: unknown;
}

export interface AppStore {
  findUserBySessionToken(sessionToken: string): Promise<AnonymousUserRecord | null>;
  createAnonymousUser(sessionToken: string): Promise<AnonymousUserRecord>;
  touchAnonymousUser(userId: string, now: Date): Promise<void>;

  findCurrentAssessment(userId: string): Promise<AssessmentRecord | null>;
  findLatestAssessment(userId: string): Promise<AssessmentRecord | null>;
  createAssessment(userId: string): Promise<AssessmentRecord>;
  updateAssessment(assessmentId: string, patch: Partial<AssessmentRecord>): Promise<AssessmentRecord>;

  findResultByAssessmentId(assessmentId: string): Promise<AssessmentResultRecord | null>;
  findLatestCompletedAssessmentWithResult(userId: string): Promise<{
    assessment: AssessmentRecord;
    result: AssessmentResultRecord;
  } | null>;
  completeAssessmentWithResult(
    assessmentId: string,
    result: AssessmentResultInput,
    submittedAt: Date
  ): Promise<{
    assessment: AssessmentRecord;
    result: AssessmentResultRecord;
  }>;

  findSubscription(userId: string): Promise<SubscriptionRecord | null>;
  upsertActiveSubscription(userId: string, now: Date): Promise<SubscriptionRecord>;
  createPaymentEvent(input: PaymentEventInput): Promise<void>;
}

