import { boolean, index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import type { FormField, FormSettings } from "@/lib/fields";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const workspaces = pgTable("workspaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  fastnRegisteredAt: timestamp("fastn_registered_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: createdAt(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(), // sha256 of the cookie token
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const forms = pgTable(
  "forms",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    slug: text("slug").notNull().unique(),
    status: text("status", { enum: ["draft", "published"] }).notNull().default("draft"),
    fields: jsonb("fields").$type<FormField[]>().notNull().default([]),
    settings: jsonb("settings").$type<FormSettings>().notNull().default({}),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("forms_workspace_idx").on(t.workspaceId)],
);

export const responses = pgTable(
  "responses",
  {
    id: text("id").primaryKey(),
    formId: text("form_id").notNull().references(() => forms.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    answers: jsonb("answers").$type<Record<string, unknown>>().notNull(),
    source: text("source", { enum: ["web", "api"] }).notNull().default("web"),
    createdAt: createdAt(),
  },
  (t) => [index("responses_form_idx").on(t.formId, t.createdAt), index("responses_workspace_idx").on(t.workspaceId)],
);

export const apiKeys = pgTable(
  "api_keys",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    prefix: text("prefix").notNull(),
    keyHash: text("key_hash").notNull().unique(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("api_keys_workspace_idx").on(t.workspaceId)],
);

export const webhooks = pgTable(
  "webhooks",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    events: text("events").array().notNull(),
    formId: text("form_id").references(() => forms.id, { onDelete: "cascade" }), // null = all forms
    secret: text("secret").notNull(),
    description: text("description").notNull().default(""),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [index("webhooks_workspace_idx").on(t.workspaceId)],
);

export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: text("id").primaryKey(),
    webhookId: text("webhook_id").notNull().references(() => webhooks.id, { onDelete: "cascade" }),
    eventId: text("event_id").notNull(),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").notNull(),
    ok: boolean("ok").notNull().default(false),
    statusCode: integer("status_code"),
    attempts: integer("attempts").notNull().default(0),
    error: text("error"),
    createdAt: createdAt(),
  },
  (t) => [index("deliveries_webhook_idx").on(t.webhookId, t.createdAt)],
);

export type Workspace = typeof workspaces.$inferSelect;
export type User = typeof users.$inferSelect;
export type Form = typeof forms.$inferSelect;
export type FormResponse = typeof responses.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;
export type Webhook = typeof webhooks.$inferSelect;
export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;
