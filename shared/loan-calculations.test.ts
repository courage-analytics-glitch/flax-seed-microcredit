import { describe, expect, it } from "vitest";
import { calculateFlatRepaymentSchedule, getOutstandingBalance, requiresSecurity } from "./loan-calculations";

describe("flat repayment schedule", () => {
  it("matches a hand-checked GHS 1,000 business loan over 4 months", () => {
    const schedule = calculateFlatRepaymentSchedule(1000, 4, "business");
    expect(schedule.totalInterest).toBe(180);
    expect(schedule.totalRepayable).toBe(1180);
    expect(schedule.installments.map(x => x.amount)).toEqual([295, 295, 295, 295]);
    expect(schedule.installments.at(-1)?.remainingBalance).toBe(0);
  });

  it("keeps cents balanced on a non-even repayment", () => {
    const schedule = calculateFlatRepaymentSchedule(1234.56, 7, "salary");
    expect(schedule.installments.reduce((sum, row) => sum + row.amount, 0)).toBe(schedule.totalRepayable);
    expect(schedule.installments.at(-1)?.remainingBalance).toBe(0);
  });

  it("applies security only above GHS 10,000", () => {
    expect(requiresSecurity(10000)).toBe(false);
    expect(requiresSecurity(10000.01)).toBe(true);
  });

  it("calculates an outstanding balance from the same total", () => {
    expect(getOutstandingBalance(1180, 295)).toBe(885);
  });
});
