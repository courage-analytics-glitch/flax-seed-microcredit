import { describe, expect, it } from "vitest";
import { canApprove, canViewBranch, isComplianceSeparated, isConflictOfInterest } from "../shared/access-control";
import { calculateFlatRepaymentSchedule, getOutstandingBalance, requiresSecurity } from "../shared/loan-calculations";

describe("loan-management validation rules", () => {
  it("matches hand-checked flat-rate schedules", () => {
    const schedule = calculateFlatRepaymentSchedule(1000, 4, "business");
    expect(schedule.totalInterest).toBe(180);
    expect(schedule.totalRepayable).toBe(1180);
    expect(schedule.installments.map(x => x.amount)).toEqual([295, 295, 295, 295]);
    expect(schedule.installments.at(-1)?.remainingBalance).toBe(0);
  });

  it("keeps cents balanced and outstanding balances deterministic", () => {
    const schedule = calculateFlatRepaymentSchedule(1234.56, 7, "salary");
    expect(schedule.installments.reduce((sum, row) => sum + row.amount, 0)).toBe(schedule.totalRepayable);
    expect(getOutstandingBalance(1180, 295)).toBe(885);
  });

  it("enforces the GHS 10,000 security threshold", () => {
    expect(requiresSecurity(10000)).toBe(false);
    expect(requiresSecurity(10000.01)).toBe(true);
  });

  it("prevents self-approval and isolates branches", () => {
    expect(isConflictOfInterest(42, 42)).toBe(true);
    expect(canViewBranch("loan_officer", 1, 1)).toBe(true);
    expect(canViewBranch("loan_officer", 1, 2)).toBe(false);
    expect(canViewBranch("general_manager", null, 2)).toBe(true);
  });

  it("separates compliance from approval and limits branch managers", () => {
    expect(isComplianceSeparated("compliance")).toBe(true);
    expect(canApprove("compliance", 1000, 10000)).toBe(false);
    expect(canApprove("branch_manager", 10000, 10000)).toBe(true);
    expect(canApprove("branch_manager", 10000.01, 10000)).toBe(false);
    expect(canApprove("credit_committee", 50000, 10000)).toBe(true);
  });
});
