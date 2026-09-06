import type { UserRole } from "../drizzle/schema";

export const approvalRoles: UserRole[] = ["credit_committee", "branch_manager", "general_manager"];
export const operationsRoles: UserRole[] = ["loan_officer", "credit_committee", "branch_manager", "finance_collections", "compliance", "general_manager"];

export function canApprove(role: UserRole, amount: number, branchAuthorityLimit: number): boolean {
  if (!approvalRoles.includes(role)) return false;
  if (role === "branch_manager") return amount <= branchAuthorityLimit;
  return true;
}

export function canViewBranch(userRole: UserRole | "admin" | "user", userBranchId: number | null | undefined, requestedBranchId: number): boolean {
  return userRole === "general_manager" || userRole === "admin" || userBranchId === requestedBranchId;
}

export function isConflictOfInterest(creatorId: number, actorId: number): boolean {
  return creatorId === actorId;
}

export function isComplianceSeparated(role: UserRole): boolean {
  return role === "compliance";
}
