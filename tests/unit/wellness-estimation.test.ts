import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import { calculateWellnessEstimate } from "@/lib/health/calculateAssessment";

describe("calculateWellnessEstimate", () => {
  it("calculates deterministic BMI, BMR/TDEE, calorie range, and timeline", () => {
    const result = calculateWellnessEstimate(
      {
        gender: "FEMALE",
        goal: "LOSE_WEIGHT",
        age: 30,
        heightCm: 165,
        weightKg: 70,
        targetWeightKg: 64,
        activityLevel: "MODERATE"
      },
      { today: new Date("2026-01-01T12:00:00.000Z") }
    );

    expect(result.bmi).toBe(25.7);
    expect(result.bmiCategory).toBe("ELEVATED_RANGE");
    expect(result.bmr).toBe(1420);
    expect(result.tdee).toBe(2059);
    expect(result.suggestedCaloriesMin).toBe(1559);
    expect(result.suggestedCaloriesMax).toBe(1759);
    expect(result.targetDate).toBe("2026-04-09");
    expect(result.predictionCurve.at(0)).toEqual({
      week: 0,
      date: "2026-01-01",
      estimatedWeightKg: 70
    });
    expect(result.predictionCurve.at(-1)).toEqual({
      week: 14,
      date: "2026-04-09",
      estimatedWeightKg: 64
    });
  });

  it("returns an unsafe target warning for a target below a typical wellness range", () => {
    const result = calculateWellnessEstimate(
      {
        gender: "MALE",
        goal: "LOSE_WEIGHT",
        age: 34,
        heightCm: 180,
        weightKg: 82,
        targetWeightKg: 55,
        activityLevel: "LOW"
      },
      { today: new Date("2026-01-01T00:00:00.000Z") }
    );

    expect(result.unsafeTargetWarning).toContain("below a typical wellness range");
  });

  it("rejects invalid body data before calculating", () => {
    expect(() =>
      calculateWellnessEstimate({
        gender: "FEMALE",
        goal: "LOSE_WEIGHT",
        age: 30,
        heightCm: 0,
        weightKg: 70,
        targetWeightKg: 60,
        activityLevel: "MODERATE"
      })
    ).toThrow(AppError);
  });
});

