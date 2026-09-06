import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, auditLogs, branches, clients, loanApplications, repayments, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); } catch (error) { console.warn("[Database] Failed to connect:", error); }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) { values[field] = user[field] ?? null; updateSet[field] = values[field]; }
  }
  values.lastSignedIn = user.lastSignedIn ?? new Date(); updateSet.lastSignedIn = values.lastSignedIn;
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1); return result[0];
}

export async function getBranches() { const db = await getDb(); return db ? db.select().from(branches).orderBy(branches.name) : []; }
export async function getBranchById(id: number) { const db = await getDb(); if (!db) return undefined; const result = await db.select().from(branches).where(eq(branches.id, id)).limit(1); return result[0]; }
export async function getClients(branchId?: number) {
  const db = await getDb(); if (!db) return [];
  return branchId ? db.select().from(clients).where(eq(clients.branchId, branchId)).orderBy(desc(clients.createdAt)) : db.select().from(clients).orderBy(desc(clients.createdAt));
}
export async function getLoanApplications(branchIds?: number[]) {
  const db = await getDb(); if (!db) return [];
  const base = db.select({ loan: loanApplications, client: clients, creator: users }).from(loanApplications).leftJoin(clients, eq(loanApplications.clientId, clients.id)).leftJoin(users, eq(loanApplications.createdBy, users.id));
  return branchIds?.length ? base.where(inArray(loanApplications.branchId, branchIds)).orderBy(desc(loanApplications.createdAt)) : base.orderBy(desc(loanApplications.createdAt));
}
export async function getLoanById(id: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(loanApplications).where(eq(loanApplications.id, id)).limit(1); return result[0];
}
export async function getRepayments(branchIds?: number[]) {
  const db = await getDb(); if (!db) return [];
  const query = db.select().from(repayments);
  return branchIds?.length ? query.where(inArray(repayments.branchId, branchIds)).orderBy(desc(repayments.paidAt)) : query.orderBy(desc(repayments.paidAt));
}
export async function getAuditLogs(branchIds?: number[]) {
  const db = await getDb(); if (!db) return [];
  const query = db.select().from(auditLogs);
  return branchIds?.length ? query.where(inArray(auditLogs.branchId, branchIds)).orderBy(desc(auditLogs.createdAt)) : query.orderBy(desc(auditLogs.createdAt));
}
export async function getPortfolioSummary(branchIds?: number[]) {
  const db = await getDb(); if (!db) return { activeLoans: 0, portfolio: 0, collected: 0, arrears: 0 };
  const loanWhere = branchIds?.length ? inArray(loanApplications.branchId, branchIds) : undefined;
  const repaymentWhere = branchIds?.length ? inArray(repayments.branchId, branchIds) : undefined;
  const [loanStats, repaymentStats] = await Promise.all([
    db.select({ count: sql<number>`count(*)`, portfolio: sql<string>`coalesce(sum(${loanApplications.totalRepayable}), 0)` }).from(loanApplications).where(loanWhere ? and(loanWhere, inArray(loanApplications.status, ["active", "disbursed"])) : inArray(loanApplications.status, ["active", "disbursed"])),
    db.select({ collected: sql<string>`coalesce(sum(${repayments.amount}), 0)` }).from(repayments).where(repaymentWhere),
  ]);
  const portfolio = Number(loanStats[0]?.portfolio ?? 0); const collected = Number(repaymentStats[0]?.collected ?? 0);
  return { activeLoans: Number(loanStats[0]?.count ?? 0), portfolio, collected, arrears: Math.max(portfolio - collected, 0) };
}
