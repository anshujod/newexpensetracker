import { pgTable, text, serial, integer, boolean, date, timestamp, doublePrecision, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Categories table
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  icon: text("icon").notNull(),
  color: text("color").notNull(),
  type: text("type").notNull(), // 'expense' or 'income'
  userId: integer("user_id").references(() => users.id).notNull(),
});

// Transactions table
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(), // 'income' or 'expense'
  amount: doublePrecision("amount").notNull(),
  description: text("description").notNull(),
  date: date("date").notNull(),
  categoryId: integer("category_id").references(() => categories.id).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Budgets table
export const budgets = pgTable("budgets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  categoryId: integer("category_id").references(() => categories.id).notNull(),
  amount: doublePrecision("amount").notNull(),
  period: text("period").notNull(), // 'monthly', 'yearly', etc.
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Recurring Transactions table
export const recurringTransactions = pgTable("recurring_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(), // 'income' or 'expense'
  amount: doublePrecision("amount").notNull(),
  description: text("description").notNull(),
  categoryId: integer("category_id").references(() => categories.id).notNull(),
  frequency: text("frequency").notNull(), // 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
  startDate: date("start_date").notNull(),
  endDate: date("end_date"), // Optional end date
  dayOfMonth: integer("day_of_month"), // For monthly recurring (1-31)
  dayOfWeek: integer("day_of_week"), // For weekly recurring (0-6)
  lastProcessedDate: date("last_processed_date"), // Last date when a transaction was generated
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Schema for user insertion
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

// Schema for category insertion
export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
});

// Schema for transaction insertion
export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

// Schema for budget insertion
export const insertBudgetSchema = createInsertSchema(budgets).omit({
  id: true,
  createdAt: true,
});

// Schema for recurring transaction insertion
export const insertRecurringTransactionSchema = createInsertSchema(recurringTransactions).omit({
  id: true,
  createdAt: true,
  lastProcessedDate: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

export type InsertBudget = z.infer<typeof insertBudgetSchema>;
export type Budget = typeof budgets.$inferSelect;

export type InsertRecurringTransaction = z.infer<typeof insertRecurringTransactionSchema>;
export type RecurringTransaction = typeof recurringTransactions.$inferSelect;
