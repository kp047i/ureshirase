import type { Unit, Variety, VarietyId } from './types'

export const VARIETIES: Record<VarietyId, Variety> = {
  hayward: { id: 'hayward', name: 'ヘイワード', color: 'var(--v-hayward)', ethTemp: 15, ethHours: 48, restDays: 5, windowDays: 7, processDays: 5 },
  benihi: { id: 'benihi', name: '紅妃', color: 'var(--v-benihi)', ethTemp: 15, ethHours: 36, restDays: 4, windowDays: 7, processDays: 5 },
  gold: { id: 'gold', name: '東京ゴールド', color: 'var(--v-gold)', ethTemp: 18, ethHours: 48, restDays: 4, windowDays: 7, processDays: 5 },
}
export const VARIETY_IDS = Object.keys(VARIETIES) as VarietyId[]

/** 出荷日が出荷可能期間の中盤に来るための余裕(日) */
export const BUFFER_DAYS = 3

/** パック詰めの前提値 */
export const PACK = { cupGrams: 500, minPerCup: 1.5, persons: 1, workStartH: 8, workEndH: 17 }

/** タイムラインの表示範囲(今日の3日前から15日後) */
export const RANGE_DAYS = 18
export const RANGE_FROM_DAYS = -3

export const UNIT_LABEL: Record<Unit, string> = { kg: 'kg', pack: 'パック', box: '箱' }
export const qtyText = (qty: number, unit: Unit): string => `${qty.toLocaleString()}${UNIT_LABEL[unit]}`
