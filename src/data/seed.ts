import { T } from '../domain/time'
import type { ColdStock, Lot, Order, State } from '../domain/types'

/**
 * ダミーデータ。日付は「今日」からの相対で作るので、開いた日に合わせて動く。
 * ?today=YYYY-MM-DD で固定できる。
 */
export function seed(): State {
  const orders: Order[] = [
    { id: 'S1', date: T(1, 9), client: '直売所', variety: 'hayward', qty: 30, unit: 'kg', pack: true, kind: 'fresh', lots: ['05'], shippedAt: null },
    { id: 'S2', date: T(1, 10), client: '道の駅', variety: 'gold', qty: 20, unit: 'kg', pack: false, kind: 'fresh', lots: ['07'], shippedAt: null },
    { id: 'S6', date: T(3, 10), client: 'レストランC', variety: 'hayward', qty: 10, unit: 'kg', pack: false, kind: 'fresh', lots: ['05'], shippedAt: null },
    { id: 'S3', date: T(10, 10), client: 'スーパーA', variety: 'benihi', qty: 40, unit: 'kg', pack: true, kind: 'fresh', lots: [], shippedAt: null },
    { id: 'S7', date: T(10, 14), client: 'リアン', variety: 'benihi', qty: 20, unit: 'kg', pack: false, kind: 'fresh', lots: [], shippedAt: null },
    { id: 'S4', date: T(12, 10), client: '直売イベント', variety: 'hayward', qty: 60, unit: 'kg', pack: false, kind: 'fresh', lots: ['12'], shippedAt: null },
    { id: 'S5', date: T(16, 10), client: 'スーパーB', variety: 'hayward', qty: 100, unit: 'kg', pack: true, kind: 'fresh', lots: [], shippedAt: null },
    // 加工向けの注文。生食期限を過ぎたロットを充てられる。ロットは人が選ぶ
    { id: 'K1', date: T(2, 15), client: '向山製作所(加工)', variety: 'hayward', qty: 20, unit: 'kg', pack: false, kind: 'process', lots: [], shippedAt: null },
  ]
  const lots: Lot[] = [
    // 生食期限は昨日で過ぎた。加工期限まで4日。注文なし → 加工注文 K1 に充てられる
    { id: '03', variety: 'hayward', grade: 'L', qty: 20, unit: 'kg', place: '事務所', start: T(-15, 9), checked: 'ok', extraDays: 0, ethRemovedAt: null, disposed: null },
    { id: '05', variety: 'hayward', grade: 'L', qty: 40, unit: 'kg', place: '事務所', start: T(-10, 9), checked: 'ok', extraDays: 0, ethRemovedAt: null, disposed: null },
    { id: '07', variety: 'gold', grade: 'M', qty: 20, unit: 'kg', place: '事務所', start: T(-11, 9), checked: 'ok', extraDays: 0, ethRemovedAt: null, disposed: null },
    // 注文なし(予備)
    { id: '08', variety: 'hayward', grade: 'L', qty: 40, unit: 'kg', place: '作業場', start: T(-7, 6), checked: null, extraDays: 0, ethRemovedAt: null, disposed: null },
    { id: '12', variety: 'hayward', grade: 'M', qty: 60, unit: 'kg', place: '作業場', start: T(-2, 9), checked: null, extraDays: 0, ethRemovedAt: null, disposed: null },
    // 注文なし(予備)。パック単位で入れたロット
    { id: '15', variety: 'benihi', grade: 'L', qty: 30, unit: 'pack', place: '阿部家', start: T(-1, 16), checked: null, extraDays: 0, ethRemovedAt: null, disposed: null },
  ]
  const cold: ColdStock[] = [
    { id: 'C1', variety: 'benihi', grade: 'L', qty: 60, unit: 'kg', since: T(-20) },
    { id: 'C2', variety: 'hayward', grade: 'L', qty: 140, unit: 'kg', since: T(-25) },
    { id: 'C3', variety: 'hayward', grade: 'M', qty: 40, unit: 'kg', since: T(-12) },
    { id: 'C4', variety: 'gold', grade: 'M', qty: 30, unit: 'kg', since: T(-18) },
  ]
  return { lots, orders, cold, done: {} }
}
