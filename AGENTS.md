# AGENTS.md

This project instruction file must remain named `AGENTS.md`.

## 1. Project Goal

Build a full-stack health assessment funnel that demonstrates a production-minded MVP architecture.

The project should demonstrate a reliable engineering skeleton rather than a cosmetic form demo:

- Step-by-step assessment persistence.
- Progress recovery for anonymous users.
- Server-side wellness estimation logic.
- Subscription-gated result access.
- Mock payment callback.
- Automated tests for core logic, API behavior, edge cases, and the critical user flow.

Health-related copy must stay low-risk and non-medical. Use terms such as "wellness estimate", "suggested calorie range", and "estimated timeline". Do not present results as diagnosis, treatment, prescription, or medical advice.

## Implementation Priority

Build the backend main path first, then polish the UI.

Priority order:

- Anonymous session creation and recovery.
- Assessment step persistence.
- Submit flow and deterministic wellness result generation.
- Result redaction and mock payment unlock.
- Priority 1 automated tests.
- Funnel UI and result UI.
- UI polish, visual refinement, and additional edge-case coverage.

## 2. Tech Stack

Preferred stack:

- Frontend: Next.js App Router + TypeScript.
- Backend: Next.js App Router Route Handlers under `app/api/**/route.ts`.
- Database: PostgreSQL via Prisma. Supabase-hosted PostgreSQL is acceptable.
- Validation: Zod or an equivalent schema-based validator.
- Unit/integration tests: Vitest.
- E2E tests: Playwright.
- ORM client: Prisma Client in server-only modules.

Environment rules:

- `DATABASE_URL` must be server-only.
- Never expose database credentials through `NEXT_PUBLIC_*`.
- Client components must call backend endpoints instead of accessing the database directly.
- Do not use Supabase Auth for the MVP. Use the application's own anonymous HttpOnly session.

## Development Commands

Use npm scripts as the canonical commands in README, CI, and local development.

- `npm run dev`: start the local Next.js development server.
- `npm test`: run automated tests, including all Priority 1 tests.
- `npm run build`: verify the production build.
- `npm run test:e2e`: run Playwright E2E tests.

Prisma command conventions:

- `npx prisma generate`: regenerate Prisma Client after schema or dependency changes.
- `npx prisma migrate dev --name <name>`: create and apply local development migrations.
- `npx prisma migrate deploy`: apply committed migrations in production or CI-like environments.
- `npx prisma studio`: optional local database inspection only.

Do not document one-off commands that bypass these scripts unless there is a clear debugging reason.

## 3. Backend Directory Conventions

Route Handlers live under:

```text
app/api
  sessions/route.ts
  assessments/current/route.ts
  assessments/current/steps/[stepKey]/route.ts
  assessments/current/submit/route.ts
  results/route.ts
  pay/route.ts
  health/route.ts
```

Backend domain logic should live outside route files:

```text
lib
  auth
    session.ts
  assessment
    validation.ts
    progress.ts
    service.ts
  health
    calculateAssessment.ts
    validation.ts
  subscription
    service.ts
  db
    prisma.ts
```

Route Handlers should be thin:

- Parse request.
- Read anonymous session from HttpOnly cookie.
- Validate input.
- Call service/domain functions.
- Return standardized JSON.

Do not put calculation-heavy, database-heavy, or multi-step business logic directly in `route.ts` files.

## Session Cookie Rules

The MVP uses an application-managed anonymous session cookie.

- Cookie name: `rq_session`.
- Cookie must be `HttpOnly`.
- Cookie must use `sameSite: "lax"`.
- Cookie must use `secure: true` in production.
- Local development may use `secure: false`.
- Client components must not directly read, write, or parse `rq_session`.
- Route Handlers should read the session server-side and resolve the anonymous user.
- Do not keep `sessionId` long-term in query strings or localStorage.

## 4. Frontend Directory Conventions

Recommended structure:

```text
app
  page.tsx
  layout.tsx
  funnel/page.tsx
  result/page.tsx

components
  funnel
  result
  ui

lib
  client
    api.ts
```

Frontend rules:

- The first screen should be the usable funnel, not a marketing-only landing page.
- The funnel should feel trustworthy and easy to complete.
- UI polish matters, but pixel-perfect cloning is not required.
- Keep client state as view state only. Persistent assessment progress belongs to the backend.
- Do not let the frontend maintain or submit `completedSteps`; derive progress on the server from validated saved fields.

## 5. Database Naming Conventions

Use Prisma model names in PascalCase and database table names in snake_case via `@@map` where useful.

Recommended models:

- `AnonymousUser` mapped to `anonymous_users`.
- `Assessment` mapped to `assessments`.
- `AssessmentResult` mapped to `assessment_results`.
- `Subscription` mapped to `subscriptions`.
- `PaymentEvent` mapped to `payment_events`.

Relationship rules:

- `AnonymousUser` to `Assessment` is 1:N.
- `Assessment` to `AssessmentResult` is 1:1.
- `AnonymousUser` to `Subscription` is 1:1.
- `AnonymousUser` to `PaymentEvent` is 1:N.

Data ownership rules:

- `users` or `anonymous_users` represents anonymous visitor identity, not a registered account system.
- `sessionId` should be stored in the `rq_session` HttpOnly cookie, not kept long-term in query strings.
- Assessment progress should be derived server-side from persisted fields.
- If a progress snapshot is stored, only the backend may write it.
- Payment state must be auditable through `payment_events`.

Use clear enum values such as:

- `AssessmentStatus`: `IN_PROGRESS`, `COMPLETED`.
- `SubscriptionStatus`: `FREE`, `ACTIVE`, `EXPIRED`.
- `PaymentEventStatus`: `SUCCESS`, `FAILED`.

## Wellness Estimation Rules

The wellness estimation algorithm must be deterministic, rule-based, and testable.

Required outputs:

- BMI calculated from height and weight.
- BMR and TDEE estimated from validated body data and activity level.
- Suggested calorie range derived from TDEE with conservative adjustments.
- Estimated target timeline based on current weight, target weight, and a safe weekly change assumption.
- Unsafe target warning when the target or timeline appears unreasonable.

Rules:

- Do not call LLMs, external AI services, or third-party health APIs.
- Do not use randomness in the algorithm.
- Use stable formulas and constants so tests can assert exact or bounded outputs.
- Keep all copy informational and non-medical.

## 6. API Response Format

Use a consistent JSON envelope.

Success:

```json
{
  "ok": true,
  "data": {}
}
```

Error:

```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": {}
  }
}
```

General API rules:

- Use precise HTTP status codes.
- Return validation details for invalid user input.
- Do not leak stack traces, SQL details, environment variables, or internal service errors.
- Results must be subscription-aware:
  - Free users receive only safe summary data.
  - Active subscribers receive the full assessment result.
- Protected fields such as prediction curves must not be present in free-user responses.

## 7. Error Handling Rules

Use explicit error categories:

- `VALIDATION_ERROR` for invalid body, params, or unsupported step keys.
- `UNAUTHORIZED` for missing or invalid anonymous session.
- `NOT_FOUND` for missing user, assessment, or result.
- `CONFLICT` for invalid state transitions.
- `INCOMPLETE_ASSESSMENT` when submit is attempted before all required data exists.
- `INTERNAL_ERROR` for unexpected failures.

Validation and state rules:

- Reject impossible or unsafe input ranges for age, height, weight, target weight, gender, goal, and activity level.
- Do not silently accept unknown fields as business data.
- Repeated step submissions should be safe.
- Repeated `/api/pay` calls should be idempotent.
- Repeated assessment submission should not create duplicate dirty results.
- Concurrent progress updates should not corrupt saved data.

## 8. Testing Requirements

Automated tests are required, not optional.

Priority 1 must cover the MVP-critical path:

- Wellness estimation algorithm:
  - BMI calculation.
  - BMR/TDEE calculation.
  - Suggested calorie range.
  - Estimated target timeline.
  - Missing, invalid, extreme, and unreasonable age/height/weight/target weight inputs.
- Submit flow:
  - Cannot submit incomplete assessment.
  - Can submit complete assessment.
  - Result is persisted.
  - Duplicate submit remains clean/idempotent.
- Result redaction:
  - Free users receive redacted results.
  - Free users cannot receive protected fields.
  - Active subscribers receive full results.
- Mock payment unlock:
  - `/api/pay` changes subscription to `ACTIVE`.
  - `/api/pay` is idempotent.
  - Result response changes from redacted to full after payment.
- E2E happy path:
  - User can complete the funnel.
  - User sees locked/free result.
  - Mock payment unlocks full result.

Priority 2 should cover hardening and edge cases:

- Input validation:
  - Invalid enum values.
  - Missing required fields.
  - Out-of-range numbers.
  - Injection-like strings.
- Assessment persistence:
  - Step-by-step save.
  - Progress recovery after interruption.
  - Repeated step submission.
  - Out-of-order step submission.
  - Concurrent update behavior.
  - Unknown `stepKey`.
- Access control hardening:
  - Missing/invalid session is rejected.
  - Missing result is handled explicitly.
  - Incomplete assessment cannot expose protected result fields.
- Mock payment hardening:
  - Invalid session cannot pay successfully.
  - Payment event is recorded for auditability.
- Additional E2E:
  - Refresh or revisit restores progress.
  - Invalid input blocks progression with clear feedback.

Provide one command to run tests, such as:

```text
npm test
```

If possible, add CI with GitHub Actions.

## 9. Prohibited Items

Do not introduce unnecessary complexity.

Do not:

- Add real payment integration such as Stripe checkout.
- Connect `/api/pay` to Stripe or any real payment provider. `/api/pay` is a mock endpoint only.
- Call real LLM APIs or external AI services.
- Depend on complex third-party services for core logic.
- Build a full authentication system unless explicitly requested.
- Use Supabase Auth for the MVP.
- Add a production medical recommendation engine.
- Store `sessionId` long-term in URLs.
- Expose `DATABASE_URL` or any secret to the browser.
- Let frontend-submitted fields decide paid status, completed steps, or protected result access.

Use mock or rule-based implementations first:

- Mock payment through `/api/pay`.
- Rule-based wellness estimation.
- Local deterministic test data.

## 10. Done Definition

The project is done when:

- Backend tests pass.
- Frontend can run through the complete assessment flow.
- Progress persists and recovers correctly.
- Results are generated server-side and stored.
- Free users receive redacted results.
- `/api/pay` unlocks full results.
- README explains setup, environment variables, API usage, test command, and coverage scope.
- README includes a replayable `/api/pay` example.
- README includes or links to the database schema diagram.
- README includes or links to the AI usage review.
- A public deployment URL can demonstrate the full flow.
