ALTER TABLE "applications" ALTER COLUMN "job_id" DROP NOT NULL;
ALTER TABLE "applications" ADD COLUMN "shift_id" uuid;
ALTER TABLE "applications" ADD CONSTRAINT "applications_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "applications_shift_id_status_idx" ON "applications" USING btree ("shift_id","status");
CREATE INDEX "applications_shift_id_idx" ON "applications" USING btree ("shift_id");
ALTER TABLE "applications" ADD CONSTRAINT "applications_shift_user_unique" UNIQUE("shift_id","user_id");

