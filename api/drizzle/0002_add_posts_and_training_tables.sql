-- Create post_type enum
CREATE TYPE "public"."post_type" AS ENUM('community', 'brand');

-- Create posts table
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid NOT NULL,
	"content" text NOT NULL,
	"image_url" varchar(512),
	"type" "post_type" DEFAULT 'community' NOT NULL,
	"likes_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraint for posts
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

-- Create indexes for posts
CREATE INDEX "posts_author_id_idx" ON "posts" ("author_id");
CREATE INDEX "posts_type_idx" ON "posts" ("type");
CREATE INDEX "posts_created_at_idx" ON "posts" ("created_at");

-- Create post_likes table
CREATE TABLE "post_likes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraints for post_likes
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

-- Create indexes for post_likes
CREATE INDEX "post_likes_post_id_idx" ON "post_likes" ("post_id");
CREATE INDEX "post_likes_user_id_idx" ON "post_likes" ("user_id");

-- Create unique constraint for post_likes
CREATE UNIQUE INDEX "post_likes_post_user_unique" ON "post_likes" ("post_id","user_id");

-- Create training_level enum
CREATE TYPE "public"."training_level" AS ENUM('beginner', 'intermediate', 'advanced');

-- Create training_modules table
CREATE TABLE "training_modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trainer_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"video_url" varchar(512) NOT NULL,
	"thumbnail_url" varchar(512),
	"price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"duration" varchar(50),
	"level" "training_level" NOT NULL,
	"category" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraint for training_modules
ALTER TABLE "training_modules" ADD CONSTRAINT "training_modules_trainer_id_users_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

-- Create indexes for training_modules
CREATE INDEX "training_modules_trainer_id_idx" ON "training_modules" ("trainer_id");
CREATE INDEX "training_modules_level_idx" ON "training_modules" ("level");
CREATE INDEX "training_modules_category_idx" ON "training_modules" ("category");
CREATE INDEX "training_modules_created_at_idx" ON "training_modules" ("created_at");

-- Create training_purchases table
CREATE TABLE "training_purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"module_id" uuid NOT NULL,
	"purchased_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraints for training_purchases
ALTER TABLE "training_purchases" ADD CONSTRAINT "training_purchases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "training_purchases" ADD CONSTRAINT "training_purchases_module_id_training_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."training_modules"("id") ON DELETE cascade ON UPDATE no action;

-- Create indexes for training_purchases
CREATE INDEX "training_purchases_user_id_idx" ON "training_purchases" ("user_id");
CREATE INDEX "training_purchases_module_id_idx" ON "training_purchases" ("module_id");

-- Create unique constraint for training_purchases
CREATE UNIQUE INDEX "training_purchases_user_module_unique" ON "training_purchases" ("user_id","module_id");

