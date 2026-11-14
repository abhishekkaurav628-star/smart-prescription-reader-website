import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  timezone: text("timezone").notNull().default("UTC"),
  // Preferred reminder time for each part of the day (HH:MM, 24h)
  morningTime: text("morning_time").notNull().default("08:00"),
  afternoonTime: text("afternoon_time").notNull().default("13:30"),
  eveningTime: text("evening_time").notNull().default("17:30"),
  nightTime: text("night_time").notNull().default("20:30"),
  bedtimeTime: text("bedtime_time").notNull().default("22:30"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const prescriptions = pgTable(
  "prescriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    doctorName: text("doctor_name"),
    patientName: text("patient_name"),
    diagnosis: text("diagnosis"),
    issuedOn: date("issued_on", { mode: "string" }),
    rawText: text("raw_text"),
    source: text("source").notNull().default("manual"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("prescriptions_user_idx").on(t.userId)],
);

export const medicines = pgTable(
  "medicines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    prescriptionId: uuid("prescription_id").references(() => prescriptions.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    dosage: text("dosage"),
    form: text("form"),
    instructions: text("instructions"),
    purpose: text("purpose"),
    // Reminder times, "HH:MM" in the user's local wall-clock time
    times: text("times")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    asNeeded: boolean("as_needed").notNull().default(false),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }),
    durationDays: integer("duration_days"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("medicines_user_idx").on(t.userId)],
);

export const doseLogs = pgTable(
  "dose_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    medicineId: uuid("medicine_id")
      .notNull()
      .references(() => medicines.id, { onDelete: "cascade" }),
    doseDate: date("dose_date", { mode: "string" }).notNull(),
    doseTime: text("dose_time").notNull(),
    // pending | taken | skipped
    status: text("status").notNull().default("pending"),
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
    actedAt: timestamp("acted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("dose_logs_unique").on(t.medicineId, t.doseDate, t.doseTime),
    index("dose_logs_user_date_idx").on(t.userId, t.doseDate),
  ],
);

export const deviceTokens = pgTable(
  "device_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    platform: text("platform").notNull().default("web"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("device_tokens_user_idx").on(t.userId)],
);

export type User = typeof users.$inferSelect;
export type Prescription = typeof prescriptions.$inferSelect;
export type Medicine = typeof medicines.$inferSelect;
export type DoseLog = typeof doseLogs.$inferSelect;
