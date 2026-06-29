"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/client/api";
import type { ActivityLevel, Gender, Goal, StepKey } from "@/lib/assessment/types";

interface ProgressResponse {
  status: "IN_PROGRESS" | "COMPLETED";
  completedSteps: StepKey[];
  nextStep: StepKey | null;
  values: Partial<FunnelValues>;
}

interface FunnelValues {
  gender: Gender | "";
  goal: Goal | "";
  age: string;
  heightCm: string;
  weightKg: string;
  targetWeightKg: string;
  activityLevel: ActivityLevel | "";
}

const initialValues: FunnelValues = {
  gender: "",
  goal: "",
  age: "",
  heightCm: "",
  weightKg: "",
  targetWeightKg: "",
  activityLevel: ""
};

const stepLabels: Record<StepKey, string> = {
  gender: "Profile",
  goal: "Goal",
  body: "Baseline",
  activity: "Rhythm"
};

export function FunnelClient() {
  const router = useRouter();
  const [step, setStep] = useState<StepKey>("gender");
  const [values, setValues] = useState<FunnelValues>(initialValues);
  const [completedSteps, setCompletedSteps] = useState<StepKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function boot() {
      try {
        await apiRequest("/api/sessions", { method: "POST", body: "{}" });
        const progress = await apiRequest<ProgressResponse>("/api/assessments/current");

        if (!isMounted) {
          return;
        }

        if (progress.status === "COMPLETED") {
          router.push("/result");
          return;
        }

        setCompletedSteps(progress.completedSteps);
        setStep(progress.nextStep ?? "gender");
        setValues((current) => ({
          ...current,
          gender: progress.values.gender ?? current.gender,
          goal: progress.values.goal ?? current.goal,
          age: progress.values.age ? String(progress.values.age) : current.age,
          heightCm: progress.values.heightCm ? String(progress.values.heightCm) : current.heightCm,
          weightKg: progress.values.weightKg ? String(progress.values.weightKg) : current.weightKg,
          targetWeightKg: progress.values.targetWeightKg ? String(progress.values.targetWeightKg) : current.targetWeightKg,
          activityLevel: progress.values.activityLevel ?? current.activityLevel
        }));
      } catch (bootError) {
        setError(bootError instanceof Error ? bootError.message : "Unable to start assessment");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    boot();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const stepIndex = useMemo(() => ["gender", "goal", "body", "activity"].indexOf(step) + 1, [step]);

  async function saveCurrentStep() {
    setIsSaving(true);
    setError(null);

    try {
      const progress = await apiRequest<ProgressResponse>(`/api/assessments/current/steps/${step}`, {
        method: "PATCH",
        body: JSON.stringify(payloadForStep(step, values))
      });

      setCompletedSteps(progress.completedSteps);

      if (progress.nextStep) {
        setStep(progress.nextStep);
        return;
      }

      await apiRequest("/api/assessments/current/submit", {
        method: "POST",
        body: "{}"
      });
      router.push("/result");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save this step");
    } finally {
      setIsSaving(false);
    }
  }

  function goBack() {
    const order: StepKey[] = ["gender", "goal", "body", "activity"];
    const index = order.indexOf(step);
    if (index > 0) {
      setStep(order[index - 1]);
    }
  }

  return (
    <main className="app-shell">
      <section className="funnel-grid">
        <div className="funnel-copy">
          <p className="eyebrow">Ruiqi Wellness Estimate</p>
          <h1>Build a steadier plan from a few simple signals.</h1>
          <p className="lead">
            Your estimate updates as you move through the funnel and stays saved for your next visit.
          </p>
          <div className="signal-panel" aria-hidden="true">
            <span style={{ height: "44%" }} />
            <span style={{ height: "68%" }} />
            <span style={{ height: "52%" }} />
            <span style={{ height: "78%" }} />
            <span style={{ height: "60%" }} />
          </div>
        </div>

        <div className="funnel-panel">
          <div className="progress-row">
            <span>Step {stepIndex} of 4</span>
            <span>{Math.round((completedSteps.length / 4) * 100)}%</span>
          </div>
          <div className="progress-track">
            <span style={{ width: `${Math.max(8, (completedSteps.length / 4) * 100)}%` }} />
          </div>

          {isLoading ? (
            <p className="muted">Preparing your assessment...</p>
          ) : (
            <>
              <h2>{stepLabels[step]}</h2>
              {renderStep(step, values, setValues)}
              {error ? <p className="error-text">{error}</p> : null}
              <div className="button-row">
                <button className="secondary-button" type="button" onClick={goBack} disabled={step === "gender" || isSaving}>
                  Back
                </button>
                <button className="primary-button" type="button" onClick={saveCurrentStep} disabled={!isStepReady(step, values) || isSaving}>
                  {step === "activity" ? "See estimate" : "Continue"}
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function renderStep(
  step: StepKey,
  values: FunnelValues,
  setValues: React.Dispatch<React.SetStateAction<FunnelValues>>
) {
  if (step === "gender") {
    return (
      <ChoiceGroup
        label="What best describes you?"
        value={values.gender}
        options={[
          ["FEMALE", "Female"],
          ["MALE", "Male"],
          ["NON_BINARY", "Non-binary"]
        ]}
        onChange={(gender) => setValues((current) => ({ ...current, gender: gender as Gender }))}
      />
    );
  }

  if (step === "goal") {
    return (
      <ChoiceGroup
        label="Choose your main focus."
        value={values.goal}
        options={[
          ["LOSE_WEIGHT", "Gradual weight change"],
          ["BUILD_STRENGTH", "Build strength"],
          ["IMPROVE_ENERGY", "Improve energy"],
          ["INCREASE_FLEXIBILITY", "Increase flexibility"]
        ]}
        onChange={(goal) => setValues((current) => ({ ...current, goal: goal as Goal }))}
      />
    );
  }

  if (step === "body") {
    return (
      <div className="field-grid">
        <NumberField label="Age" value={values.age} onChange={(age) => setValues((current) => ({ ...current, age }))} />
        <NumberField label="Height cm" value={values.heightCm} onChange={(heightCm) => setValues((current) => ({ ...current, heightCm }))} />
        <NumberField label="Weight kg" value={values.weightKg} onChange={(weightKg) => setValues((current) => ({ ...current, weightKg }))} />
        <NumberField
          label="Target kg"
          value={values.targetWeightKg}
          onChange={(targetWeightKg) => setValues((current) => ({ ...current, targetWeightKg }))}
        />
      </div>
    );
  }

  return (
    <ChoiceGroup
      label="How often do you move each week?"
      value={values.activityLevel}
      options={[
        ["LOW", "Light"],
        ["MODERATE", "Moderate"],
        ["HIGH", "Active"]
      ]}
      onChange={(activityLevel) => setValues((current) => ({ ...current, activityLevel: activityLevel as ActivityLevel }))}
    />
  );
}

function ChoiceGroup({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="choice-group">
      <legend>{label}</legend>
      {options.map(([optionValue, optionLabel]) => (
        <button
          className={value === optionValue ? "choice selected" : "choice"}
          key={optionValue}
          type="button"
          onClick={() => onChange(optionValue)}
        >
          {optionLabel}
        </button>
      ))}
    </fieldset>
  );
}

function NumberField({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="number-field">
      <span>{label}</span>
      <input inputMode="decimal" type="number" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function payloadForStep(step: StepKey, values: FunnelValues) {
  if (step === "gender") {
    return { gender: values.gender };
  }

  if (step === "goal") {
    return { goal: values.goal };
  }

  if (step === "body") {
    return {
      age: Number(values.age),
      heightCm: Number(values.heightCm),
      weightKg: Number(values.weightKg),
      targetWeightKg: Number(values.targetWeightKg)
    };
  }

  return { activityLevel: values.activityLevel };
}

function isStepReady(step: StepKey, values: FunnelValues): boolean {
  if (step === "gender") {
    return values.gender !== "";
  }

  if (step === "goal") {
    return values.goal !== "";
  }

  if (step === "activity") {
    return values.activityLevel !== "";
  }

  return [values.age, values.heightCm, values.weightKg, values.targetWeightKg].every((value) => Number(value) > 0);
}

