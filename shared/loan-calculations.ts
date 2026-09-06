export const MONTHLY_FLAT_RATE = 0.045;

export type LoanProduct = "business" | "individual" | "group" | "salary";

export type RepaymentInstallment = {
  installmentNumber: number;
  dueMonth: number;
  principal: number;
  interest: number;
  amount: number;
  remainingBalance: number;
};

export type RepaymentSchedule = {
  principal: number;
  termMonths: number;
  monthlyRate: number;
  totalInterest: number;
  totalRepayable: number;
  installments: RepaymentInstallment[];
};

const toCents = (amount: number) => Math.round(amount * 100);
const fromCents = (cents: number) => Number((cents / 100).toFixed(2));

/**
 * Calculates a flat-rate monthly repayment schedule in integer cents.
 * The same function must be used for estimates, recorded terms and reports.
 */
export function calculateFlatRepaymentSchedule(
  principal: number,
  termMonths: number,
  _product: LoanProduct,
): RepaymentSchedule {
  if (!Number.isFinite(principal) || principal <= 0) throw new Error("Principal must be greater than zero");
  if (!Number.isInteger(termMonths) || termMonths < 1 || termMonths > 60) throw new Error("Term must be between 1 and 60 months");

  const principalCents = toCents(principal);
  const totalInterestCents = Math.round(principalCents * MONTHLY_FLAT_RATE * termMonths);
  const totalRepayableCents = principalCents + totalInterestCents;
  const basePaymentCents = Math.floor(totalRepayableCents / termMonths);
  const installments: RepaymentInstallment[] = [];
  let remainingCents = totalRepayableCents;
  const principalPerMonthCents = Math.floor(principalCents / termMonths);
  const interestPerMonthCents = Math.floor(totalInterestCents / termMonths);

  for (let index = 1; index <= termMonths; index += 1) {
    const isFinal = index === termMonths;
    const amountCents = isFinal ? remainingCents : basePaymentCents;
    const principalPartCents = isFinal ? principalCents - principalPerMonthCents * (termMonths - 1) : principalPerMonthCents;
    const interestPartCents = amountCents - principalPartCents;
    remainingCents -= amountCents;
    installments.push({
      installmentNumber: index,
      dueMonth: index,
      principal: fromCents(principalPartCents),
      interest: fromCents(interestPartCents || interestPerMonthCents),
      amount: fromCents(amountCents),
      remainingBalance: fromCents(Math.max(remainingCents, 0)),
    });
  }

  return {
    principal: fromCents(principalCents),
    termMonths,
    monthlyRate: MONTHLY_FLAT_RATE,
    totalInterest: fromCents(totalInterestCents),
    totalRepayable: fromCents(totalRepayableCents),
    installments,
  };
}

export function getOutstandingBalance(totalRepayable: number, repayments: number): number {
  return fromCents(Math.max(toCents(totalRepayable) - toCents(repayments), 0));
}

export function requiresSecurity(principal: number): boolean {
  return principal > 10_000;
}
