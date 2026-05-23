import { useState, useMemo, useEffect, type ReactNode } from 'react';
import { runAllScenarios, calcMonthlyPayment, formatKRW, type LoanResult } from './utils/calculator';
import { useAppSettings } from './hooks/useAppSettings';
import {
  LOAN_RATE_TYPES,
  calcStressRate,
  getStressRatio,
  type LoanRateType,
} from './utils/stressDsr';
import { type OwnedHomes, calcAcquisitionCosts } from './utils/acquisitionCost';
import './styles/main.scss';

const OWNED_HOMES_OPTIONS: { value: OwnedHomes; label: string }[] = [
  { value: 0, label: '무주택' },
  { value: 1, label: '1주택' },
  { value: 2, label: '2주택+' },
];

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
    setOwnedHomes,
    setIsLargeArea,
    setLtv,
    setTargetPriceMan,
    setInterimRate,
    setInterimTotalMonths,
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
    ownedHomes,
    isLargeArea,
    ltv,
    targetPriceMan,
    interimRate,
    interimTotalMonths,
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
      loanTermYears,
      ownedHomes,
      isLargeArea,
      interimRate,
      interimTotalMonths,
      ltv,
    );
  }, [annualIncome, assets, rate1st, rate2nd, rateFixed30, stressRate, loanTermYears, ownedHomes, isLargeArea, interimRate, interimTotalMonths, ltv]);

  const bestResult = useMemo(() => {
    return results.reduce((best, r) =>
      r.adjustedPrice > best.adjustedPrice ? r : best
    , results[0]);
  }, [results]);

  const maxSlider = Math.ceil(Math.max(...results.map(r => r.stressMaxPropertyPrice)) / 10000);
  const effectiveTargetMan = Math.min(targetPriceMan, maxSlider);
  const targetWon = effectiveTargetMan * 10000;

  const targetCosts = useMemo(() => {
    return calcAcquisitionCosts(targetWon, ownedHomes, isLargeArea, interimRate, interimTotalMonths);
  }, [targetWon, ownedHomes, isLargeArea, interimRate, interimTotalMonths]);

  const ltvLimitWon = targetWon * (ltv / 100);

  const simulations = useMemo(() => {
    return results.map((r) => {
      const totalNeeded = targetWon + targetCosts.total;
      const assetsWon = assets * 10000;
      const requiredLoan = Math.max(0, totalNeeded - assetsWon);
      const maxLoan = r.stressMaxLoanAmount;
      const ltvOver = requiredLoan > ltvLimitWon;
      const dsrOver = requiredLoan > maxLoan;
      const affordable = !ltvOver && !dsrOver;
      const monthly = requiredLoan > 0
        ? calcMonthlyPayment(requiredLoan, r.effectiveRate, r.label.includes('30년') ? 30 : loanTermYears)
        : 0;
      const loanMargin = maxLoan - requiredLoan;
      const ltvMargin = ltvLimitWon - requiredLoan;
      return { ...r, requiredLoan, affordable, monthly, loanMargin, ltvMargin, ltvOver, dsrOver, totalNeeded };
    });
  }, [results, targetWon, targetCosts, assets, loanTermYears, ltvLimitWon]);

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
              label="LTV"
              value={ltv}
              onChange={setLtv}
              suffix="%"
              min={0}
              max={100}
            />
            <InputField
              label="상환 기간"
              value={loanTermYears}
              onChange={setLoanTermYears}
              suffix="년"
              min={10}
              max={50}
            />
          </SidebarSection>

          <SidebarSection title="중도금 대출">
            <InputField label="중도금 금리" value={interimRate} onChange={setInterimRate} suffix="%" />
            <InputField label="이자 부담 합산 개월" value={interimTotalMonths} onChange={setInterimTotalMonths} suffix="개월" />
            <div className="interim-formula">
              <span className="interim-formula__label">산정식 <em>1~2회차 무이자 · 3~6회차 후불</em></span>
              <code className="interim-formula__expr">
                분양가×10% × <b>{interimRate}%</b> × <b>{interimTotalMonths}</b>월 ÷ 12
              </code>
            </div>
          </SidebarSection>

          <SidebarSection title="매매 조건">
            <div className="field">
              <span className="field__label">보유 주택 수</span>
              <div className="sidebar__segmented-wrap">
                <div className="segmented" role="group" aria-label="보유 주택 수">
                  {OWNED_HOMES_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`segmented__btn ${ownedHomes === opt.value ? 'segmented__btn--active' : ''}`}
                      onClick={() => setOwnedHomes(opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="field">
              <span className="field__label">전용면적</span>
              <div className="sidebar__segmented-wrap">
                <div className="segmented" role="group" aria-label="전용면적">
                  <button
                    type="button"
                    className={`segmented__btn ${!isLargeArea ? 'segmented__btn--active' : ''}`}
                    onClick={() => setIsLargeArea(false)}
                  >
                    85㎡ 이하
                  </button>
                  <button
                    type="button"
                    className={`segmented__btn ${isLargeArea ? 'segmented__btn--active' : ''}`}
                    onClick={() => setIsLargeArea(true)}
                  >
                    85㎡ 초과
                  </button>
                </div>
              </div>
            </div>
          </SidebarSection>
        </nav>
      </aside>

      <main className="content">
        <div className="content__inner">
          <section className="dashboard">
            <div className="dashboard__price-panel">
              <div className="dashboard__price-header">
                <p className="dashboard__eyebrow">매물 가격</p>
                <p className="dashboard__target-value">{formatKRW(targetWon)}</p>
              </div>
              <input
                type="range"
                className="dashboard__range"
                min={0}
                max={maxSlider}
                step={100}
                value={effectiveTargetMan}
                onChange={(e) => setTargetPriceMan(Number(e.target.value))}
              />
              <div className="dashboard__range-labels">
                <span>0</span>
                <span>{formatKRW(maxSlider * 10000)}</span>
              </div>

              <dl className="dashboard__kpis">
                <div className="dashboard__kpi dashboard__kpi--accent">
                  <dt>필요 총액</dt>
                  <dd>{formatKRW(targetWon + targetCosts.total)}</dd>
                </div>
                <div className="dashboard__kpi">
                  <dt>자기자본</dt>
                  <dd>{formatKRW(assets * 10000)}</dd>
                </div>
              </dl>
            </div>

            <div className="dashboard__cost-panel">
              <div className="dashboard__cost-header">
                <span className="dashboard__cost-label">부대비용</span>
                <span className="dashboard__cost-total">{formatKRW(targetCosts.total)}</span>
              </div>
              <ul className="dashboard__cost-list">
                <li><span>취득세</span><span>{formatKRW(targetCosts.acquisitionTax)}</span></li>
                <li><span>지방교육세</span><span>{formatKRW(targetCosts.localEducationTax)}</span></li>
                {targetCosts.ruralSpecialTax > 0 && (
                  <li><span>농어촌특별세</span><span>{formatKRW(targetCosts.ruralSpecialTax)}</span></li>
                )}
                <li><span>중개수수료</span><span>{formatKRW(targetCosts.brokerageFee)}</span></li>
                <li><span>기타 (법무사·인지세·채권)</span><span>{formatKRW(targetCosts.otherCosts)}</span></li>
                {targetCosts.interimInterest > 0 && (
                  <li className="dashboard__cost-item--highlight">
                    <span>중도금 이자 (후불)</span>
                    <span>{formatKRW(targetCosts.interimInterest)}</span>
                  </li>
                )}
              </ul>
            </div>
          </section>

          <section className="compare" aria-labelledby="compare-title">
            <h2 className="compare__title" id="compare-title">시나리오 비교</h2>

            <CompareTable
              results={results}
              best={bestResult}
              simulations={simulations}
              ltvLimitWon={ltvLimitWon}
              targetCosts={targetCosts}
              targetWon={targetWon}
            />
          </section>

          <footer className="content__footer">
            참고용 계산입니다. 실제 한도는 금융기관 심사 결과에 따라 달라질 수 있습니다.
            <br />
            취득세는 다주택 중과 기본 세율 기준이며, 정책 변경에 따라 달라질 수 있습니다.
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

interface Simulation {
  label: string;
  stressMaxLoanAmount: number;
  requiredLoan: number;
  affordable: boolean;
  monthly: number;
  loanMargin: number;
  ltvMargin: number;
  ltvOver: boolean;
  dsrOver: boolean;
}

interface CompareTableProps {
  results: LoanResult[];
  best: LoanResult;
  simulations: Simulation[];
  ltvLimitWon: number;
  targetCosts: ReturnType<typeof calcAcquisitionCosts>;
  targetWon: number;
}

function CompareTable({ results, best, simulations, ltvLimitWon, targetCosts, targetWon }: CompareTableProps) {
  return (
    <div className="compare__wrap">
      <table className="compare__table">
        <thead>
          <tr>
            <th className="compare__corner" scope="col" />
            {results.map((r, i) => {
              const sim = simulations[i];
              return (
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
                  <span className={`compare__col-status ${sim.affordable ? 'compare__col-status--ok' : 'compare__col-status--over'}`}>
                    {sim.affordable
                      ? '매입 가능'
                      : sim.ltvOver
                        ? `LTV 초과 (−${formatKRW(Math.abs(sim.ltvMargin))})`
                        : `DSR 초과 (−${formatKRW(Math.abs(sim.loanMargin))})`}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          <tr className="compare__row--section">
            <th scope="row" colSpan={results.length + 1}>한도</th>
          </tr>
          <tr className="compare__row--main">
            <th scope="row">실 매입 한도</th>
            {results.map((r, i) => (
              <td
                key={i}
                className={[
                  r === best ? 'compare__col--best' : '',
                  'compare__cell--main',
                ].filter(Boolean).join(' ')}
              >
                {formatKRW(r.adjustedPrice)}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row">대출 한도</th>
            {results.map((r, i) => (
              <td key={i} className={r === best ? 'compare__col--best' : ''}>
                {formatKRW(r.stressMaxLoanAmount)}
              </td>
            ))}
          </tr>
          <tr className="compare__row--section">
            <th scope="row" colSpan={results.length + 1}>매물 기준 ({formatKRW(targetWon)})</th>
          </tr>
          <tr>
            <th scope="row">필요 대출</th>
            {simulations.map((s, i) => (
              <td
                key={i}
                className={[
                  results[i] === best ? 'compare__col--best' : '',
                  s.ltvOver || s.dsrOver ? 'compare__cell--over' : '',
                ].filter(Boolean).join(' ')}
              >
                {formatKRW(s.requiredLoan)}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row">LTV 한도</th>
            {results.map((_, i) => (
              <td
                key={i}
                className={[
                  results[i] === best ? 'compare__col--best' : '',
                  simulations[i].ltvOver ? 'compare__cell--over' : '',
                ].filter(Boolean).join(' ')}
              >
                {formatKRW(ltvLimitWon)}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row">부대비용</th>
            {results.map((_, i) => (
              <td key={i} className={results[i] === best ? 'compare__col--best' : ''}>
                <span className="compare__cost-val">−{formatKRW(targetCosts.total)}</span>
              </td>
            ))}
          </tr>
          {targetCosts.interimInterest > 0 && (
            <tr className="compare__row--cost">
              <th scope="row">└ 중도금 이자</th>
              {results.map((_, i) => (
                <td key={i} className={results[i] === best ? 'compare__col--best' : ''}>
                  <span className="compare__cost-val">−{formatKRW(targetCosts.interimInterest)}</span>
                </td>
              ))}
            </tr>
          )}
          <tr>
            <th scope="row">월 상환액</th>
            {simulations.map((s, i) => (
              <td key={i} className={results[i] === best ? 'compare__col--best' : ''}>
                {formatKRW(s.monthly)}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row">대출 여유 (DSR)</th>
            {simulations.map((s, i) => (
              <td
                key={i}
                className={[
                  results[i] === best ? 'compare__col--best' : '',
                  s.dsrOver ? 'compare__cell--over' : 'compare__cell--margin',
                ].filter(Boolean).join(' ')}
              >
                {s.dsrOver ? `−${formatKRW(Math.abs(s.loanMargin))}` : formatKRW(s.loanMargin)}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row">대출 여유 (LTV)</th>
            {simulations.map((s, i) => (
              <td
                key={i}
                className={[
                  results[i] === best ? 'compare__col--best' : '',
                  s.ltvOver ? 'compare__cell--over' : 'compare__cell--margin',
                ].filter(Boolean).join(' ')}
              >
                {s.ltvOver ? `−${formatKRW(Math.abs(s.ltvMargin))}` : formatKRW(s.ltvMargin)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default App;
