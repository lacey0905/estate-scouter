export type OwnedHomes = 0 | 1 | 2;

/** 중개수수료 (고정) */
export const BROKERAGE_FEE = 1_860_000;

/** 중도금 이자 후불 (고정, 약 1,430만) */
export const INTERIM_INTEREST_FIXED = 14_300_000;

/** 법무사·인지세·채권 (고정) */
export const OTHER_COSTS_FIXED = 1_350_000;

/** 취득세·부가세 (생애최초 감면 반영, 고정) */
export const ACQUISITION_TAX_BEFORE_REDUCTION = 12_371_400;
export const LIFETIME_FIRST_REDUCTION = 2_000_000;
export const ACQUISITION_TAX_AFTER_REDUCTION = 10_371_400;
export const LOCAL_EDUCATION_TAX_FIXED = 1_037_140;
export const RURAL_SPECIAL_TAX_FIXED = 0;

export interface AcquisitionCostBreakdown {
  acquisitionTaxBeforeReduction: number;
  lifetimeFirstReduction: number;
  acquisitionTax: number;
  localEducationTax: number;
  ruralSpecialTax: number;
  brokerageFee: number;
  otherCosts: number;
  interimInterest: number;
  total: number;
}

const ZERO_COSTS: AcquisitionCostBreakdown = {
  acquisitionTaxBeforeReduction: 0,
  lifetimeFirstReduction: 0,
  acquisitionTax: 0,
  localEducationTax: 0,
  ruralSpecialTax: 0,
  brokerageFee: 0,
  otherCosts: 0,
  interimInterest: 0,
  total: 0,
};

export function calcAcquisitionCosts(
  price: number,
  _ownedHomes: OwnedHomes,
  _isLargeArea: boolean,
  _interimRate = 0,
  _interimTotalMonths = 0,
): AcquisitionCostBreakdown {
  if (price <= 0) {
    return { ...ZERO_COSTS };
  }

  const acquisitionTaxBeforeReduction = ACQUISITION_TAX_BEFORE_REDUCTION;
  const lifetimeFirstReduction = LIFETIME_FIRST_REDUCTION;
  const acquisitionTax = ACQUISITION_TAX_AFTER_REDUCTION;
  const localEducationTax = LOCAL_EDUCATION_TAX_FIXED;
  const ruralSpecialTax = RURAL_SPECIAL_TAX_FIXED;

  const brokerageFee = BROKERAGE_FEE;

  const otherCosts = OTHER_COSTS_FIXED;

  const interimInterest = INTERIM_INTEREST_FIXED;

  const total =
    acquisitionTax +
    localEducationTax +
    ruralSpecialTax +
    brokerageFee +
    otherCosts +
    interimInterest;

  return {
    acquisitionTaxBeforeReduction,
    lifetimeFirstReduction,
    acquisitionTax,
    localEducationTax,
    ruralSpecialTax,
    brokerageFee,
    otherCosts,
    interimInterest,
    total,
  };
}

/**
 * 부대비용을 고려한 실 매입 가능 금액 역산
 * totalBudget = loan + assets
 * propertyPrice + costs(propertyPrice) <= totalBudget
 */
export function calcAdjustedPropertyPrice(
  totalBudget: number,
  ownedHomes: OwnedHomes,
  isLargeArea: boolean,
  interimRate = 0,
  interimTotalMonths = 0,
): { adjustedPrice: number; costs: AcquisitionCostBreakdown } {
  if (totalBudget <= 0) {
    const zeroCosts = calcAcquisitionCosts(0, ownedHomes, isLargeArea, interimRate, interimTotalMonths);
    return { adjustedPrice: 0, costs: zeroCosts };
  }

  let price = totalBudget;
  let costs = calcAcquisitionCosts(price, ownedHomes, isLargeArea, interimRate, interimTotalMonths);

  for (let i = 0; i < 20; i++) {
    const newPrice = totalBudget - costs.total;
    if (Math.abs(newPrice - price) < 100) {
      price = newPrice;
      costs = calcAcquisitionCosts(price, ownedHomes, isLargeArea, interimRate, interimTotalMonths);
      break;
    }
    price = newPrice;
    costs = calcAcquisitionCosts(price, ownedHomes, isLargeArea, interimRate, interimTotalMonths);
  }

  return { adjustedPrice: Math.max(0, Math.floor(price)), costs };
}
