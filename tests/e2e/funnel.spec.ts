import { expect, test } from "@playwright/test";

test("user completes funnel, sees redacted result, and unlocks full result", async ({ page }) => {
  await page.goto("/funnel");

  await page.getByRole("button", { name: "Female" }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByRole("button", { name: "Gradual weight change" }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("Age").fill("30");
  await page.getByLabel("Height cm").fill("165");
  await page.getByLabel("Weight kg").fill("70");
  await page.getByLabel("Target kg").fill("64");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByRole("button", { name: "Moderate" }).click();
  await page.getByRole("button", { name: "See estimate" }).click();

  await expect(page.getByRole("heading", { name: "Your first estimate is ready." })).toBeVisible();
  await expect(page.getByText("Unlock your full wellness estimate")).toBeVisible();

  await page.getByRole("button", { name: "Unlock full estimate" }).click();
  await expect(page.getByRole("heading", { name: "Full estimate unlocked." })).toBeVisible();
  await expect(page.getByText("Suggested calorie range")).toBeVisible();
});

test("user can refresh and recover saved funnel progress", async ({ page }) => {
  await page.goto("/funnel");

  await page.getByRole("button", { name: "Male", exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByRole("button", { name: "Improve energy" }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Baseline" })).toBeVisible();

  await page.reload();

  await expect(page.getByRole("heading", { name: "Baseline" })).toBeVisible();
  await expect(page.getByText("Step 3 of 4")).toBeVisible();
  await expect(page.getByLabel("Age")).toBeVisible();
});
