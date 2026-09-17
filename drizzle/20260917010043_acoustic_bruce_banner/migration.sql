CREATE TABLE "categories" (
	"id" bigserial PRIMARY KEY,
	"name" varchar(255) CONSTRAINT "uni_categories_name" UNIQUE,
	"created_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" bigserial PRIMARY KEY,
	"ticket_id" bigint,
	"author_id" text,
	"author_name" varchar(255),
	"content" text,
	"created_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "graduations" (
	"id" bigserial PRIMARY KEY,
	"abbreviation" varchar(20) CONSTRAINT "uni_graduations_abbreviation" UNIQUE,
	"created_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "machines" (
	"agent_id" text PRIMARY KEY,
	"hostname" varchar(255),
	"ip" varchar(45),
	"mac" varchar(32),
	"os" varchar(32),
	"os_version" varchar(100),
	"arch" varchar(16),
	"cpu_model" varchar(255),
	"cpu_cores" integer,
	"cpu_usage_percent" real,
	"ram_total_mb" integer,
	"ram_used_percent" real,
	"disk_total_gb" real,
	"disk_free_gb" real,
	"logged_in_user" varchar(255),
	"uptime_seconds" bigint,
	"network_adapters" jsonb,
	"gateway" varchar(45),
	"dns" jsonb,
	"agent_version" varchar(32),
	"last_seen_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sections" (
	"id" bigserial PRIMARY KEY,
	"name" varchar(255) CONSTRAINT "uni_sections_name" UNIQUE,
	"created_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ticket_assignees" (
	"ticket_id" bigint,
	"user_id" text,
	CONSTRAINT "ticket_assignees_pkey" PRIMARY KEY("ticket_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" bigserial PRIMARY KEY,
	"title" text,
	"description" text,
	"status" text,
	"category_id" bigint,
	"requester_name" text,
	"requester_graduation_id" bigint,
	"requester_section_id" bigint,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "visitor_logs" (
	"id" bigserial PRIMARY KEY,
	"cpf" varchar(20),
	"name" text,
	"badge_number" varchar(50),
	"destination" text,
	"situation_id" bigint,
	"visit_date" date,
	"entry_time" time,
	"exit_time" time,
	"created_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "visitor_situations" (
	"id" bigserial PRIMARY KEY,
	"name" varchar(255) CONSTRAINT "uni_visitor_situations_name" UNIQUE,
	"created_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"issuer" text
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL UNIQUE,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"role" text,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" ("identifier");--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_user_id_fkey" FOREIGN KEY ("author_id") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "ticket_assignees" ADD CONSTRAINT "ticket_assignees_ticket_id_tickets_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id");--> statement-breakpoint
ALTER TABLE "ticket_assignees" ADD CONSTRAINT "ticket_assignees_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_category_id_categories_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id");--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_requester_graduation_id_graduations_id_fkey" FOREIGN KEY ("requester_graduation_id") REFERENCES "graduations"("id");--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_requester_section_id_sections_id_fkey" FOREIGN KEY ("requester_section_id") REFERENCES "sections"("id");--> statement-breakpoint
ALTER TABLE "visitor_logs" ADD CONSTRAINT "visitor_logs_situation_id_visitor_situations_id_fkey" FOREIGN KEY ("situation_id") REFERENCES "visitor_situations"("id");--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;