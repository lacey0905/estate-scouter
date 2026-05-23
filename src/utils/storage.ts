import { type LoanRateType, isValidLoanRateType } from './stressDsr';
import { type OwnedHomes } from './acquisitionCost';

export type IncomeYear = '2025' | '2026';

export interface AppSettings {
  incomeYear: IncomeYear;
  income2025: number;
  income2026: number;
  assets: number;
  rate1st: number;
  rate2nd: number;
  rateFixed30: number;
  stressBase: number;
  loanRateType: LoanRateType;
  loanTermYears: number;
  ownedHomes: OwnedHomes;
  isLargeArea: boolean;
  targetPriceMan: number;
  ltv: number;
  interimRate: number;
  interimTotalMonths: number;
}

export const STORAGE_KEY = 'estate-scouter:settings';

export const DEFAULT_SETTINGS: AppSettings = {
  incomeYear: '2026',
  income2025: 6500,
  income2026: 7500,
  assets: 24000,
  rate1st: 3.8,
  rate2nd: 5.5,
  rateFixed30: 4.2,
  stressBase: 1.5,
  loanRateType: 'mixed_5to9',
  loanTermYears: 30,
  ownedHomes: 0,
  isLargeArea: false,
  targetPriceMan: 50000,
  ltv: 70,
  interimRate: 3.95,
  interimTotalMonths: 78,
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function pickNumber(value: unknown, fallback: number): number {
  return isFiniteNumber(value) ? value : fallback;
}

function pickIncomeYear(value: unknown, fallback: IncomeYear): IncomeYear {
  return value === '2025' || value === '2026' ? value : fallback;
}

function pickLoanRateType(value: unknown, fallback: LoanRateType): LoanRateType {
  return isValidLoanRateType(value) ? value : fallback;
}

function pickOwnedHomes(value: unknown, fallback: OwnedHomes): OwnedHomes {
  return value === 0 || value === 1 || value === 2 ? value : fallback;
}

function pickBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

export function normalizeSettings(raw: unknown): AppSettings {
  const data = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

  const loanTermYears = pickNumber(data.loanTermYears, DEFAULT_SETTINGS.loanTermYears);

  return {
    incomeYear: pickIncomeYear(data.incomeYear, DEFAULT_SETTINGS.incomeYear),
    income2025: pickNumber(data.income2025, DEFAULT_SETTINGS.income2025),
    income2026: pickNumber(data.income2026, DEFAULT_SETTINGS.income2026),
    assets: pickNumber(data.assets, DEFAULT_SETTINGS.assets),
    rate1st: pickNumber(data.rate1st, DEFAULT_SETTINGS.rate1st),
    rate2nd: pickNumber(data.rate2nd, DEFAULT_SETTINGS.rate2nd),
    rateFixed30: pickNumber(data.rateFixed30, DEFAULT_SETTINGS.rateFixed30),
    stressBase: pickNumber(data.stressBase, DEFAULT_SETTINGS.stressBase),
    loanRateType: pickLoanRateType(data.loanRateType, DEFAULT_SETTINGS.loanRateType),
    loanTermYears: Math.min(50, Math.max(10, loanTermYears)),
    ownedHomes: pickOwnedHomes(data.ownedHomes, DEFAULT_SETTINGS.ownedHomes),
    isLargeArea: pickBoolean(data.isLargeArea, DEFAULT_SETTINGS.isLargeArea),
    targetPriceMan: Math.max(0, pickNumber(data.targetPriceMan, DEFAULT_SETTINGS.targetPriceMan)),
    ltv: Math.min(100, Math.max(0, pickNumber(data.ltv, DEFAULT_SETTINGS.ltv))),
    interimRate: pickNumber(data.interimRate, DEFAULT_SETTINGS.interimRate),
    interimTotalMonths: Math.max(0, pickNumber(data.interimTotalMonths, DEFAULT_SETTINGS.interimTotalMonths)),
  };
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return normalizeSettings(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // quota exceeded — 무시
  }
}

export function clearSettings(): void {
  localStorage.removeItem(STORAGE_KEY);
}
