import { describe, expect, it } from "vitest";
import { getOrCreateAnonymousSession, requireAnonymousUser } from "@/lib/auth/session";
import { getCurrentAssessmentProgress, saveAssessmentStep, submitAssessment } from "@/lib/assessment/service";
import { MemoryStore } from "@/lib/db/memoryStore";
import { AppError } from "@/lib/errors";
import { getResultForUser, mockPayForUser } from "@/lib/subscription/service";

describe("assessment flow", () => {
  it("blocks incomplete submit, persists result, redacts free result, and unlocks after mock payment", async () => {
    const store = new MemoryStore();
    const session = await getOrCreateAnonymousSession(store);

    await saveAssessmentStep(store, session.user.id, "gender", { gender: "FEMALE" });

    await expect(submitAssessment(store, session.user.id)).rejects.toMatchObject({
      code: "INCOMPLETE_ASSESSMENT"
    } satisfies Partial<AppError>);

    await saveAssessmentStep(store, session.user.id, "goal", { goal: "LOSE_WEIGHT" });
    await saveAssessmentStep(store, session.user.id, "body", {
      age: 30,
      heightCm: 165,
      weightKg: 70,
      targetWeightKg: 64
    });
    await saveAssessmentStep(store, session.user.id, "activity", { activityLevel: "MODERATE" });

    const submitted = await submitAssessment(store, session.user.id, {
      today: new Date("2026-01-01T00:00:00.000Z")
    });

    expect(submitted.assessment.status).toBe("COMPLETED");
    expect(submitted.result.bmi).toBe(25.7);

    const duplicateSubmit = await submitAssessment(store, session.user.id);
    expect(duplicateSubmit.result.id).toBe(submitted.result.id);

    const freeResult = await getResultForUser(store, session.user.id);
    expect(freeResult.isPaid).toBe(false);
    expect("predictionCurve" in freeResult).toBe(false);
    expect(freeResult.lockedFields).toContain("predictionCurve");

    const subscription = await mockPayForUser(store, {
      userId: session.user.id,
      sessionToken: session.sessionToken,
      rawPayload: { source: "test" }
    });

    expect(subscription.status).toBe("ACTIVE");

    const paidResult = await getResultForUser(store, session.user.id);
    expect(paidResult.isPaid).toBe(true);

    if (paidResult.isPaid) {
      expect(paidResult.predictionCurve.length).toBeGreaterThan(0);
      expect(paidResult.suggestedCaloriesMin).toBeGreaterThan(0);
    }
  });

  it("derives completed steps on the server after repeated and out-of-order submissions", async () => {
    const store = new MemoryStore();
    const session = await getOrCreateAnonymousSession(store);

    const bodyProgress = await saveAssessmentStep(store, session.user.id, "body", {
      age: 29,
      heightCm: 172,
      weightKg: 76,
      targetWeightKg: 72
    });

    expect(bodyProgress.completedSteps).toEqual(["body"]);
    expect(bodyProgress.nextStep).toBe("gender");

    await saveAssessmentStep(store, session.user.id, "gender", { gender: "MALE" });
    await saveAssessmentStep(store, session.user.id, "gender", { gender: "MALE" });
    await saveAssessmentStep(store, session.user.id, "goal", { goal: "IMPROVE_ENERGY" });
    const finalProgress = await saveAssessmentStep(store, session.user.id, "activity", { activityLevel: "LOW" });

    expect(finalProgress.completedSteps).toEqual(["gender", "goal", "body", "activity"]);
    expect(finalProgress.nextStep).toBeNull();
  });

  it("restores progress from persisted server-side fields", async () => {
    const store = new MemoryStore();
    const session = await getOrCreateAnonymousSession(store);

    await saveAssessmentStep(store, session.user.id, "gender", { gender: "NON_BINARY" });
    await saveAssessmentStep(store, session.user.id, "goal", { goal: "INCREASE_FLEXIBILITY" });

    const restored = await getCurrentAssessmentProgress(store, session.user.id);

    expect(restored.completedSteps).toEqual(["gender", "goal"]);
    expect(restored.nextStep).toBe("body");
    expect(restored.values).toMatchObject({
      gender: "NON_BINARY",
      goal: "INCREASE_FLEXIBILITY"
    });
  });

  it("rejects invalid payloads and unknown step keys", async () => {
    const store = new MemoryStore();
    const session = await getOrCreateAnonymousSession(store);

    await expect(saveAssessmentStep(store, session.user.id, "gender", { gender: "<script>" })).rejects.toMatchObject({
      code: "VALIDATION_ERROR"
    } satisfies Partial<AppError>);

    await expect(saveAssessmentStep(store, session.user.id, "unknown", { value: "x" })).rejects.toMatchObject({
      code: "VALIDATION_ERROR"
    } satisfies Partial<AppError>);

    await expect(
      saveAssessmentStep(store, session.user.id, "body", {
        age: 12,
        heightCm: 165,
        weightKg: 70,
        targetWeightKg: 64
      })
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR"
    } satisfies Partial<AppError>);
  });

  it("rejects missing or invalid anonymous sessions", async () => {
    const store = new MemoryStore();

    await expect(requireAnonymousUser(store)).rejects.toMatchObject({
      code: "UNAUTHORIZED"
    } satisfies Partial<AppError>);

    await expect(requireAnonymousUser(store, "not-a-real-session")).rejects.toMatchObject({
      code: "UNAUTHORIZED"
    } satisfies Partial<AppError>);
  });

  it("records payment events for mock payment auditability", async () => {
    const store = new MemoryStore();
    const session = await getOrCreateAnonymousSession(store);

    await mockPayForUser(store, {
      userId: session.user.id,
      sessionToken: session.sessionToken,
      rawPayload: { source: "priority_2_test" }
    });

    expect(store.getPaymentEvents()).toEqual([
      expect.objectContaining({
        userId: session.user.id,
        sessionToken: session.sessionToken,
        type: "MOCK_PAY_SUCCESS",
        status: "SUCCESS",
        rawPayload: { source: "priority_2_test" }
      })
    ]);
  });
});
