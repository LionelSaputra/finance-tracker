import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const accounts = sqliteTable("accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  kind: text("kind", { enum: ["spending", "savings", "emergency", "trading"] }).notNull(),
  openingBalance: integer("opening_balance").notNull().default(0),
  targetAmount: integer("target_amount"),
  targetDate: text("target_date"),
  archived: integer("archived", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const categories = sqliteTable(
  "categories",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    kind: text("kind", { enum: ["income", "expense"] }).notNull(),
    group: text("category_group", { enum: ["needs", "wants"] }),
    monthlyBudget: integer("monthly_budget"),
    archived: integer("archived", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [uniqueIndex("categories_name_kind").on(t.name, t.kind)],
);

export const transactions = sqliteTable(
  "transactions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    occurredOn: text("occurred_on").notNull(),
    type: text("type", { enum: ["income", "expense", "transfer"] }).notNull(),
    amount: integer("amount").notNull(),
    accountId: integer("account_id").notNull().references(() => accounts.id),
    toAccountId: integer("to_account_id").references(() => accounts.id),
    categoryId: integer("category_id").references(() => categories.id),
    note: text("note"),
    source: text("source", { enum: ["manual", "trading"] }).notNull().default("manual"),
    externalId: text("external_id").unique(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [check("amount_positive", sql`${t.amount} > 0`), index("transactions_occurred_on").on(t.occurredOn)],
);

export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey(),
  emergencyMonths: integer("emergency_months").notNull().default(6),
});

export const aiInsights = sqliteTable("ai_insights", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  month: text("month").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  model: text("model").notNull(),
  summaryJson: text("summary_json").notNull(),
  resultJson: text("result_json").notNull(),
  inputTokens: integer("input_tokens").notNull(),
  outputTokens: integer("output_tokens").notNull(),
});

export type Account = typeof accounts.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Settings = typeof settings.$inferSelect;
