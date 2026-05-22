export type LoanRateType =
  | 'variable'
  | 'mixed_under5'
  | 'mixed_5to9'
  | 'mixed_9to15'
  | 'mixed_15to21'
  | 'periodic_5'
  | 'periodic_9to15'
  | 'periodic_15to21'
  | 'fixed';

export interface LoanRateTypeInfo {
  id: LoanRateType;
  label: string;
  shortLabel: string;
  ratio: number;
}

export const LOAN_RATE_TYPES: LoanRateTypeInfo[] = [
  { id: 'variable',       label: '변동형',                    shortLabel: '변동',      ratio: 1.0  },
  { id: 'mixed_under5',   label: '혼합형 (고정 5년 미만)',     shortLabel: '혼합<5',    ratio: 1.0  },
  { id: 'mixed_5to9',     label: '혼합형 (고정 5~9년)',       shortLabel: '혼합5~9',   ratio: 0.8  },
  { id: 'mixed_9to15',    label: '혼합형 (고정 9~15년)',      shortLabel: '혼합9~15',  ratio: 0.6  },
  { id: 'mixed_15to21',   label: '혼합형 (고정 15~21년)',     shortLabel: '혼합15~21', ratio: 0.4  },
  { id: 'periodic_5',     label: '주기형 (5년 주기)',          shortLabel: '주기5',     ratio: 0.4  },
  { id: 'periodic_9to15', label: '주기형 (9~15년 주기)',       shortLabel: '주기9~15',  ratio: 0.3  },
  { id: 'periodic_15to21',label: '주기형 (15~21년 주기)',      shortLabel: '주기15~21', ratio: 0.2  },
  { id: 'fixed',          label: '순수 고정금리 (만기 고정)',   shortLabel: '순수고정',   ratio: 0.0  },
];

export function getStressRatio(type: LoanRateType): number {
  return LOAN_RATE_TYPES.find((t) => t.id === type)?.ratio ?? 1.0;
}

export function calcStressRate(baseStress: number, type: LoanRateType): number {
  return Math.round(baseStress * getStressRatio(type) * 100) / 100;
}

export function isValidLoanRateType(value: unknown): value is LoanRateType {
  return typeof value === 'string' && LOAN_RATE_TYPES.some((t) => t.id === value);
}
