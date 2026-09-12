import { useCallback, useEffect, useMemo, useState } from 'react'
import { seed } from '../data/seed'
import { NOW } from './time'
import type { ColdStock, Disposed, Lot, Order, PendingGroup, State } from './types'
import { VARIETIES } from './master'
import { hm } from './time'

const KEY = 'ureshirase.state.v1'

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = JSON.parse(raw) as State
      if (Array.isArray(s.lots) && Array.isArray(s.orders) && Array.isArray(s.cold)) return s
    }
  } catch {
    /* 保存が読めなければ初期データから */
  }
  return seed()
}
function save(s: State) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* 保存できない環境では何もしない */
  }
}

const nextLotId = (lots: Lot[]): string => {
  let n = 20
  while (lots.some((l) => l.id === String(n))) n++
  return String(n)
}

/** 画面の状態と、人が触る操作。状態遷移は時間から導くので、ここにあるのは「例外」と「作業した記録」だけ */
export function useStore() {
  const [state, setState] = useState<State>(load)
  useEffect(() => save(state), [state])

  const update = useCallback((fn: (s: State) => State) => setState((s) => fn(s)), [])
  const finish = (s: State, key: string, msg: string): State => ({ ...s, done: { ...s.done, [key]: msg } })
  const patchLot = (s: State, id: string, p: Partial<Lot>): State => ({ ...s, lots: s.lots.map((l) => (l.id === id ? { ...l, ...p } : l)) })
  const patchOrder = (s: State, id: string, p: Partial<Order>): State => ({ ...s, orders: s.orders.map((o) => (o.id === id ? { ...o, ...p } : o)) })

  const actions = useMemo(
    () => ({
      /** 未着手の注文グループを追熟開始にする。冷蔵在庫から引く */
      startGroup: (g: PendingGroup) =>
        update((s) => {
          const id = nextLotId(s.lots)
          const coldIdx = (() => {
            const i = s.cold.findIndex((c) => c.variety === g.variety && c.qty >= g.qty)
            return i >= 0 ? i : s.cold.findIndex((c) => c.variety === g.variety)
          })()
          const cold: ColdStock | undefined = coldIdx >= 0 ? s.cold[coldIdx] : undefined
          const lot: Lot = { id, variety: g.variety, grade: cold?.grade ?? '-', qty: g.qty, unit: g.unit, place: '作業場', start: NOW, checked: null, extraDays: 0, ethRemovedAt: null, disposed: null }
          const ids = new Set(g.orders.map((o) => o.id))
          let n: State = {
            ...s,
            lots: [...s.lots, lot],
            orders: s.orders.map((o) => (ids.has(o.id) ? { ...o, lots: [...o.lots, id] } : o)),
            cold: s.cold.map((c, i) => (i === coldIdx ? { ...c, qty: Math.max(0, c.qty - g.qty) } : c)),
          }
          n = finish(n, `start-${g.id}`, `${hm(NOW)} ${VARIETIES[g.variety].name} ${g.qty}${g.unit === 'kg' ? 'kg' : ''} を追熟開始(#${id})`)
          return n
        }),
      ethRemoved: (lot: Lot) => update((s) => finish(patchLot(s, lot.id, { ethRemovedAt: NOW }), `eth-${lot.id}`, `${hm(NOW)} #${lot.id} エチレンを抜いた`)),
      checkOk: (lot: Lot) => update((s) => finish(patchLot(s, lot.id, { checked: 'ok' }), `check-${lot.id}`, `#${lot.id} 出荷可能になった`)),
      extendOneDay: (lot: Lot) => update((s) => finish(patchLot(s, lot.id, { extraDays: lot.extraDays + 1 }), `check-${lot.id}`, `#${lot.id} 1日延長。明日もう一度`)),
      dispose: (lot: Lot, how: Disposed, spare: number) =>
        update((s) => finish(patchLot(s, lot.id, { disposed: how }), `exp-${lot.id}`, how === 'waste' ? `#${lot.id} ${spare}${lot.unit === 'kg' ? 'kg' : ''} を廃棄` : `#${lot.id} ${spare}${lot.unit === 'kg' ? 'kg' : ''} を加工に回した`)),
      /** 加工向け注文にロットを充てる(人が選ぶ) */
      assignToOrder: (lot: Lot, order: Order) =>
        update((s) => finish(patchOrder(s, order.id, { lots: [...order.lots, lot.id] }), `exp-${lot.id}`, `#${lot.id} を ${order.client} ${order.qty}${order.unit === 'kg' ? 'kg' : ''} に充てた`)),
      packStarted: (order: Order) => update((s) => finish(s, `pack-${order.id}`, `${hm(NOW)} ${order.client} のパック詰めを開始`)),
      /** 出荷した = 納品書を出した。記録はその副産物 */
      shipped: (order: Order) => update((s) => finish(patchOrder(s, order.id, { shippedAt: NOW }), `ship-${order.id}`, `${hm(NOW)} ${order.client} ${order.qty}${order.unit === 'kg' ? 'kg' : ''} を出荷(納品書 発行済み)`)),
      reset: () => {
        try { localStorage.removeItem(KEY) } catch { /* noop */ }
        setState(seed())
      },
    }),
    [update],
  )
  return { state, actions }
}
export type Actions = ReturnType<typeof useStore>['actions']
