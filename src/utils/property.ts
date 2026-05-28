/** 분양가: 7억 300만원 */
export const PROPERTY_LIST_PRICE_WON = 703_000_000;

/** 발코니 확장비 */
export const BALCONY_EXTENSION_COST_WON = 16_200_000;

/** 에어컨 옵션비 */
export const AIR_CONDITIONER_COST_WON = 8_000_000;

/** 확장/옵션 총액 */
export const PROPERTY_OPTION_COSTS_WON = BALCONY_EXTENSION_COST_WON + AIR_CONDITIONER_COST_WON;

/** 건설사 계약 총액 = 분양가 + 확장/옵션 */
export const PROPERTY_CONTRACT_PRICE_WON = PROPERTY_LIST_PRICE_WON + PROPERTY_OPTION_COSTS_WON;

/** 프리미엄 (만원, 음수 = 할인) */
export const PROPERTY_PREMIUM_MAN = -3000;

export const PROPERTY_PREMIUM_WON = PROPERTY_PREMIUM_MAN * 10_000;

/** 실제 총 매입가 = 건설사 계약 총액 + 프리미엄 */
export const TARGET_PROPERTY_PRICE_WON = PROPERTY_CONTRACT_PRICE_WON + PROPERTY_PREMIUM_WON;

/** LTV 기준가는 마피/확장/옵션 반영 전 원분양가 */
export const PROPERTY_LTV_BASE_PRICE_WON = PROPERTY_LIST_PRICE_WON;

/** 건설사 납부 인정액: 분양/발코니/옵션 계약금 10% 합계 */
export const BUILDER_RECOGNIZED_PAYMENT_WON = 72_720_000;

/** 실제 초기 투입금 = 건설사 납부 인정액 + 프리미엄 */
export const ACTUAL_INITIAL_CASH_WON = BUILDER_RECOGNIZED_PAYMENT_WON + PROPERTY_PREMIUM_WON;

/** 앞으로 조달해야 할 남은 분양/옵션 잔금 = 건설사 계약 총액 - 건설사 납부 인정액 */
export const REMAINING_PROPERTY_BALANCE_WON = PROPERTY_CONTRACT_PRICE_WON - BUILDER_RECOGNIZED_PAYMENT_WON;
