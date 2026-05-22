import { useState, useMemo, useEffect, type ReactNode } from 'react';
import { runAllScenarios, formatKRW, type LoanResult } from './utils/calculator';
import { useAppSettings } from './hooks/useAppSettings';
import {
  LOAN_RATE_TYPES,
  calcStressRate,
  getStressRatio,
  type LoanRateType,
} from './utils/stressDsr';
import './styles/main.scss';

function App() {
  const {
    settings,
    setIncomeYear,
    setIncome2025,
    setIncome2026,
    setAssets,
    setRate1st,
    setRate2nd,
    setRateFixed30,
    setStressBase,
    setLoanRateType,
    setLoanTermYears,
  } = useAppSettings();

  const {
    incomeYear,
    income2025,
    income2026,
    assets,
    rate1st,
    rate2nd,
    rateFixed30,
    stressBase,
    loanRateType,
    loanTermYears,
  } = settings;

  const stressRate = calcStressRate(stressBase, loanRateType);
  const stressRatio = getStressRatio(loanRateType);

  const annualIncome = incomeYear === '2025' ? income2025 : income2026;

  const results = useMemo(() => {
    return runAllScenarios(
      annualIncome * 10000,
      assets * 10000,
      rate1st,
      rate2nd,
      rateFixed30,
      stressRate,
      loanTermYears
    );
  }, [annualIncome, assets, rate1st, rate2nd, rateFixed30, stressRate, loanTermYears]);

  const bestResult = useMemo(() => {
    return results.reduce((best, r) =>
      r.stressMaxPropertyPrice > best.stressMaxPropertyPrice ? r : best
    , results[0]);
  }, [results]);

  return (
    <div className="layout">
      <aside className="sidebar">
        <header className="sidebar__brand">
          <span className="sidebar__mark" aria-hidden="true" />
          <div>
            <h1 className="sidebar__title">Estate Scouter</h1>
            <p className="sidebar__desc">분양권 · 대출 한도</p>
          </div>
        </header>

        <nav className="sidebar__nav">
          <SidebarSection title="소득">
            <div className="sidebar__segmented-wrap">
              <div className="segmented" role="group" aria-label="기준 연도">
                <button
                  type="button"
                  className={`segmented__btn ${incomeYear === '2025' ? 'segmented__btn--active' : ''}`}
                  onClick={() => setIncomeYear('2025')}
                >
                  2025
                </button>
                <button
                  type="button"
                  className={`segmented__btn ${incomeYear === '2026' ? 'segmented__btn--active' : ''}`}
                  onClick={() => setIncomeYear('2026')}
                >
                  2026
                </button>
              </div>
            </div>
            <InputField
              label="2025년 원천징수"
              value={income2025}
              onChange={setIncome2025}
              suffix="만원"
              active={incomeYear === '2025'}
            />
            <InputField
              label="2026년 원천징수"
              value={income2026}
              onChange={setIncome2026}
              suffix="만원"
              active={incomeYear === '2026'}
            />
          </SidebarSection>

          <SidebarSection title="자산">
            <InputField label="보유 자산" value={assets} onChange={setAssets} suffix="만원" />
          </SidebarSection>

          <SidebarSection title="금리">
            <InputField label="1금융 주담대" value={rate1st} onChange={setRate1st} suffix="%" />
            <InputField label="2금융 주담대" value={rate2nd} onChange={setRate2nd} suffix="%" />
            <InputField label="고정 30년" value={rateFixed30} onChange={setRateFixed30} suffix="%" />
          </SidebarSection>

          <SidebarSection title="스트레스 DSR">
            <InputField label="기본 스트레스 금리" value={stressBase} onChange={setStressBase} suffix="%" />
            <div className="field">
              <span className="field__label">금리 유형</span>
              <select
                className="field__select"
                value={loanRateType}
                onChange={(e) => setLoanRateType(e.target.value as LoanRateType)}
              >
                {LOAN_RATE_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label} ({Math.round(t.ratio * 100)}%)
                  </option>
                ))}
              </select>
            </div>
            <div className="stress-result">
              <span className="stress-result__label">적용 가산금리</span>
              <span className="stress-result__value">
                {stressBase}% × {Math.round(stressRatio * 100)}% = <strong>{stressRate}%</strong>
              </span>
            </div>
          </SidebarSection>

          <SidebarSection title="대출">
            <InputField
              label="상환 기간"
              value={loanTermYears}
              onChange={setLoanTermYears}
              suffix="년"
              min={10}
              max={50}
            />
          </SidebarSection>
        </nav>
      </aside>

      <main className="content">
        <div className="content__inner">
          <section className="hero" aria-labelledby="hero-title">
            <p className="hero__eyebrow" id="hero-title">최대 매입 가능 금액</p>
            <p className="hero__amount">{formatKRW(bestResult.stressMaxPropertyPrice)}</p>
            <p className="hero__sub">
              <span className="hero__badge">{bestResult.label}</span>
              스트레스 DSR {bestResult.effectiveRate.toFixed(2)}% · {incomeYear}년 소득 {formatKRW(annualIncome * 10000)}
            </p>

            <dl className="hero__stats">
              <div className="hero__stat">
                <dt>최대 대출</dt>
                <dd>{formatKRW(bestResult.stressMaxLoanAmount)}</dd>
              </div>
              <div className="hero__stat">
                <dt>자기자본</dt>
                <dd>{formatKRW(assets * 10000)}</dd>
              </div>
              <div className="hero__stat hero__stat--accent">
                <dt>월 상환액</dt>
                <dd>{formatKRW(bestResult.stressMonthlyPayment)}</dd>
              </div>
            </dl>
          </section>

          <section className="compare" aria-labelledby="compare-title">
            <h2 className="compare__title" id="compare-title">시나리오 한눈에 비교</h2>
            <CompareTable results={results} best={bestResult} />
          </section>

          <footer className="content__footer">
            참고용 계산입니다. 실제 한도는 금융기관 심사 결과에 따라 달라질 수 있습니다.
          </footer>
        </div>
      </main>
    </div>
  );
}

function SidebarSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="sidebar__section">
      <h3 className="sidebar__heading">{title}</h3>
      <div className="sidebar__fields">{children}</div>
    </div>
  );
}

interface InputFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix: string;
  step?: number;
  min?: number;
  max?: number;
  active?: boolean;
}

function formatFieldDisplay(num: number): string {
  return num === 0 ? '' : String(num);
}

function parseFieldInput(raw: string): number | null {
  if (raw === '' || raw === '-' || raw === '.') return null;
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
}

function clampFieldValue(num: number, min: number, max?: number): number {
  const floored = Math.max(min, num);
  return max !== undefined ? Math.min(max, floored) : floored;
}

function InputField({
  label,
  value,
  onChange,
  suffix,
  min = 0,
  max,
  active,
}: InputFieldProps) {
  const [text, setText] = useState(() => formatFieldDisplay(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setText(formatFieldDisplay(value));
    }
  }, [value, focused]);

  return (
    <label className={`field ${active ? 'field--active' : ''}`}>
      <span className="field__label">{label}</span>
      <span className="field__control">
        <input
          type="text"
          inputMode="decimal"
          className="field__input"
          value={text}
          onFocus={() => {
            setFocused(true);
            setText(formatFieldDisplay(value));
          }}
          onBlur={() => {
            setFocused(false);
            const parsed = parseFieldInput(text);
            if (parsed === null) {
              setText(formatFieldDisplay(value));
              return;
            }
            const next = clampFieldValue(parsed, min, max);
            onChange(next);
            setText(formatFieldDisplay(next));
          }}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw !== '' && !/^-?\d*\.?\d*$/.test(raw)) return;
            setText(raw);
            const parsed = parseFieldInput(raw);
            if (parsed !== null) {
              onChange(clampFieldValue(parsed, min, max));
            }
          }}
        />
        <span className="field__suffix">{suffix}</span>
      </span>
    </label>
  );
}

function getScenarioMetrics(r: LoanResult) {
  const hasStress = r.effectiveRate !== r.interestRate;
  return {
    hasStress,
    price: hasStress ? r.stressMaxPropertyPrice : r.maxPropertyPrice,
    loan: hasStress ? r.stressMaxLoanAmount : r.maxLoanAmount,
    monthly: hasStress ? r.stressMonthlyPayment : r.monthlyPaymentAtMax,
    basePrice: r.maxPropertyPrice,
  };
}

function CompareTable({ results, best }: { results: LoanResult[]; best: LoanResult }) {
  const rows: { label: string; key: 'price' | 'loan' | 'monthly' | 'basePrice'; highlight?: boolean }[] = [
    { label: '매입 가능', key: 'price', highlight: true },
    { label: '최대 대출', key: 'loan' },
    { label: '월 상환액', key: 'monthly' },
    { label: '기본 금리 시 매입', key: 'basePrice' },
  ];

  return (
    <div className="compare__wrap">
      <table className="compare__table">
        <thead>
          <tr>
            <th className="compare__corner" scope="col" />
            {results.map((r, i) => (
              <th
                key={i}
                scope="col"
                className={r === best ? 'compare__col--best' : ''}
              >
                <span className="compare__col-name">{r.label}</span>
                <span className="compare__col-meta">
                  DSR {r.dsrLimit}% · {r.interestRate}%
                  {r.effectiveRate !== r.interestRate && ` → ${r.effectiveRate.toFixed(2)}%`}
                </span>
                {r === best && <span className="compare__col-tag">추천</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className={row.highlight ? 'compare__row--main' : ''}>
              <th scope="row">{row.label}</th>
              {results.map((r, i) => {
                const m = getScenarioMetrics(r);
                const val = m[row.key];
                const show = row.key === 'basePrice' ? m.hasStress : true;
                return (
                  <td
                    key={i}
                    className={[
                      r === best ? 'compare__col--best' : '',
                      row.highlight ? 'compare__cell--main' : '',
                    ].filter(Boolean).join(' ')}
                  >
                    {show ? formatKRW(val) : '—'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;
