import { useState, useMemo, useEffect, type ReactNode } from 'react';
import { runAllScenarios, calcMonthlyPayment, formatKRW, formatKRWWon, type LoanResult } from './utils/calculator';
import { useAppSettings } from './hooks/useAppSettings';
import {
  LOAN_RATE_TYPES,
  calcStressRate,
  getStressRatio,
  type LoanRateType,
} from './utils/stressDsr';
import { type OwnedHomes, calcAcquisitionCosts } from './utils/acquisitionCost';
import {
  ACTUAL_INITIAL_CASH_WON,
  AIR_CONDITIONER_COST_WON,
  BALCONY_EXTENSION_COST_WON,
  BUILDER_RECOGNIZED_PAYMENT_WON,
  PROPERTY_CONTRACT_PRICE_WON,
  PROPERTY_LIST_PRICE_WON,
  PROPERTY_LTV_BASE_PRICE_WON,
  PROPERTY_PREMIUM_WON,
  REMAINING_PROPERTY_BALANCE_WON,
  TARGET_PROPERTY_PRICE_WON,
} from './utils/property';
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
    setAppraisalRate,
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
    appraisalRate,
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
      appraisalRate,
    );
  }, [annualIncome, assets, rate1st, rate2nd, rateFixed30, stressRate, loanTermYears, ownedHomes, isLargeArea, interimRate, interimTotalMonths, ltv, appraisalRate]);

  const bestResult = useMemo(() => {
    return results.reduce((best, r) =>
      r.adjustedPrice > best.adjustedPrice ? r : best
    , results[0]);
  }, [results]);

  const targetWon = TARGET_PROPERTY_PRICE_WON;
  const ltvBaseWon = PROPERTY_LTV_BASE_PRICE_WON;
  const remainingBalanceWon = REMAINING_PROPERTY_BALANCE_WON;

  const targetCosts = useMemo(() => {
    return calcAcquisitionCosts(targetWon, ownedHomes, isLargeArea, interimRate, interimTotalMonths);
  }, [targetWon, ownedHomes, isLargeArea, interimRate, interimTotalMonths]);

  const ltvLimitWon = ltvBaseWon * (appraisalRate / 100) * (ltv / 100);

  const simulations = useMemo(() => {
    return results.map((r) => {
      const totalNeeded = remainingBalanceWon + targetCosts.total;
      const assetsWon = assets * 10000;
      const rawLoan = Math.max(0, totalNeeded - assetsWon);
      const maxLoan = r.dsrStressMaxLoanAmount;
      const loanCap = Math.min(maxLoan, ltvLimitWon);
      const actualLoan = Math.min(rawLoan, loanCap);
      const shortfall = Math.max(0, rawLoan - loanCap);
      const affordable = shortfall === 0;
      const termYears = r.label.includes('30년') ? 30 : loanTermYears;
      const monthly = actualLoan > 0
        ? calcMonthlyPayment(actualLoan, r.interestRate, termYears)
        : 0;
      const margin = Math.max(0, loanCap - actualLoan);
      return { ...r, assetsWon, requiredLoan: rawLoan, actualLoan, loanCap, shortfall, affordable, monthly, margin, totalNeeded };
    });
  }, [results, remainingBalanceWon, targetCosts, assets, loanTermYears, ltvLimitWon]);

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
            <div className="field-range">
              <div className="field-range__header">
                <span className="field-range__label">잔여 자산</span>
                <span className="field-range__value">{formatKRW(assets * 10000)}</span>
              </div>
              <div className="field-range__row">
                <button
                  type="button"
                  className="field-range__btn"
                  onClick={() => setAssets(Math.max(0, assets - 100))}
                  aria-label="100만원 감소"
                >−</button>
                <input
                  type="range"
                  className="field-range__slider"
                  min={0}
                  max={100000}
                  step={100}
                  value={assets}
                  onChange={(e) => setAssets(Number(e.target.value))}
                />
                <button
                  type="button"
                  className="field-range__btn"
                  onClick={() => setAssets(Math.min(100000, assets + 100))}
                  aria-label="100만원 증가"
                >+</button>
              </div>
              <div className="field-range__labels">
                <span>0</span>
                <span>10억</span>
              </div>
            </div>
            <InputField label="잔여 자산 직접 입력" value={assets} onChange={setAssets} suffix="만원" />
            <p className="sidebar__hint">
              실제 초기 투입 {formatKRWWon(ACTUAL_INITIAL_CASH_WON)}은 이미 낸 돈으로 보고, 여기에는 앞으로 쓸 수 있는 잔여 현금을 입력합니다.
            </p>
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
              label="감정가율"
              value={appraisalRate}
              onChange={setAppraisalRate}
              suffix="%"
              min={100}
              max={200}
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
          <section className="dashboard" aria-label="매물 및 부대비용">
            <header className="dashboard__summary">
              <div className="dashboard__property">
                <p className="dashboard__eyebrow">매물 가격</p>
                <p className="dashboard__target-value">{formatKRW(targetWon)}</p>
                <span className="dashboard__badge">실거래 기준</span>
                <dl className="dashboard__property-breakdown">
                  <div className="dashboard__property-row">
                    <dt>분양가</dt>
                    <dd>{formatKRW(PROPERTY_LIST_PRICE_WON)}</dd>
                  </div>
                  <div className="dashboard__property-row">
                    <dt>확장비</dt>
                    <dd>{formatKRWWon(BALCONY_EXTENSION_COST_WON)}</dd>
                  </div>
                  <div className="dashboard__property-row">
                    <dt>에어컨</dt>
                    <dd>{formatKRWWon(AIR_CONDITIONER_COST_WON)}</dd>
                  </div>
                  <div className="dashboard__property-row">
                    <dt>건설사 계약 총액</dt>
                    <dd>{formatKRW(PROPERTY_CONTRACT_PRICE_WON)}</dd>
                  </div>
                  <div className="dashboard__property-row dashboard__property-row--premium">
                    <dt>프리미엄</dt>
                    <dd>{formatKRWWon(PROPERTY_PREMIUM_WON)}</dd>
                  </div>
                  <div className="dashboard__property-row">
                    <dt>건설사 납부 인정</dt>
                    <dd>{formatKRWWon(BUILDER_RECOGNIZED_PAYMENT_WON)}</dd>
                  </div>
                  <div className="dashboard__property-row dashboard__property-row--cash">
                    <dt>실제 초기 투입</dt>
                    <dd>{formatKRWWon(ACTUAL_INITIAL_CASH_WON)}</dd>
                  </div>
                  <div className="dashboard__property-row">
                    <dt>남은 잔금</dt>
                    <dd>{formatKRWWon(remainingBalanceWon)}</dd>
                  </div>
                </dl>
              </div>
              <dl className="dashboard__metrics">
                <div className="dashboard__metric dashboard__metric--accent">
                  <dt>앞으로 필요</dt>
                  <dd>{formatKRW(remainingBalanceWon + targetCosts.total)}</dd>
                  <dd className="dashboard__metric-sub">남은 잔금 + 부대비용</dd>
                </div>
                <div className="dashboard__metric">
                  <dt>잔여 자산</dt>
                  <dd>{formatKRW(assets * 10000)}</dd>
                  <dd className="dashboard__metric-sub">초기 투입 후 남은 현금</dd>
                </div>
                <div className="dashboard__metric">
                  <dt>LTV 기준가</dt>
                  <dd>{formatKRW(ltvBaseWon)}</dd>
                  <dd className="dashboard__metric-sub">마피 반영 전</dd>
                </div>
                <div className="dashboard__metric dashboard__metric--cost">
                  <dt>부대비용</dt>
                  <dd>{formatKRWWon(targetCosts.total)}</dd>
                </div>
              </dl>
            </header>

            <div className="dashboard__costs">
              <h3 className="dashboard__costs-title">부대비용 내역</h3>
              <div className="dashboard__costs-grid">
                <div className="dashboard__cost-tax" role="group" aria-label="취득세">
                  <p className="dashboard__cost-tax-label">취득세</p>
                  <div className="dashboard__cost-tax-box">
                    <div className="dashboard__cost-tax-line">
                      <span>산출</span>
                      <span>{formatKRWWon(targetCosts.acquisitionTaxBeforeReduction)}</span>
                    </div>
                    <div className="dashboard__cost-tax-line dashboard__cost-tax-line--deduct">
                      <span>생애최초 감면</span>
                      <span>−{formatKRWWon(targetCosts.lifetimeFirstReduction)}</span>
                    </div>
                    <div className="dashboard__cost-tax-result">
                      <span>납부</span>
                      <span>{formatKRWWon(targetCosts.acquisitionTax)}</span>
                    </div>
                  </div>
                </div>
                <ul className="dashboard__cost-list">
                  <li><span>지방교육세</span><span>{formatKRWWon(targetCosts.localEducationTax)}</span></li>
                  {targetCosts.ruralSpecialTax > 0 && (
                    <li><span>농어촌특별세</span><span>{formatKRWWon(targetCosts.ruralSpecialTax)}</span></li>
                  )}
                  <li><span>중개수수료</span><span>{formatKRWWon(targetCosts.brokerageFee)}</span></li>
                  <li><span>기타</span><span>{formatKRWWon(targetCosts.otherCosts)}</span></li>
                  <li className="dashboard__cost-item--highlight">
                    <span>중도금 이자</span><span>{formatKRWWon(targetCosts.interimInterest)}</span>
                  </li>
                </ul>
              </div>
              <p className="dashboard__cost-note">
                합계는 납부 취득세·지방교육세·수수료·기타·중도금 이자 5항목입니다. 산출·감면은 참고용입니다.
              </p>
            </div>
          </section>

          <section className="compare" aria-labelledby="compare-title">
            <h2 className="compare__title" id="compare-title">시나리오 비교</h2>

            <CompareTable
              results={results}
              best={bestResult}
              simulations={simulations}
              targetCosts={targetCosts}
              ltvBaseWon={ltvBaseWon}
            />
          </section>

          <footer className="content__footer">
            참고용 계산입니다. 실제 한도는 금융기관 심사 결과에 따라 달라질 수 있습니다.
            <br />
            취득세·지방교육세는 생애최초 감면 반영 실납부액(고정값) 기준입니다.
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
  assetsWon: number;
  totalNeeded: number;
  requiredLoan: number;
  actualLoan: number;
  loanCap: number;
  shortfall: number;
  affordable: boolean;
  monthly: number;
  margin: number;
}

interface CompareTableProps {
  results: LoanResult[];
  best: LoanResult;
  simulations: Simulation[];
  targetCosts: ReturnType<typeof calcAcquisitionCosts>;
  ltvBaseWon: number;
}

function CompareTable({ results, best, simulations, targetCosts, ltvBaseWon }: CompareTableProps) {
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
                      : `잔여 자산 부족 (${formatKRW(sim.shortfall)})`}
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
            <th scope="row">대출 한도</th>
            {simulations.map((s, i) => (
              <td
                key={i}
                className={[
                  results[i] === best ? 'compare__col--best' : '',
                  'compare__cell--main',
                ].filter(Boolean).join(' ')}
              >
                {formatKRW(s.loanCap)}
              </td>
            ))}
          </tr>
          <tr className="compare__row--section">
            <th scope="row" colSpan={results.length + 1}>
              남은 잔금 기준 ({formatKRW(REMAINING_PROPERTY_BALANCE_WON)}) · LTV 기준 ({formatKRW(ltvBaseWon)})
            </th>
          </tr>
          <tr>
            <th scope="row">남은 잔금</th>
            {simulations.map((_, i) => (
              <td key={i} className={results[i] === best ? 'compare__col--best' : ''}>
                {formatKRW(REMAINING_PROPERTY_BALANCE_WON)}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row">부대비용</th>
            {results.map((_, i) => (
              <td key={i} className={results[i] === best ? 'compare__col--best' : ''}>
                <span className="compare__add-val">+{formatKRW(targetCosts.total)}</span>
              </td>
            ))}
          </tr>
          {targetCosts.interimInterest > 0 && (
            <tr className="compare__row--cost">
              <th scope="row">└ 중도금 이자</th>
              {results.map((_, i) => (
                <td key={i} className={results[i] === best ? 'compare__col--best' : ''}>
                  <span className="compare__muted-val">포함 {formatKRW(targetCosts.interimInterest)}</span>
                </td>
              ))}
            </tr>
          )}
          <tr>
            <th scope="row">총 필요액</th>
            {simulations.map((s, i) => (
              <td
                key={i}
                className={results[i] === best ? 'compare__col--best' : ''}
              >
                {formatKRW(s.totalNeeded)}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row">잔여 자산 차감</th>
            {simulations.map((s, i) => (
              <td key={i} className={results[i] === best ? 'compare__col--best' : ''}>
                <span className="compare__deduct-val">−{formatKRW(s.assetsWon)}</span>
              </td>
            ))}
          </tr>
          <tr className="compare__row--main">
            <th scope="row">필요 대출액</th>
            {simulations.map((s, i) => (
              <td
                key={i}
                className={[
                  results[i] === best ? 'compare__col--best' : '',
                  'compare__cell--main',
                ].filter(Boolean).join(' ')}
              >
                {formatKRW(s.requiredLoan)}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row">대출 실행액</th>
            {simulations.map((s, i) => (
              <td
                key={i}
                className={results[i] === best ? 'compare__col--best' : ''}
              >
                {formatKRW(s.actualLoan)}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row">월 상환액</th>
            {simulations.map((s, i) => (
              <td key={i} className={results[i] === best ? 'compare__col--best' : ''}>
                {formatKRW(s.monthly)}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row">대출 여유</th>
            {simulations.map((s, i) => (
              <td
                key={i}
                className={[
                  results[i] === best ? 'compare__col--best' : '',
                  s.margin > 0 ? 'compare__cell--margin' : '',
                ].filter(Boolean).join(' ')}
              >
                {formatKRW(s.margin)}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row">잔여 자산 부족</th>
            {simulations.map((s, i) => (
              <td
                key={i}
                className={[
                  results[i] === best ? 'compare__col--best' : '',
                  s.shortfall > 0 ? 'compare__cell--over' : '',
                ].filter(Boolean).join(' ')}
              >
                {s.shortfall > 0 ? formatKRW(s.shortfall) : '−'}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default App;
