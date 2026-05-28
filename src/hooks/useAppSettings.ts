import { useState, useEffect, useCallback } from 'react';
import {
  type AppSettings,
  type IncomeYear,
  loadSettings,
  saveSettings,
} from '../utils/storage';
import { type LoanRateType } from '../utils/stressDsr';
import { type OwnedHomes } from '../utils/acquisitionCost';

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const patch = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  return {
    settings,
    setIncomeYear: (v: IncomeYear) => patch('incomeYear', v),
    setIncome2025: (v: number) => patch('income2025', v),
    setIncome2026: (v: number) => patch('income2026', v),
    setAssets: (v: number) => patch('assets', v),
    setRate1st: (v: number) => patch('rate1st', v),
    setRate2nd: (v: number) => patch('rate2nd', v),
    setRateFixed30: (v: number) => patch('rateFixed30', v),
    setStressBase: (v: number) => patch('stressBase', v),
    setLoanRateType: (v: LoanRateType) => patch('loanRateType', v),
    setLoanTermYears: (v: number) => patch('loanTermYears', v),
    setOwnedHomes: (v: OwnedHomes) => patch('ownedHomes', v),
    setIsLargeArea: (v: boolean) => patch('isLargeArea', v),
    setLtv: (v: number) => patch('ltv', v),
    setAppraisalRate: (v: number) => patch('appraisalRate', v),
    setInterimRate: (v: number) => patch('interimRate', v),
    setInterimTotalMonths: (v: number) => patch('interimTotalMonths', v),
  };
}
