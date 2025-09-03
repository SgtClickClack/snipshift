import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password"),
  role: text("role").$type<"hub" | "professional" | "brand" | "trainer">().notNull(),
  googleId: text("google_id"),
  provider: text("provider").$type<"email" | "google">().notNull().default("email"),
  name: text("name"),
  profilePicture: text("profile_picture"),
});

export const shifts = pgTable("shifts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hubId: varchar("hub_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  date: timestamp("date", { withTimezone: true }).notNull(),
  requirements: text("requirements").notNull(),
  pay: decimal("pay", { precision: 10, scale: 2 }).notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
}).extend({
  name: z.string().optional(),
  googleId: z.string().optional(),
});

export const insertShiftSchema = createInsertSchema(shifts).omit({
  id: true,
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const googleAuthSchema = z.object({
  email: z.string().email(),
  googleId: z.string(),
  name: z.string(),
  profilePicture: z.string().optional(),
  role: z.enum(["hub", "professional", "brand", "trainer"]),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertShift = z.infer<typeof insertShiftSchema>;
export type Shift = typeof shifts.$inferSelect;
export type LoginData = z.infer<typeof loginSchema>;
export type GoogleAuthData = z.infer<typeof googleAuthSchema>;
