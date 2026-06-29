import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";
import { POST as createSession } from "@/app/api/sessions/route";
import { GET as getResult } from "@/app/api/results/route";
import { POST as mockPay } from "@/app/api/pay/route";
import { PATCH as saveStep } from "@/app/api/assessments/current/steps/[stepKey]/route";
import { POST as submitAssessment } from "@/app/api/assessments/current/submit/route";
import { resetSharedMemoryStore } from "@/lib/db/memoryStore";

function request(path: string, init: RequestInit = {}) {
  return new NextRequest(`http://localhost${path}`, init);
}

async function json(response: Response) {
  return response.json() as Promise<{
    ok: boolean;
    data?: Record<string, unknown>;
    error?: { code: string; message: string; details?: unknown };
  }>;
}

function cookieFrom(response: Response): string {
  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) {
    throw new Error("Expected Set-Cookie header");
  }

  return setCookie.split(";")[0];
}

async function patch(cookie: string, stepKey: string, body: unknown) {
  return saveStep(
    request(`/api/assessments/current/steps/${stepKey}`, {
      method: "PATCH",
      headers: {
        cookie,
        "content-type": "application/json"
      },
      body: JSON.stringify(body)
    }),
    { params: Promise.resolve({ stepKey }) }
  );
}

async function completeAssessment(cookie: string) {
  await patch(cookie, "gender", { gender: "FEMALE" });
  await patch(cookie, "goal", { goal: "LOSE_WEIGHT" });
  await patch(cookie, "body", {
    age: 30,
    heightCm: 165,
    weightKg: 70,
    targetWeightKg: 64
  });
  await patch(cookie, "activity", { activityLevel: "MODERATE" });

  return submitAssessment(
    request("/api/assessments/current/submit", {
      method: "POST",
      headers: { cookie },
      body: "{}"
    })
  );
}

describe("route handlers", () => {
  beforeEach(() => {
    process.env.APP_DATA_MODE = "memory";
    resetSharedMemoryStore();
  });

  it("sets an HttpOnly rq_session cookie when creating an anonymous session", async () => {
    const response = await createSession(request("/api/sessions", { method: "POST" }));
    const setCookie = response.headers.get("set-cookie");
    const body = await json(response);

    expect(response.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(setCookie).toContain("rq_session=");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=lax");
  });

  it("rejects result and pay requests without an anonymous session", async () => {
    const resultResponse = await getResult(request("/api/results"));
    const payResponse = await mockPay(request("/api/pay", { method: "POST", body: "{}" }));

    expect(resultResponse.status).toBe(401);
    expect((await json(resultResponse)).error?.code).toBe("UNAUTHORIZED");
    expect(payResponse.status).toBe(401);
    expect((await json(payResponse)).error?.code).toBe("UNAUTHORIZED");
  });

  it("redacts protected result fields before mock payment and returns full result after payment", async () => {
    const sessionResponse = await createSession(request("/api/sessions", { method: "POST" }));
    const cookie = cookieFrom(sessionResponse);
    const submitResponse = await completeAssessment(cookie);

    expect(submitResponse.status).toBe(200);

    const freeResponse = await getResult(request("/api/results", { headers: { cookie } }));
    const freeBody = await json(freeResponse);

    expect(freeResponse.status).toBe(200);
    expect(freeBody.data?.isPaid).toBe(false);
    expect(freeBody.data).not.toHaveProperty("predictionCurve");
    expect(freeBody.data).not.toHaveProperty("targetDate");

    const payResponse = await mockPay(
      request("/api/pay", {
        method: "POST",
        headers: {
          cookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({ source: "route_handler_test" })
      })
    );

    expect(payResponse.status).toBe(200);

    const paidResponse = await getResult(request("/api/results", { headers: { cookie } }));
    const paidBody = await json(paidResponse);

    expect(paidBody.data?.isPaid).toBe(true);
    expect(paidBody.data).toHaveProperty("predictionCurve");
    expect(paidBody.data).toHaveProperty("targetDate");
  });
});
