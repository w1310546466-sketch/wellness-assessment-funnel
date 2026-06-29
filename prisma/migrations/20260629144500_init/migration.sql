-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('FEMALE', 'MALE', 'NON_BINARY');

-- CreateEnum
CREATE TYPE "Goal" AS ENUM ('LOSE_WEIGHT', 'BUILD_STRENGTH', 'IMPROVE_ENERGY', 'INCREASE_FLEXIBILITY');

-- CreateEnum
CREATE TYPE "ActivityLevel" AS ENUM ('LOW', 'MODERATE', 'HIGH');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('FREE', 'ACTIVE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentEventStatus" AS ENUM ('SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "anonymous_users" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anonymous_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "AssessmentStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "current_step" TEXT NOT NULL DEFAULT 'gender',
    "gender" "Gender",
    "goal" "Goal",
    "age" INTEGER,
    "height_cm" DOUBLE PRECISION,
    "weight_kg" DOUBLE PRECISION,
    "target_weight_kg" DOUBLE PRECISION,
    "activity_level" "ActivityLevel",
    "version" INTEGER NOT NULL DEFAULT 0,
    "submitted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_results" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "bmi" DOUBLE PRECISION NOT NULL,
    "bmi_category" TEXT NOT NULL,
    "bmr" DOUBLE PRECISION NOT NULL,
    "tdee" DOUBLE PRECISION NOT NULL,
    "suggested_calories_min" INTEGER NOT NULL,
    "suggested_calories_max" INTEGER NOT NULL,
    "target_date" TIMESTAMP(3),
    "summary" TEXT NOT NULL,
    "unsafe_target_warning" TEXT,
    "prediction_curve" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'FREE',
    "paid_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "PaymentEventStatus" NOT NULL,
    "raw_payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "anonymous_users_session_token_key" ON "anonymous_users"("session_token");

-- CreateIndex
CREATE INDEX "assessments_user_id_status_idx" ON "assessments"("user_id", "status");

-- CreateIndex
CREATE INDEX "assessments_user_id_created_at_idx" ON "assessments"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_results_assessment_id_key" ON "assessment_results"("assessment_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_user_id_key" ON "subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "payment_events_user_id_created_at_idx" ON "payment_events"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "anonymous_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_results" ADD CONSTRAINT "assessment_results_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "anonymous_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "anonymous_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

