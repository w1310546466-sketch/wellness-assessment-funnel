import type { Prisma } from "@prisma/client";
import type {
  AnonymousUserRecord,
  AssessmentRecord,
  AssessmentResultRecord,
  PredictionPoint,
  SubscriptionRecord
} from "@/lib/assessment/types";
import { prisma } from "@/lib/db/prisma";
import type { AppStore, AssessmentResultInput, PaymentEventInput } from "@/lib/db/store";

function mapUser(user: {
  id: string;
  sessionToken: string;
  createdAt: Date;
  updatedAt: Date;
  lastSeenAt: Date;
}): AnonymousUserRecord {
  return user;
}

function mapAssessment(assessment: {
  id: string;
  userId: string;
  status: string;
  currentStep: string;
  gender: string | null;
  goal: string | null;
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
  targetWeightKg: number | null;
  activityLevel: string | null;
  version: number;
  submittedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): AssessmentRecord {
  return assessment as AssessmentRecord;
}

function mapResult(result: {
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
  predictionCurve: unknown;
  createdAt: Date;
  updatedAt: Date;
}): AssessmentResultRecord {
  return {
    ...result,
    predictionCurve: result.predictionCurve as PredictionPoint[]
  };
}

function mapSubscription(subscription: {
  id: string;
  userId: string;
  status: string;
  paidAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): SubscriptionRecord {
  return subscription as SubscriptionRecord;
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export class PrismaStore implements AppStore {
  async findUserBySessionToken(sessionToken: string): Promise<AnonymousUserRecord | null> {
    const user = await prisma.anonymousUser.findUnique({
      where: { sessionToken }
    });

    return user ? mapUser(user) : null;
  }

  async createAnonymousUser(sessionToken: string): Promise<AnonymousUserRecord> {
    const user = await prisma.anonymousUser.create({
      data: { sessionToken }
    });

    return mapUser(user);
  }

  async touchAnonymousUser(userId: string, now: Date): Promise<void> {
    await prisma.anonymousUser.update({
      where: { id: userId },
      data: {
        lastSeenAt: now
      }
    });
  }

  async findCurrentAssessment(userId: string): Promise<AssessmentRecord | null> {
    const assessment = await prisma.assessment.findFirst({
      where: {
        userId,
        status: "IN_PROGRESS"
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return assessment ? mapAssessment(assessment) : null;
  }

  async findLatestAssessment(userId: string): Promise<AssessmentRecord | null> {
    const assessment = await prisma.assessment.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });

    return assessment ? mapAssessment(assessment) : null;
  }

  async createAssessment(userId: string): Promise<AssessmentRecord> {
    const assessment = await prisma.assessment.create({
      data: {
        userId,
        status: "IN_PROGRESS",
        currentStep: "gender"
      }
    });

    return mapAssessment(assessment);
  }

  async updateAssessment(assessmentId: string, patch: Partial<AssessmentRecord>): Promise<AssessmentRecord> {
    const assessment = await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        ...patch,
        version: {
          increment: 1
        }
      }
    });

    return mapAssessment(assessment);
  }

  async findResultByAssessmentId(assessmentId: string): Promise<AssessmentResultRecord | null> {
    const result = await prisma.assessmentResult.findUnique({
      where: { assessmentId }
    });

    return result ? mapResult(result) : null;
  }

  async findLatestCompletedAssessmentWithResult(userId: string): Promise<{
    assessment: AssessmentRecord;
    result: AssessmentResultRecord;
  } | null> {
    const assessment = await prisma.assessment.findFirst({
      where: {
        userId,
        status: "COMPLETED",
        result: {
          isNot: null
        }
      },
      include: {
        result: true
      },
      orderBy: {
        submittedAt: "desc"
      }
    });

    if (!assessment || !assessment.result) {
      return null;
    }

    return {
      assessment: mapAssessment(assessment),
      result: mapResult(assessment.result)
    };
  }

  async completeAssessmentWithResult(
    assessmentId: string,
    result: AssessmentResultInput,
    submittedAt: Date
  ): Promise<{
    assessment: AssessmentRecord;
    result: AssessmentResultRecord;
  }> {
    const [assessment, assessmentResult] = await prisma.$transaction(async (tx) => {
      const updatedAssessment = await tx.assessment.update({
        where: { id: assessmentId },
        data: {
          status: "COMPLETED",
          currentStep: "completed",
          submittedAt,
          version: {
            increment: 1
          }
        }
      });

      const upsertedResult = await tx.assessmentResult.upsert({
        where: { assessmentId },
        create: {
          assessmentId,
          bmi: result.bmi,
          bmiCategory: result.bmiCategory,
          bmr: result.bmr,
          tdee: result.tdee,
          suggestedCaloriesMin: result.suggestedCaloriesMin,
          suggestedCaloriesMax: result.suggestedCaloriesMax,
          targetDate: result.targetDate,
          summary: result.summary,
          unsafeTargetWarning: result.unsafeTargetWarning,
          predictionCurve: toJsonValue(result.predictionCurve)
        },
        update: {
          bmi: result.bmi,
          bmiCategory: result.bmiCategory,
          bmr: result.bmr,
          tdee: result.tdee,
          suggestedCaloriesMin: result.suggestedCaloriesMin,
          suggestedCaloriesMax: result.suggestedCaloriesMax,
          targetDate: result.targetDate,
          summary: result.summary,
          unsafeTargetWarning: result.unsafeTargetWarning,
          predictionCurve: toJsonValue(result.predictionCurve)
        }
      });

      return [updatedAssessment, upsertedResult] as const;
    });

    return {
      assessment: mapAssessment(assessment),
      result: mapResult(assessmentResult)
    };
  }

  async findSubscription(userId: string): Promise<SubscriptionRecord | null> {
    const subscription = await prisma.subscription.findUnique({
      where: { userId }
    });

    return subscription ? mapSubscription(subscription) : null;
  }

  async upsertActiveSubscription(userId: string, now: Date): Promise<SubscriptionRecord> {
    const subscription = await prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        status: "ACTIVE",
        paidAt: now
      },
      update: {
        status: "ACTIVE",
        paidAt: now,
        expiresAt: null
      }
    });

    return mapSubscription(subscription);
  }

  async createPaymentEvent(input: PaymentEventInput): Promise<void> {
    await prisma.paymentEvent.create({
      data: {
        userId: input.userId,
        sessionToken: input.sessionToken,
        type: input.type,
        status: input.status,
        rawPayload: toJsonValue(input.rawPayload)
      }
    });
  }
}
