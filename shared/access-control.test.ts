import { describe, expect, it } from "vitest";
import { canApprove, canViewBranch, isComplianceSeparated, isConflictOfInterest } from "./access-control";

describe("loan-management authorization rules", () => {
  it("prevents an application creator from approving their own application", () => {
    expect(isConflictOfInterest(42, 42)).toBe(true);
    expect(isConflictOfInterest(42, 43)).toBe(false);
  });

  it("keeps branch users from viewing another branch", () => {
    expect(canViewBranch("loan_officer", 1, 1)).toBe(true);
    expect(canViewBranch("loan_officer", 1, 2)).toBe(false);
    expect(canViewBranch("general_manager", null, 2)).toBe(true);
  });

  it("limits a branch manager to their authority limit", () => {
    expect(canApprove("branch_manager", 10000, 10000)).toBe(true);
    expect(canApprove("branch_manager", 10000.01, 10000)).toBe(false);
    expect(canApprove("credit_committee", 50000, 10000)).toBe(true);
  });

  it("keeps compliance separated from day-to-day approvals", () => {
    expect(isComplianceSeparated("compliance")).toBe(true);
    expect(canApprove("compliance", 1000, 10000)).toBe(false);
  });
});
