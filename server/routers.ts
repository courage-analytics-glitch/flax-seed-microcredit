import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { auditLogs, branches, clients, loanApplications, repayments } from "../drizzle/schema";
import { canApprove, canViewBranch, isConflictOfInterest } from "../shared/access-control";
import { calculateFlatRepaymentSchedule, requiresSecurity, getOutstandingBalance } from "../shared/loan-calculations";
import { getSessionCookieOptions } from "./_core/cookies";
import { COOKIE_NAME } from "@shared/const";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { getAuditLogs, getBranchById, getBranches, getClients, getDb, getLoanApplications, getLoanById, getPortfolioSummary, getRepayments } from "./db";

const roleGuard = (roles: string[]) => protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.user || (!roles.includes(ctx.user.role) && ctx.user.role !== "admin")) throw new TRPCError({ code: "FORBIDDEN", message: "Your role cannot perform this action." });
  return next();
});
const branchIdsFor = (user: NonNullable<Parameters<typeof canViewBranch>[0]> extends never ? never : { role: string; branchId?: number | null }) => user.role === "general_manager" || user.role === "admin" ? undefined : user.branchId ? [user.branchId] : [];

export const appRouter = router({
  system: router({ health: publicProcedure.query(() => ({ ok: true })) }),
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => { ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 }); return { success: true } as const; }),
  }),
  branches: router({ list: protectedProcedure.query(({ ctx }) => getBranches().then(rows => rows.filter(row => canViewBranch(ctx.user?.role ?? "user", ctx.user?.branchId, row.id)))) }),
  clients: router({
    list: protectedProcedure.query(({ ctx }) => getClients(ctx.user?.role === "general_manager" || ctx.user?.role === "admin" ? undefined : ctx.user?.branchId ?? -1)),
    create: roleGuard(["loan_officer", "branch_manager", "general_manager"]).input(z.object({ branchId: z.number().int().positive().optional(), fullName: z.string().min(2), phone: z.string().min(7), nationalId: z.string().optional(), occupation: z.string().optional() })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const branchId = ctx.user.role === "general_manager" || ctx.user.role === "admin" ? input.branchId : ctx.user.branchId;
      if (!branchId) throw new TRPCError({ code: "BAD_REQUEST", message: "A branch is required." });
      const result = await db.insert(clients).values({ branchId, fullName: input.fullName, phone: input.phone, nationalId: input.nationalId, occupation: input.occupation });
      return { id: result[0].insertId };
    }),
  }),
  loans: router({
    list: roleGuard(["loan_officer", "credit_committee", "branch_manager", "finance_collections", "general_manager"]).query(({ ctx }) => getLoanApplications(branchIdsFor(ctx.user as any))),
    get: roleGuard(["loan_officer", "credit_committee", "branch_manager", "finance_collections", "general_manager"]).input(z.object({ id: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const loan = await getLoanById(input.id); if (!loan || !canViewBranch(ctx.user?.role ?? "user", ctx.user?.branchId, loan.branchId)) throw new TRPCError({ code: "NOT_FOUND" }); return loan;
    }),
    estimate: publicProcedure.input(z.object({ principal: z.number().positive(), termMonths: z.number().int().min(1).max(60), product: z.enum(["business", "individual", "group", "salary"]) })).query(({ input }) => calculateFlatRepaymentSchedule(input.principal, input.termMonths, input.product)),
    create: roleGuard(["loan_officer", "branch_manager", "general_manager"]).input(z.object({ clientId: z.number().int().positive(), branchId: z.number().int().positive().optional(), principal: z.number().positive(), termMonths: z.number().int().min(1).max(60), product: z.enum(["business", "individual", "group", "salary"]), securityType: z.enum(["none", "guarantor", "collateral"]).default("none"), securityVerified: z.boolean().default(false), reason: z.string().min(1) })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const branchId = ctx.user.role === "general_manager" || ctx.user.role === "admin" ? input.branchId : ctx.user.branchId;
      if (!branchId) throw new TRPCError({ code: "BAD_REQUEST", message: "A branch is required." });
      if (requiresSecurity(input.principal) && (input.securityType === "none" || !input.securityVerified)) throw new TRPCError({ code: "BAD_REQUEST", message: "Loans above GHS 10,000 require verified guarantor or collateral security." });
      const schedule = calculateFlatRepaymentSchedule(input.principal, input.termMonths, input.product);
      const result = await db.insert(loanApplications).values({ branchId, clientId: input.clientId, createdBy: ctx.user.id, product: input.product, principal: input.principal.toFixed(2), termMonths: input.termMonths, securityType: input.securityType, securityVerified: input.securityVerified ? 1 : 0, totalInterest: schedule.totalInterest.toFixed(2), totalRepayable: schedule.totalRepayable.toFixed(2) });
      await db.insert(auditLogs).values({ branchId, loanApplicationId: result[0].insertId, actorId: ctx.user.id, action: "application_submitted", reason: input.reason });
      return { id: result[0].insertId, schedule };
    }),
    markReview: roleGuard(["credit_committee", "branch_manager", "general_manager"]).input(z.object({ id: z.number().int().positive(), reason: z.string().min(1) })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); const loan = await getLoanById(input.id); if (!loan || !canViewBranch(ctx.user.role as any, ctx.user.branchId, loan.branchId)) throw new TRPCError({ code: "NOT_FOUND" }); await db.update(loanApplications).set({ status: "under_review" }).where(and(eq(loanApplications.id, input.id), eq(loanApplications.status, "submitted"))); await db.insert(auditLogs).values({ branchId: loan.branchId, loanApplicationId: loan.id, actorId: ctx.user.id, action: "under_review", reason: input.reason }); return { success: true }; }),
    verifySecurity: roleGuard(["credit_committee", "branch_manager", "general_manager"]).input(z.object({ id: z.number().int().positive(), reason: z.string().min(1) })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); const loan = await getLoanById(input.id); if (!loan || !canViewBranch(ctx.user.role as any, ctx.user.branchId, loan.branchId)) throw new TRPCError({ code: "NOT_FOUND" }); await db.update(loanApplications).set({ securityVerified: 1 }).where(eq(loanApplications.id, input.id)); await db.insert(auditLogs).values({ branchId: loan.branchId, loanApplicationId: loan.id, actorId: ctx.user.id, action: "security_verified", reason: input.reason }); return { success: true }; }),
    review: roleGuard(["credit_committee", "branch_manager", "general_manager"]).input(z.object({ id: z.number().int().positive(), decision: z.enum(["approved", "rejected"]), reason: z.string().min(1) })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const loan = await getLoanById(input.id); if (!loan || !canViewBranch(ctx.user.role as any, ctx.user.branchId, loan.branchId)) throw new TRPCError({ code: "NOT_FOUND" });
      if (isConflictOfInterest(loan.createdBy, ctx.user.id)) throw new TRPCError({ code: "FORBIDDEN", message: "The application creator cannot approve or reject their own application." });
      const branch = await getBranchById(loan.branchId); if (!branch) throw new TRPCError({ code: "NOT_FOUND" });
      if (input.decision === "approved" && !canApprove(ctx.user.role as any, Number(loan.principal), Number(branch.authorityLimit))) throw new TRPCError({ code: "FORBIDDEN", message: "This role does not have authority for this amount." });
      const status = input.decision === "approved" ? "approved" : "rejected";
      await db.update(loanApplications).set({ status, decisionReason: input.reason, approvedBy: input.decision === "approved" ? ctx.user.id : null, approvedAt: input.decision === "approved" ? new Date() : null }).where(and(eq(loanApplications.id, input.id), eq(loanApplications.status, "under_review")));
      await db.insert(auditLogs).values({ branchId: loan.branchId, loanApplicationId: loan.id, actorId: ctx.user.id, action: input.decision, reason: input.reason });
      return { status, reason: input.reason };
    }),
    disburse: roleGuard(["finance_collections", "general_manager"]).input(z.object({ id: z.number().int().positive(), reason: z.string().min(1) })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); const loan = await getLoanById(input.id);
      if (!loan || !canViewBranch(ctx.user.role as any, ctx.user.branchId, loan.branchId)) throw new TRPCError({ code: "NOT_FOUND" });
      if (loan.status !== "approved") throw new TRPCError({ code: "BAD_REQUEST", message: "Only approved loans can be disbursed." });
      await db.update(loanApplications).set({ status: "active", disbursedAt: new Date() }).where(eq(loanApplications.id, input.id));
      await db.insert(auditLogs).values({ branchId: loan.branchId, loanApplicationId: loan.id, actorId: ctx.user.id, action: "disbursed", reason: input.reason }); return { success: true };
    }),
  }),
  repayments: router({
    list: roleGuard(["finance_collections", "compliance", "branch_manager", "general_manager"]).query(({ ctx }) => getRepayments(branchIdsFor(ctx.user as any))),
    record: roleGuard(["finance_collections", "general_manager"]).input(z.object({ loanApplicationId: z.number().int().positive(), amount: z.number().positive(), reference: z.string().min(2), paidAt: z.coerce.date(), notes: z.string().optional(), reason: z.string().min(1) })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); const loan = await getLoanById(input.loanApplicationId);
      if (!loan || !canViewBranch(ctx.user.role as any, ctx.user.branchId, loan.branchId)) throw new TRPCError({ code: "NOT_FOUND" });
      const result = await db.insert(repayments).values({ loanApplicationId: loan.id, branchId: loan.branchId, recordedBy: ctx.user.id, amount: input.amount.toFixed(2), reference: input.reference, paidAt: input.paidAt, notes: input.notes });
      const priorPaid = (await getRepayments()).filter(x => x.loanApplicationId === loan.id).reduce((sum, row) => sum + Number(row.amount), 0);
      const isComplete = priorPaid + input.amount >= Number(loan.totalRepayable ?? 0);
      if (isComplete) await db.update(loanApplications).set({ status: "completed" }).where(eq(loanApplications.id, loan.id));
      await db.insert(auditLogs).values({ branchId: loan.branchId, loanApplicationId: loan.id, actorId: ctx.user.id, action: isComplete ? "loan_completed" : "repayment_recorded", reason: input.reason }); return { id: result[0].insertId, completed: isComplete };
    }),
    outstanding: protectedProcedure.input(z.object({ loanApplicationId: z.number().int().positive() })).query(async ({ input }) => { const loan = await getLoanById(input.loanApplicationId); const paid = (await getRepayments()).filter(x => x.loanApplicationId === input.loanApplicationId).reduce((sum, row) => sum + Number(row.amount), 0); return { outstanding: getOutstandingBalance(Number(loan?.totalRepayable ?? 0), paid), paid }; }),
  }),
  audit: router({ list: roleGuard(["compliance", "general_manager", "branch_manager"]).query(({ ctx }) => getAuditLogs(branchIdsFor(ctx.user as any))) }),
  reports: router({ summary: roleGuard(["compliance", "finance_collections", "branch_manager", "general_manager"]).query(({ ctx }) => getPortfolioSummary(branchIdsFor(ctx.user as any))) }),
});

export type AppRouter = typeof appRouter;
