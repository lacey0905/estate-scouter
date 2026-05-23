export type OwnedHomes = 0 | 1 | 2;

export interface AcquisitionCostBreakdown {
  acquisitionTax: number;
  localEducationTax: number;
  ruralSpecialTax: number;
  brokerageFee: number;
  otherCosts: number;
  total: number;
}

/**
 * 취득세율 (1세대 기준)
 * - 무주택(취득 후 1주택): 6억이하 1%, 6~9억 비례(1~3%), 9억초과 3%
 * - 1주택 보유(취득 후 2주택): 8%
 * - 2주택+ 보유(취득 후 3주택+): 12%
 */
function getAcquisitionTaxRate(price: number, ownedHomes: OwnedHomes): number {
  const totalHomes = ownedHomes + 1;
  if (totalHomes >= 3) return 0.12;
  if (totalHomes >= 2) return 0.08;

  const priceInEok = price / 1_0000_0000;
  if (priceInEok <= 6) return 0.01;
  if (priceInEok <= 9) return (priceInEok * 2 / 3 - 3) / 100;
  return 0.03;
}

/**
 * 중개수수료율 (2021년 개편 기준, 매매)
 */
function getBrokerageRate(price: number): number {
  const man = price / 10000;
  if (man < 5000) return 0.006;
  if (man < 20000) return 0.005;
  if (man < 60000) return 0.004;
  if (man < 90000) return 0.005;
  if (man < 120000) return 0.005;
  if (man < 150000) return 0.006;
  return 0.007;
}

/**
 * 중개수수료 상한 (5천만원 미만, 2억 미만만 상한 적용)
 */
function getBrokerageFee(price: number): number {
  const man = price / 10000;
  const rate = getBrokerageRate(price);
  const fee = price * rate;
  if (man < 5000) return Math.min(fee, 250000);
  if (man < 20000) return Math.min(fee, 800000);
  return fee;
}

export function calcAcquisitionCosts(
  price: number,
  ownedHomes: OwnedHomes,
  isLargeArea: boolean,
): AcquisitionCostBreakdown {
  if (price <= 0) {
    return { acquisitionTax: 0, localEducationTax: 0, ruralSpecialTax: 0, brokerageFee: 0, otherCosts: 0, total: 0 };
  }

  const taxRate = getAcquisitionTaxRate(price, ownedHomes);
  const acquisitionTax = Math.floor(price * taxRate);
  const localEducationTax = Math.floor(acquisitionTax * 0.1);
  const ruralSpecialTax = isLargeArea ? Math.floor(price * 0.002) : 0;

  const brokerageFee = Math.floor(getBrokerageFee(price));

  // 법무사(~50만) + 인지세(~15만) + 국민주택채권 할인(~0.1%) + 기타
  const bondDiscount = Math.floor(price * 0.001);
  const otherCosts = 500000 + 150000 + bondDiscount;

  const total = acquisitionTax + localEducationTax + ruralSpecialTax + brokerageFee + otherCosts;

  return { acquisitionTax, localEducationTax, ruralSpecialTax, brokerageFee, otherCosts, total };
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
): { adjustedPrice: number; costs: AcquisitionCostBreakdown } {
  if (totalBudget <= 0) {
    const zeroCosts = calcAcquisitionCosts(0, ownedHomes, isLargeArea);
    return { adjustedPrice: 0, costs: zeroCosts };
  }

  let price = totalBudget;
  let costs = calcAcquisitionCosts(price, ownedHomes, isLargeArea);

  for (let i = 0; i < 20; i++) {
    const newPrice = totalBudget - costs.total;
    if (Math.abs(newPrice - price) < 100) {
      price = newPrice;
      costs = calcAcquisitionCosts(price, ownedHomes, isLargeArea);
      break;
    }
    price = newPrice;
    costs = calcAcquisitionCosts(price, ownedHomes, isLargeArea);
  }

  return { adjustedPrice: Math.max(0, Math.floor(price)), costs };
}
