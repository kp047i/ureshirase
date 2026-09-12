export type VarietyId = 'hayward' | 'benihi' | 'gold'
export type Unit = 'kg' | 'pack' | 'box'
export type OrderKind = 'fresh' | 'process'
export type Disposed = 'waste' | 'process'

/** 品種マスタ。ステータスはここから導出する(保存しない) */
export interface Variety {
  id: VarietyId
  name: string
  color: string
  ethTemp: number
  ethHours: number
  restDays: number
  /** 寝かせ終了から生食で出荷できる日数 */
  windowDays: number
  /** 生食期限を過ぎてから加工に回せる日数 */
  processDays: number
}

/** 追熟ロット。開始日時だけ持ち、段階は時間から導出する */
export interface Lot {
  id: string
  variety: VarietyId
  grade: string
  qty: number
  unit: Unit
  place: string
  /** 追熟開始(ms) */
  start: number
  checked: 'ok' | null
  extraDays: number
  ethRemovedAt: number | null
  disposed: Disposed | null
}

/** 注文(出荷予定)。lots が空なら「まだロットになっていない」= 未着手 */
export interface Order {
  id: string
  /** 出荷日時(ms) */
  date: number
  client: string
  variety: VarietyId
  qty: number
  unit: Unit
  pack: boolean
  kind: OrderKind
  lots: string[]
  shippedAt: number | null
}

/** 冷蔵在庫(まだ追熟していない)。タイムラインには載せない */
export interface ColdStock {
  id: string
  variety: VarietyId
  grade: string
  qty: number
  unit: Unit
  since: number
}

export type Stage = 'pending' | 'eth' | 'rest' | 'check' | 'ready' | 'process' | 'expired'

export interface Derived {
  v: Variety
  ghost: boolean
  start: number
  ethEnd: number
  restEnd: number
  /** 生食期限 */
  readyEnd: number
  /** 加工期限 */
  processEnd: number
  stage: Stage
  /** 生食期限までの残り日数 */
  daysLeft: number
  /** 加工期限までの残り日数 */
  processDaysLeft: number
}

/** 未着手の注文を 品種×開始推奨日 でまとめたもの = これから起こすロット */
export interface PendingGroup {
  id: string
  variety: VarietyId
  start: number
  qty: number
  unit: Unit
  orders: Order[]
  ghost: true
}

export interface State {
  lots: Lot[]
  orders: Order[]
  cold: ColdStock[]
  /** 完了した作業のログ。key → 表示文 */
  done: Record<string, string>
}
