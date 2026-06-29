"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/client/api";
import type { PredictionPoint } from "@/lib/assessment/types";

type ResultResponse =
  | {
      isPaid: false;
      bmi: number;
      bmiCategory: string;
      summary: string;
      unsafeTargetWarning: string | null;
      lockedFields: string[];
      paywallMessage: string;
    }
  | {
      isPaid: true;
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
    };

export function ResultClient() {
  const [result, setResult] = useState<ResultResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadResult() {
    setError(null);
    const data = await apiRequest<ResultResponse>("/api/results");
    setResult(data);
  }

  useEffect(() => {
    loadResult()
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load result");
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function unlock() {
    setIsPaying(true);
    setError(null);

    try {
      await apiRequest("/api/pay", {
        method: "POST",
        body: JSON.stringify({ source: "result_page_button" })
      });
      await loadResult();
    } catch (payError) {
      setError(payError instanceof Error ? payError.message : "Unable to unlock result");
    } finally {
      setIsPaying(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="result-layout">
        <div>
          <p className="eyebrow">Your Wellness Estimate</p>
          <h1>{result?.isPaid ? "Full estimate unlocked." : "Your first estimate is ready."}</h1>
          <p className="lead">
            This estimate is informational and designed to support a steady planning conversation.
          </p>
        </div>

        <div className="result-panel">
          {isLoading ? <p className="muted">Loading your result...</p> : null}
          {error ? (
            <div className="empty-state">
              <p>{error}</p>
              <Link className="primary-button link-button" href="/funnel">
                Start assessment
              </Link>
            </div>
          ) : null}
          {result ? (
            <>
              <div className="metric-row">
                <div>
                  <span>BMI</span>
                  <strong>{result.bmi}</strong>
                </div>
                <div>
                  <span>Range</span>
                  <strong>{formatCategory(result.bmiCategory)}</strong>
                </div>
              </div>

              <p className="summary-text">{result.summary}</p>
              {result.unsafeTargetWarning ? <p className="warning-text">{result.unsafeTargetWarning}</p> : null}

              {result.isPaid ? (
                <FullResult result={result} />
              ) : (
                <div className="paywall">
                  <p>{result.paywallMessage}</p>
                  <button className="primary-button" type="button" onClick={unlock} disabled={isPaying}>
                    {isPaying ? "Unlocking..." : "Unlock full estimate"}
                  </button>
                </div>
              )}
            </>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function FullResult({ result }: { result: Extract<ResultResponse, { isPaid: true }> }) {
  return (
    <div className="full-result">
      <div className="metric-row">
        <div>
          <span>BMR</span>
          <strong>{Math.round(result.bmr)}</strong>
        </div>
        <div>
          <span>TDEE</span>
          <strong>{Math.round(result.tdee)}</strong>
        </div>
      </div>
      <p className="summary-text">
        Suggested calorie range: {result.suggestedCaloriesMin}-{result.suggestedCaloriesMax} kcal/day
        {result.targetDate ? ` · Estimated date: ${result.targetDate}` : ""}
      </p>
      <div className="curve" aria-label="Estimated weight timeline">
        {result.predictionCurve.slice(0, 10).map((point) => (
          <span key={`${point.week}-${point.date}`} title={`${point.date}: ${point.estimatedWeightKg} kg`}>
            {point.week}
          </span>
        ))}
      </div>
    </div>
  );
}

function formatCategory(category: string): string {
  return category
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

