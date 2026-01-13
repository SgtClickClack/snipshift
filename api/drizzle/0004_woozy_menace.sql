CREATE TYPE "public"."attendance_status" AS ENUM('pending', 'completed', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."hospitality_role" AS ENUM('Bartender', 'Waitstaff', 'Barista', 'Kitchen Hand', 'Manager');--> statement-breakpoint
CREATE TYPE "public"."lead_inquiry_type" AS ENUM('enterprise_plan', 'custom_solution', 'partnership', 'general');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('new', 'contacted', 'qualified', 'proposal_sent', 'closed_won', 'closed_lost');--> statement-breakpoint
CREATE TYPE "public"."plan_tier" AS ENUM('starter', 'business', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."shift_offer_status" AS ENUM('pending', 'accepted', 'declined');--> statement-breakpoint
CREATE TYPE "public"."shift_review_type" AS ENUM('SHOP_REVIEWING_BARBER', 'BARBER_REVIEWING_SHOP');--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'SHIFT_INVITE';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'SHIFT_CONFIRMED';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'SHIFT_CANCELLED';--> statement-breakpoint
ALTER TYPE "public"."shift_status" ADD VALUE 'draft' BEFORE 'open';--> statement-breakpoint
ALTER TYPE "public"."shift_status" ADD VALUE 'pending' BEFORE 'open';--> statement-breakpoint
ALTER TYPE "public"."shift_status" ADD VALUE 'invited' BEFORE 'open';--> statement-breakpoint
ALTER TYPE "public"."shift_status" ADD VALUE 'confirmed';--> statement-breakpoint
ALTER TYPE "public"."shift_status" ADD VALUE 'cancelled';--> statement-breakpoint
ALTER TYPE "public"."shift_status" ADD VALUE 'pending_completion';--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_name" varchar(255) NOT NULL,
	"contact_name" varchar(255),
	"email" varchar(255) NOT NULL,
	"phone" varchar(50),
	"number_of_locations" integer,
	"inquiry_type" "lead_inquiry_type" DEFAULT 'general' NOT NULL,
	"message" text,
	"status" "lead_status" DEFAULT 'new' NOT NULL,
	"source" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"rsa_verified" boolean DEFAULT false NOT NULL,
	"rsa_expiry" date,
	"rsa_state_of_issue" varchar(10),
	"rsa_cert_url" text,
	"id_document_url" text,
	"id_verified_status" varchar(20),
	"reliability_strikes" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shift_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shift_id" uuid NOT NULL,
	"professional_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shift_offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shift_id" uuid NOT NULL,
	"professional_id" uuid NOT NULL,
	"status" "shift_offer_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "shift_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shift_id" uuid NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"reviewee_id" uuid NOT NULL,
	"type" "shift_review_type" NOT NULL,
	"rating" numeric(1, 0) NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "status" SET DEFAULT 'UNPAID'::text;--> statement-breakpoint
ALTER TABLE "shifts" ALTER COLUMN "payment_status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "shifts" ALTER COLUMN "payment_status" SET DEFAULT 'UNPAID'::text;--> statement-breakpoint
DROP TYPE "public"."payment_status";--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('UNPAID', 'AUTHORIZED', 'PAID', 'REFUNDED', 'PAYMENT_FAILED');--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "status" SET DEFAULT 'UNPAID'::"public"."payment_status";--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "status" SET DATA TYPE "public"."payment_status" USING "status"::"public"."payment_status";--> statement-breakpoint
ALTER TABLE "shifts" ALTER COLUMN "payment_status" SET DEFAULT 'UNPAID'::"public"."payment_status";--> statement-breakpoint
ALTER TABLE "shifts" ALTER COLUMN "payment_status" SET DATA TYPE "public"."payment_status" USING "payment_status"::"public"."payment_status";--> statement-breakpoint
ALTER TABLE "shifts" ALTER COLUMN "status" SET DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE "shifts" ADD COLUMN "assignee_id" uuid;--> statement-breakpoint
ALTER TABLE "shifts" ADD COLUMN "role" varchar(64);--> statement-breakpoint
ALTER TABLE "shifts" ADD COLUMN "cancellation_window_hours" integer DEFAULT 24 NOT NULL;--> statement-breakpoint
ALTER TABLE "shifts" ADD COLUMN "kill_fee_amount" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "shifts" ADD COLUMN "staff_cancellation_reason" text;--> statement-breakpoint
ALTER TABLE "shifts" ADD COLUMN "is_emergency_fill" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "shifts" ADD COLUMN "uniform_requirements" text;--> statement-breakpoint
ALTER TABLE "shifts" ADD COLUMN "rsa_required" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "shifts" ADD COLUMN "expected_pax" integer;--> statement-breakpoint
ALTER TABLE "shifts" ADD COLUMN "attendance_status" "attendance_status" DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "shifts" ADD COLUMN "payment_status" "payment_status" DEFAULT 'UNPAID';--> statement-breakpoint
ALTER TABLE "shifts" ADD COLUMN "payment_intent_id" varchar(255);--> statement-breakpoint
ALTER TABLE "shifts" ADD COLUMN "stripe_charge_id" varchar(255);--> statement-breakpoint
ALTER TABLE "shifts" ADD COLUMN "application_fee_amount" integer;--> statement-breakpoint
ALTER TABLE "shifts" ADD COLUMN "transfer_amount" integer;--> statement-breakpoint
ALTER TABLE "shifts" ADD COLUMN "lat" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "shifts" ADD COLUMN "lng" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "shifts" ADD COLUMN "is_recurring" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "shifts" ADD COLUMN "auto_accept" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "shifts" ADD COLUMN "parent_shift_id" uuid;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "tier" "plan_tier" DEFAULT 'starter' NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "booking_fee_waived" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "rsa_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "rsa_not_required" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "rsa_number" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "rsa_expiry" date;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "rsa_state_of_issue" varchar(10);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "rsa_cert_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "rsa_certificate_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "hospitality_role" "hospitality_role";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "hourly_rate_preference" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "stripe_account_id" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "stripe_onboarding_complete" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "stripe_customer_id" varchar(255);--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_invitations" ADD CONSTRAINT "shift_invitations_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_invitations" ADD CONSTRAINT "shift_invitations_professional_id_users_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_offers" ADD CONSTRAINT "shift_offers_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_offers" ADD CONSTRAINT "shift_offers_professional_id_users_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_reviews" ADD CONSTRAINT "shift_reviews_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_reviews" ADD CONSTRAINT "shift_reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_reviews" ADD CONSTRAINT "shift_reviews_reviewee_id_users_id_fk" FOREIGN KEY ("reviewee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "profiles_reliability_strikes_idx" ON "profiles" USING btree ("reliability_strikes");--> statement-breakpoint
CREATE INDEX "shift_invitations_shift_id_idx" ON "shift_invitations" USING btree ("shift_id");--> statement-breakpoint
CREATE INDEX "shift_invitations_professional_id_idx" ON "shift_invitations" USING btree ("professional_id");--> statement-breakpoint
CREATE INDEX "shift_invitations_status_idx" ON "shift_invitations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "shift_invitations_shift_professional_unique" ON "shift_invitations" USING btree ("shift_id","professional_id");--> statement-breakpoint
CREATE INDEX "shift_offers_shift_id_idx" ON "shift_offers" USING btree ("shift_id");--> statement-breakpoint
CREATE INDEX "shift_offers_professional_id_idx" ON "shift_offers" USING btree ("professional_id");--> statement-breakpoint
CREATE INDEX "shift_offers_status_idx" ON "shift_offers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "shift_offers_shift_professional_idx" ON "shift_offers" USING btree ("shift_id","professional_id");--> statement-breakpoint
CREATE INDEX "shift_reviews_shift_id_idx" ON "shift_reviews" USING btree ("shift_id");--> statement-breakpoint
CREATE INDEX "shift_reviews_reviewer_id_idx" ON "shift_reviews" USING btree ("reviewer_id");--> statement-breakpoint
CREATE INDEX "shift_reviews_reviewee_id_idx" ON "shift_reviews" USING btree ("reviewee_id");--> statement-breakpoint
CREATE INDEX "shift_reviews_shift_reviewer_unique" ON "shift_reviews" USING btree ("shift_id","reviewer_id","type");--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_parent_shift_id_shifts_id_fk" FOREIGN KEY ("parent_shift_id") REFERENCES "public"."shifts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shifts_assignee_id_idx" ON "shifts" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX "shifts_parent_shift_id_idx" ON "shifts" USING btree ("parent_shift_id");--> statement-breakpoint
CREATE INDEX "shifts_attendance_status_idx" ON "shifts" USING btree ("attendance_status");--> statement-breakpoint
CREATE INDEX "shifts_payment_status_idx" ON "shifts" USING btree ("payment_status");--> statement-breakpoint
CREATE INDEX "shifts_payment_intent_id_idx" ON "shifts" USING btree ("payment_intent_id");--> statement-breakpoint
CREATE INDEX "shifts_lat_lng_idx" ON "shifts" USING btree ("lat","lng");--> statement-breakpoint
CREATE INDEX "subscription_plans_tier_idx" ON "subscription_plans" USING btree ("tier");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "users_stripe_account_id_idx" ON "users" USING btree ("stripe_account_id");--> statement-breakpoint
CREATE INDEX "users_stripe_customer_id_idx" ON "users" USING btree ("stripe_customer_id");