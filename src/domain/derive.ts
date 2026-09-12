import { BUFFER_DAYS, PACK, RANGE_DAYS, RANGE_FROM_DAYS, VARIETIES } from './master'
import { DAY, H, MIN, NOW, T, dayDiff, dayOf } from './time'
import type { Derived, Lot, Order, PendingGroup, Stage, Variety } from './types'

export const RANGE_START = T(RANGE_FROM_DAYS)
export const RANGE_END = RANGE_START + RANGE_DAYS * DAY

/** 到達日数 = エチレン + 寝かせ + チェック1日 */
export const leadDays = (v: Variety): number => Math.ceil(v.ethHours / 24 + v.restDays) + 1

/** 開始推奨日 = 出荷日 − 到達日数 − 余裕。9時開始 */
export const recommendedStart = (o: Order): number =>
  dayOf(o.date) - (leadDays(VARIETIES[o.variety]) + BUFFER_DAYS) * DAY + 9 * H

export const liveLots = (lots: Lot[]): Lot[] => lots.filter((l) => !l.disposed)

export const ordersOf = (lot: Lot, orders: Order[]): Order[] =>
  orders.filter((o) => o.lots.includes(lot.id)).sort((a, b) => a.date - b.date)

/** ロットのうち注文が付いていない量 */
export const spareOf = (lot: Lot, orders: Order[]): number =>
  lot.qty - ordersOf(lot, orders).reduce((a, o) => a + o.qty, 0)

/** 未着手の注文を 品種×開始推奨日 でまとめる */
export function pendingGroups(orders: Order[]): PendingGroup[] {
  const g = new Map<string, PendingGroup>()
  for (const o of orders) {
    if (o.lots.length || o.kind === 'process') continue
    const start = recommendedStart(o)
    const key = `${o.variety}|${dayOf(start)}`
    let grp = g.get(key)
    if (!grp) {
      grp = { id: `P${o.variety}${new Date(start).getDate()}`, variety: o.variety, start, qty: 0, unit: o.unit, orders: [], ghost: true }
      g.set(key, grp)
    }
    grp.qty += o.qty
    grp.orders.push(o)
  }
  return [...g.values()].sort((a, b) => a.start - b.start)
}

type Derivable = Lot | PendingGroup
const isGroup = (x: Derivable): x is PendingGroup => 'ghost' in x && x.ghost === true

/** 開始日時と品種マスタから段階と各期限を導く */
export function derive(x: Derivable): Derived {
  const v = VARIETIES[x.variety]
  const ghost = isGroup(x)
  const lot = ghost ? null : x
  const ethEnd = lot?.ethRemovedAt ?? x.start + v.ethHours * H
  const restEnd = ethEnd + (v.restDays + (lot?.extraDays ?? 0)) * DAY
  const readyEnd = restEnd + v.windowDays * DAY
  const processEnd = readyEnd + v.processDays * DAY
  let stage: Stage
  if (ghost) stage = 'pending'
  else if (NOW < ethEnd) stage = 'eth'
  else if (NOW < restEnd) stage = 'rest'
  else if (lot?.checked !== 'ok') stage = 'check'
  else if (NOW < readyEnd) stage = 'ready'
  else if (NOW < processEnd) stage = 'process'
  else stage = 'expired'
  return {
    v, ghost, start: x.start, ethEnd, restEnd, readyEnd, processEnd, stage,
    daysLeft: Math.ceil((readyEnd - NOW) / DAY),
    processDaysLeft: Math.ceil((processEnd - NOW) / DAY),
  }
}

/** 出荷日が期限に収まらないときの警告文 */
export function shipWarning(o: Order, d: Derived): string | null {
  const short = dayDiff(d.restEnd, o.date)
  if (short > 0) return `出荷可能まで${short}日足りない`
  if (o.kind === 'process') {
    const over = dayDiff(o.date, d.processEnd)
    return over > 0 ? `加工期限を${over}日過ぎる` : null
  }
  const over = dayDiff(o.date, d.readyEnd)
  return over > 0 ? `生食期限を${over}日過ぎる` : null
}

export interface PackPlan { cups: number; minutes: number; start: number }
/** パック詰め: 量 → カップ数 → 作業時間(1人) → 就業時間内で出荷時刻から逆算した開始時刻 */
export function packPlan(o: Order): PackPlan | null {
  if (!o.pack || o.unit !== 'kg') return null
  const cups = Math.ceil((o.qty * 1000) / PACK.cupGrams)
  const minutes = Math.ceil((cups * PACK.minPerCup) / PACK.persons)
  let remain = minutes
  let cursor = o.date
  for (let guard = 0; guard < 30; guard++) {
    const d0 = dayOf(cursor)
    const ws = d0 + PACK.workStartH * H
    const we = d0 + PACK.workEndH * H
    const winEnd = Math.min(cursor, we)
    if (winEnd > ws) {
      const avail = (winEnd - ws) / MIN
      if (avail >= remain) return { cups, minutes, start: winEnd - remain * MIN }
      remain -= avail
    }
    cursor = d0 - DAY + PACK.workEndH * H
  }
  return null
}

export type SegStage = 'eth' | 'rest' | 'ready' | 'process' | 'expired'
export interface Segment { st: SegStage; from: number; to: number; label: string }

/** レーンに描く帯。注文があれば最後の出荷で終わり、無ければ加工期限の区切り(1日分の赤)で終わる */
export function segmentsOf(x: Derivable, d: Derived, orders: Order[], endOrder?: Order): Segment[] {
  const segs: Segment[] = []
  const extra = isGroup(x) ? 0 : x.extraDays
  segs.push({ st: 'eth', from: d.start, to: d.ethEnd, label: 'エチレン' })
  segs.push({ st: 'rest', from: d.ethEnd, to: d.restEnd, label: extra ? `寝かせ(+${extra}日)` : '寝かせ' })
  const last = endOrder ?? orders[orders.length - 1]
  let end = Math.min(RANGE_END, d.processEnd + DAY)
  if (last && dayDiff(last.date, d.restEnd) >= 0 && dayDiff(last.date, d.processEnd) <= 0) end = last.date
  else if (last && dayDiff(last.date, d.processEnd) > 0) end = Math.min(RANGE_END, last.date + 4 * H)
  segs.push({ st: 'ready', from: d.restEnd, to: Math.min(d.readyEnd, end), label: '出荷可能(生食)' })
  if (end > d.readyEnd) segs.push({ st: 'process', from: d.readyEnd, to: Math.min(d.processEnd, end), label: '加工に回せる' })
  if (end > d.processEnd) segs.push({ st: 'expired', from: d.processEnd, to: end, label: '期限切れ' })
  return segs.filter((s) => s.to > RANGE_START && s.from < RANGE_END)
}

/** 時刻 → 表示範囲内の横位置(%) */
export const xOf = (t: number): number =>
  Math.max(0, Math.min(100, ((t - RANGE_START) / (RANGE_DAYS * DAY)) * 100))
