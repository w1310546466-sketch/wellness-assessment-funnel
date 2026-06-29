import type {
  AnonymousUserRecord,
  AssessmentRecord,
  AssessmentResultRecord,
  SubscriptionRecord
} from "@/lib/assessment/types";
import type { AppStore, AssessmentResultInput, PaymentEventInput } from "@/lib/db/store";

function id(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function cloneDate(date: Date): Date {
  return new Date(date.getTime());
}

function cloneUser(user: AnonymousUserRecord): AnonymousUserRecord {
  return {
    ...user,
    createdAt: cloneDate(user.createdAt),
    updatedAt: cloneDate(user.updatedAt),
    lastSeenAt: cloneDate(user.lastSeenAt)
  };
}

function cloneAssessment(assessment: AssessmentRecord): AssessmentRecord {
  return {
    ...assessment,
    submittedAt: assessment.submittedAt ? cloneDate(assessment.submittedAt) : null,
    createdAt: cloneDate(assessment.createdAt),
    updatedAt: cloneDate(assessment.updatedAt)
  };
}

function cloneResult(result: AssessmentResultRecord): AssessmentResultRecord {
  return {
    ...result,
    targetDate: result.targetDate ? cloneDate(result.targetDate) : null,
    predictionCurve: result.predictionCurve.map((point) => ({ ...point })),
    createdAt: cloneDate(result.createdAt),
    updatedAt: cloneDate(result.updatedAt)
  };
}

function cloneSubscription(subscription: SubscriptionRecord): SubscriptionRecord {
  return {
    ...subscription,
    paidAt: subscription.paidAt ? cloneDate(subscription.paidAt) : null,
    expiresAt: subscription.expiresAt ? cloneDate(subscription.expiresAt) : null,
    createdAt: cloneDate(subscription.createdAt),
    updatedAt: cloneDate(subscription.updatedAt)
  };
}

export class MemoryStore implements AppStore {
  private users = new Map<string, AnonymousUserRecord>();
  private userByToken = new Map<string, string>();
  private assessments = new Map<string, AssessmentRecord>();
  private results = new Map<string, AssessmentResultRecord>();
  private subscriptions = new Map<string, SubscriptionRecord>();
  private paymentEvents: PaymentEventInput[] = [];

  async findUserBySessionToken(sessionToken: string): Promise<AnonymousUserRecord | null> {
    const userId = this.userByToken.get(sessionToken);
    if (!userId) {
      return null;
    }

    const user = this.users.get(userId);
    return user ? cloneUser(user) : null;
  }

  async createAnonymousUser(sessionToken: string): Promise<AnonymousUserRecord> {
    const now = new Date();
    const user: AnonymousUserRecord = {
      id: id("usr"),
      sessionToken,
      createdAt: now,
      updatedAt: now,
      lastSeenAt: now
    };

    this.users.set(user.id, user);
    this.userByToken.set(sessionToken, user.id);
    return cloneUser(user);
  }

  async touchAnonymousUser(userId: string, now: Date): Promise<void> {
    const user = this.users.get(userId);
    if (!user) {
      return;
    }

    this.users.set(userId, {
      ...user,
      updatedAt: now,
      lastSeenAt: now
    });
  }

  async findCurrentAssessment(userId: string): Promise<AssessmentRecord | null> {
    const matches = [...this.assessments.values()]
      .filter((assessment) => assessment.userId === userId && assessment.status === "IN_PROGRESS")
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return matches[0] ? cloneAssessment(matches[0]) : null;
  }

  async findLatestAssessment(userId: string): Promise<AssessmentRecord | null> {
    const matches = [...this.assessments.values()]
      .filter((assessment) => assessment.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return matches[0] ? cloneAssessment(matches[0]) : null;
  }

  async createAssessment(userId: string): Promise<AssessmentRecord> {
    const now = new Date();
    const assessment: AssessmentRecord = {
      id: id("asm"),
      userId,
      status: "IN_PROGRESS",
      currentStep: "gender",
      gender: null,
      goal: null,
      age: null,
      heightCm: null,
      weightKg: null,
      targetWeightKg: null,
      activityLevel: null,
      version: 0,
      submittedAt: null,
      createdAt: now,
      updatedAt: now
    };

    this.assessments.set(assessment.id, assessment);
    return cloneAssessment(assessment);
  }

  async updateAssessment(assessmentId: string, patch: Partial<AssessmentRecord>): Promise<AssessmentRecord> {
    const existing = this.assessments.get(assessmentId);

    if (!existing) {
      throw new Error(`Assessment not found: ${assessmentId}`);
    }

    const updated: AssessmentRecord = {
      ...existing,
      ...patch,
      id: existing.id,
      userId: existing.userId,
      version: existing.version + 1,
      updatedAt: new Date()
    };

    this.assessments.set(assessmentId, updated);
    return cloneAssessment(updated);
  }

  async findResultByAssessmentId(assessmentId: string): Promise<AssessmentResultRecord | null> {
    const result = this.results.get(assessmentId);
    return result ? cloneResult(result) : null;
  }

  async findLatestCompletedAssessmentWithResult(userId: string): Promise<{
    assessment: AssessmentRecord;
    result: AssessmentResultRecord;
  } | null> {
    const matches = [...this.assessments.values()]
      .filter((assessment) => assessment.userId === userId && assessment.status === "COMPLETED")
      .sort((a, b) => (b.submittedAt?.getTime() ?? 0) - (a.submittedAt?.getTime() ?? 0));

    for (const assessment of matches) {
      const result = this.results.get(assessment.id);
      if (result) {
        return {
          assessment: cloneAssessment(assessment),
          result: cloneResult(result)
        };
      }
    }

    return null;
  }

  async completeAssessmentWithResult(
    assessmentId: string,
    resultInput: AssessmentResultInput,
    submittedAt: Date
  ): Promise<{
    assessment: AssessmentRecord;
    result: AssessmentResultRecord;
  }> {
    const existingAssessment = this.assessments.get(assessmentId);

    if (!existingAssessment) {
      throw new Error(`Assessment not found: ${assessmentId}`);
    }

    const updatedAssessment: AssessmentRecord = {
      ...existingAssessment,
      status: "COMPLETED",
      currentStep: "completed",
      submittedAt,
      version: existingAssessment.version + 1,
      updatedAt: submittedAt
    };

    const existingResult = this.results.get(assessmentId);
    const now = new Date();
    const result: AssessmentResultRecord = {
      id: existingResult?.id ?? id("res"),
      assessmentId,
      bmi: resultInput.bmi,
      bmiCategory: resultInput.bmiCategory,
      bmr: resultInput.bmr,
      tdee: resultInput.tdee,
      suggestedCaloriesMin: resultInput.suggestedCaloriesMin,
      suggestedCaloriesMax: resultInput.suggestedCaloriesMax,
      targetDate: resultInput.targetDate,
      summary: resultInput.summary,
      unsafeTargetWarning: resultInput.unsafeTargetWarning,
      predictionCurve: resultInput.predictionCurve,
      createdAt: existingResult?.createdAt ?? now,
      updatedAt: now
    };

    this.assessments.set(assessmentId, updatedAssessment);
    this.results.set(assessmentId, result);

    return {
      assessment: cloneAssessment(updatedAssessment),
      result: cloneResult(result)
    };
  }

  async findSubscription(userId: string): Promise<SubscriptionRecord | null> {
    const subscription = this.subscriptions.get(userId);
    return subscription ? cloneSubscription(subscription) : null;
  }

  async upsertActiveSubscription(userId: string, now: Date): Promise<SubscriptionRecord> {
    const existing = this.subscriptions.get(userId);
    const subscription: SubscriptionRecord = {
      id: existing?.id ?? id("sub"),
      userId,
      status: "ACTIVE",
      paidAt: existing?.paidAt ?? now,
      expiresAt: null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    };

    this.subscriptions.set(userId, subscription);
    return cloneSubscription(subscription);
  }

  async createPaymentEvent(input: PaymentEventInput): Promise<void> {
    this.paymentEvents.push({
      ...input,
      rawPayload: structuredClone(input.rawPayload)
    });
    return;
  }

  getPaymentEvents(): PaymentEventInput[] {
    return this.paymentEvents.map((event) => ({
      ...event,
      rawPayload: structuredClone(event.rawPayload)
    }));
  }
}

let sharedMemoryStore: MemoryStore | null = null;

export function getSharedMemoryStore(): MemoryStore {
  sharedMemoryStore ??= new MemoryStore();
  return sharedMemoryStore;
}

export function resetSharedMemoryStore(): void {
  sharedMemoryStore = new MemoryStore();
}
