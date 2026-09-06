import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal } from "drizzle-orm/mysql-core";

export const userRoles = ["loan_officer", "credit_committee", "branch_manager", "finance_collections", "compliance", "general_manager"] as const;
export type UserRole = (typeof userRoles)[number];

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", ...userRoles]).default("user").notNull(),
  branchId: int("branchId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const branches = mysqlTable("branches", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  authorityLimit: decimal("authorityLimit", { precision: 12, scale: 2 }).default("10000.00").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  branchId: int("branchId").notNull(),
  fullName: varchar("fullName", { length: 180 }).notNull(),
  phone: varchar("phone", { length: 30 }).notNull(),
  nationalId: varchar("nationalId", { length: 60 }),
  occupation: varchar("occupation", { length: 120 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const loanApplications = mysqlTable("loanApplications", {
  id: int("id").autoincrement().primaryKey(),
  branchId: int("branchId").notNull(),
  clientId: int("clientId").notNull(),
  createdBy: int("createdBy").notNull(),
  product: mysqlEnum("product", ["business", "individual", "group", "salary"]).notNull(),
  principal: decimal("principal", { precision: 12, scale: 2 }).notNull(),
  termMonths: int("termMonths").notNull(),
  status: mysqlEnum("status", ["submitted", "under_review", "approved", "rejected", "disbursed", "active", "completed"]).default("submitted").notNull(),
  securityType: mysqlEnum("securityType", ["none", "guarantor", "collateral"]).default("none").notNull(),
  securityVerified: int("securityVerified").default(0).notNull(),
  decisionReason: text("decisionReason"),
  approvedBy: int("approvedBy"),
  approvedAt: timestamp("approvedAt"),
  disbursedAt: timestamp("disbursedAt"),
  totalInterest: decimal("totalInterest", { precision: 12, scale: 2 }),
  totalRepayable: decimal("totalRepayable", { precision: 12, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const repayments = mysqlTable("repayments", {
  id: int("id").autoincrement().primaryKey(),
  loanApplicationId: int("loanApplicationId").notNull(),
  branchId: int("branchId").notNull(),
  recordedBy: int("recordedBy").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  paidAt: timestamp("paidAt").notNull(),
  reference: varchar("reference", { length: 80 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const auditLogs = mysqlTable("auditLogs", {
  id: int("id").autoincrement().primaryKey(),
  branchId: int("branchId").notNull(),
  loanApplicationId: int("loanApplicationId"),
  actorId: int("actorId").notNull(),
  action: varchar("action", { length: 80 }).notNull(),
  reason: text("reason").notNull(),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Branch = typeof branches.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type LoanApplication = typeof loanApplications.$inferSelect;
export type Repayment = typeof repayments.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
