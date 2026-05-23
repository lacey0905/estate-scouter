import {
  type OwnedHomes,
  type AcquisitionCostBreakdown,
  calcAdjustedPropertyPrice,
} from './acquisitionCost';

export interface LoanInput {
  annualIncome: number;
  assets: number;
  interestRate: number;
  loanTermYears: number;
  dsrLimit: number;
  stressDsrRate: number;
}

export interface LoanResult {
  label: string;
  dsrLimit: number;
  interestRate: number;
  effectiveRate: number;
  maxAnnualPayment: number;
  maxMonthlyPayment: number;
  maxLoanAmount: number;
  maxPropertyPrice: number;
  monthlyPaymentAtMax: number;
  stressMaxLoanAmount: number;
  stressMaxPropertyPrice: number;
  stressMonthlyPayment: number;
  adjustedPrice: number;
  acquisitionCosts: AcquisitionCostBreakdown;
}

/**
 * 원리금균등상환 월 납입액 계산
 * PMT = P × [r(1+r)^n] / [(1+r)^n - 1]
 */
export function calcMonthlyPayment(
  principal: number,
  annualRate: number,
  termYears: number
): number {
  const r = annualRate / 100 / 12;
  const n = termYears * 12;
  if (r === 0) return principal / n;
  return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

/**
 * DSR 기준 최대 대출 가능 원금 역산
 */
export function calcMaxLoanFromDSR(
  annualIncome: number,
  dsrLimit: number,
  annualRate: number,
  termYears: number
): number {
  const maxAnnualPayment = annualIncome * (dsrLimit / 100);
  if (maxAnnualPayment <= 0) return 0;

  const maxMonthly = maxAnnualPayment / 12;
  const r = annualRate / 100 / 12;
  const n = termYears * 12;

  if (r === 0) return maxMonthly * n;
  return maxMonthly * (Math.pow(1 + r, n) - 1) / (r * Math.pow(1 + r, n));
}

/**
 * LTV 기준 최대 대출 가능 원금
 * property = assets + loan, loan ≤ property × LTV
 * → loan ≤ assets × LTV / (1 - LTV)
 */
function calcMaxLoanFromLTV(assets: number, ltvPercent: number): number {
  if (ltvPercent <= 0 || ltvPercent >= 100) return Infinity;
  return assets * (ltvPercent / 100) / (1 - ltvPercent / 100);
}

export function calculateLoanScenario(
  input: LoanInput,
  label: string,
  ownedHomes: OwnedHomes,
  isLargeArea: boolean,
  interimRate = 0,
  interimTotalMonths = 0,
  ltvPercent = 70,
): LoanResult {
  const { annualIncome, assets, interestRate, loanTermYears, dsrLimit, stressDsrRate } = input;

  const effectiveRate = interestRate + stressDsrRate;

  const dsrMaxLoan = calcMaxLoanFromDSR(
    annualIncome, dsrLimit, interestRate, loanTermYears
  );

  const dsrStressMaxLoan = calcMaxLoanFromDSR(
    annualIncome, dsrLimit, effectiveRate, loanTermYears
  );

  const ltvMaxLoan = calcMaxLoanFromLTV(assets, ltvPercent);

  const maxLoanAmount = Math.min(dsrMaxLoan, ltvMaxLoan);
  const stressMaxLoanAmount = Math.min(dsrStressMaxLoan, ltvMaxLoan);

  const maxAnnualPayment = annualIncome * (dsrLimit / 100);
  const maxMonthlyPayment = maxAnnualPayment / 12;
  const monthlyPaymentAtMax = calcMonthlyPayment(maxLoanAmount, interestRate, loanTermYears);
  const stressMonthlyPayment = calcMonthlyPayment(stressMaxLoanAmount, effectiveRate, loanTermYears);

  const stressMaxPropertyPrice = Math.max(0, assets + stressMaxLoanAmount);

  const { adjustedPrice, costs } = calcAdjustedPropertyPrice(
    stressMaxPropertyPrice,
    ownedHomes,
    isLargeArea,
    interimRate,
    interimTotalMonths,
  );

  return {
    label,
    dsrLimit,
    interestRate,
    effectiveRate,
    maxAnnualPayment,
    maxMonthlyPayment,
    maxLoanAmount: Math.max(0, maxLoanAmount),
    maxPropertyPrice: Math.max(0, assets + maxLoanAmount),
    monthlyPaymentAtMax,
    stressMaxLoanAmount: Math.max(0, stressMaxLoanAmount),
    stressMaxPropertyPrice,
    stressMonthlyPayment,
    adjustedPrice,
    acquisitionCosts: costs,
  };
}

export function runAllScenarios(
  annualIncome: number,
  assets: number,
  rate1st: number,
  rate2nd: number,
  rateFixed30: number,
  stressRate: number,
  loanTermYears: number,
  ownedHomes: OwnedHomes,
  isLargeArea: boolean,
  interimRate = 0,
  interimTotalMonths = 0,
  ltvPercent = 70,
): LoanResult[] {
  const results: LoanResult[] = [];

  results.push(calculateLoanScenario({
    annualIncome, assets,
    interestRate: rate1st,
    loanTermYears,
    dsrLimit: 40,
    stressDsrRate: stressRate,
  }, '1금융 주담대', ownedHomes, isLargeArea, interimRate, interimTotalMonths, ltvPercent));

  results.push(calculateLoanScenario({
    annualIncome, assets,
    interestRate: rate2nd,
    loanTermYears,
    dsrLimit: 50,
    stressDsrRate: stressRate,
  }, '2금융 주담대', ownedHomes, isLargeArea, interimRate, interimTotalMonths, ltvPercent));

  results.push(calculateLoanScenario({
    annualIncome, assets,
    interestRate: rateFixed30,
    loanTermYears: 30,
    dsrLimit: 40,
    stressDsrRate: 0,
  }, '1금융 순수고정 30년', ownedHomes, isLargeArea, interimRate, interimTotalMonths, ltvPercent));

  return results;
}

export function formatKRW(amount: number): string {
  if (amount >= 100_000_000) {
    const eok = Math.floor(amount / 100_000_000);
    const man = Math.floor((amount % 100_000_000) / 10_000);
    return man > 0 ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`;
  }
  if (amount >= 10_000) {
    return `${Math.floor(amount / 10_000).toLocaleString()}만원`;
  }
  return `${Math.floor(amount).toLocaleString()}원`;
}
