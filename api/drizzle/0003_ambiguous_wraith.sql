CREATE TYPE "public"."job_role" AS ENUM('barber', 'hairdresser', 'stylist', 'other');--> statement-breakpoint
ALTER TABLE "applications" DROP CONSTRAINT "applications_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "role" "job_role" DEFAULT 'barber' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "banner_url" text;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "jobs_role_idx" ON "jobs" USING btree ("role");