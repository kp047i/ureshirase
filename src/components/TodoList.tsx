import type { ReactNode } from 'react'
import { derive, liveLots, packPlan, pendingGroups, spareOf } from '../domain/derive'
import { VARIETIES, qtyText } from '../domain/master'
import type { Actions } from '../domain/store'
import { NOW, T, TODAY, hm, hoursLabel, md, sameDay } from '../domain/time'
import type { State } from '../domain/types'

interface Action { label: string; ghost?: boolean; fn: () => void }
interface Item { key: string; kind: string; what: string; cond?: ReactNode[]; why: ReactNode; actions: Action[] }

const B = ({ children }: { children: ReactNode }) => <b className="text-ink font-medium">{children}</b>
const Warn = ({ children }: { children: ReactNode }) => <span className="text-warn font-bold">{children}</span>

/** 今日、人が判断する必要のあることだけを並べる。予定通りのものは出ない */
function buildTodos(state: State, a: Actions): Item[] {
  const items: Item[] = []
  const { lots, orders, cold } = state
  const coldQty = (v: string) => cold.filter((c) => c.variety === v).reduce((s, c) => s + c.qty, 0)

  for (const g of pendingGroups(orders)) {
    if (g.start >= T(1)) continue
    const v = VARIETIES[g.variety]
    const c = coldQty(g.variety)
    items.push({
      key: `start-${g.id}`, kind: '追熟を開始', what: `${v.name} ${qtyText(g.qty, g.unit)}`,
      cond: [<><B>{v.ethTemp}℃</B></>, <>エチレン <B>{v.ethHours}</B>時間</>, <>寝かせ <B>{v.restDays}</B>日</>],
      why: <>{g.orders.map((o, i) => <span key={o.id}>{i > 0 && ' + '}<B>{o.client} {qtyText(o.qty, o.unit)}</B>({md(o.date)})</span>)}。逆算すると今日が開始日。{c >= g.qty ? `冷蔵に ${c}kg あり` : <Warn>冷蔵 {c}kg で {g.qty - c}kg 足りない</Warn>}</>,
      actions: [{ label: '開始した', fn: () => a.startGroup(g) }],
    })
  }

  for (const lot of liveLots(lots)) {
    const d = derive(lot)
    const v = d.v
    const name = `#${lot.id} ${v.name} ${lot.grade} ${qtyText(lot.qty, lot.unit)}`
    const spare = spareOf(lot, orders)
    if (!lot.ethRemovedAt && sameDay(d.ethEnd, TODAY))
      items.push({
        key: `eth-${lot.id}`, kind: 'エチレンを抜く', what: name,
        cond: [<><B>{v.ethTemp}℃</B></>, <>{md(lot.start)} {hm(lot.start)} 開始</>],
        why: <>{lot.place}。<B>{hm(d.ethEnd)}</B> で{v.ethHours}時間{NOW > d.ethEnd ? '(経過)' : ''}。抜いたら寝かせ{v.restDays}日</>,
        actions: [{ label: '抜いた', fn: () => a.ethRemoved(lot) }],
      })
    if (d.stage === 'check')
      items.push({
        key: `check-${lot.id}`, kind: '食べ頃チェック', what: name,
        why: <>{lot.place}。寝かせ{v.restDays + lot.extraDays}日が完了。<B>触って確認</B></>,
        actions: [{ label: 'OK 出荷可能', fn: () => a.checkOk(lot) }, { label: 'もう1日', ghost: true, fn: () => a.extendOneDay(lot) }],
      })
    if (d.stage === 'process' && spare > 0) {
      const candidates = orders.filter((o) => o.kind === 'process' && o.variety === lot.variety && o.lots.length === 0 && !o.shippedAt)
      items.push({
        key: `exp-${lot.id}`, kind: '生食期限切れ → 加工へ', what: name,
        why: <>{lot.place}。<B>{md(d.readyEnd)}</B> に生食期限を過ぎた。加工期限 <B>{md(d.processEnd)}</B> まで<Warn>あと{d.processDaysLeft}日</Warn>。注文なし {qtyText(spare, lot.unit)}</>,
        actions: [
          ...candidates.map((o) => ({ label: `${o.client} ${qtyText(o.qty, o.unit)} に充てる`, fn: () => a.assignToOrder(lot, o) })),
          { label: '加工に回した', ghost: true, fn: () => a.dispose(lot, 'process', spare) },
          { label: '廃棄した', ghost: true, fn: () => a.dispose(lot, 'waste', spare) },
        ],
      })
    }
    if (d.stage === 'expired' && spare > 0)
      items.push({
        key: `exp-${lot.id}`, kind: '加工期限も切れた', what: name,
        why: <>{lot.place}。<B>{md(d.processEnd)}</B> に加工期限を過ぎた。<Warn>注文なし {qtyText(spare, lot.unit)}</Warn></>,
        actions: [{ label: '廃棄した', ghost: true, fn: () => a.dispose(lot, 'waste', spare) }],
      })
  }

  for (const o of orders) {
    if (o.shippedAt) continue
    const p = packPlan(o)
    if (p && sameDay(p.start, TODAY))
      items.push({
        key: `pack-${o.id}`, kind: 'パック詰め', what: `${o.client} ${qtyText(o.qty, o.unit)} → ${p.cups}カップ`,
        why: <>1人で<B>{hoursLabel(p.minutes)}</B>。{sameDay(o.date, TODAY) ? '' : md(o.date) + ' '}{hm(o.date)} 出荷なので <B>{hm(p.start)}</B> までに開始{NOW > p.start ? '(経過)' : ''}</>,
        actions: [{ label: '開始した', fn: () => a.packStarted(o) }],
      })
    if (sameDay(o.date, TODAY) && o.lots.length > 0)
      items.push({
        key: `ship-${o.id}`, kind: '出荷', what: `${o.client} ${qtyText(o.qty, o.unit)}${o.kind === 'process' ? '(加工向け)' : ''}`,
        why: <><B>{hm(o.date)}</B> 出荷。ロット {o.lots.map((id) => `#${id}`).join(' ')}。納品書を出すと記録される</>,
        actions: [{ label: '納品書を出して出荷した', fn: () => a.shipped(o) }],
      })
  }
  return items
}

export function TodoList({ state, actions }: { state: State; actions: Actions }) {
  const items = buildTodos(state, actions)
  const live = new Set(items.map((i) => i.key))
  const doneKeys = Object.keys(state.done).filter((k) => !live.has(k))
  if (!items.length && !doneKeys.length)
    return <div className="border border-dashed border-line rounded-lg p-[18px] text-muted text-center">今日の作業はありません</div>
  return (
    <div className="grid gap-2.5 grid-cols-[repeat(auto-fill,minmax(260px,1fr))]">
      {items.map((it) => (
        <div key={it.key} className="border border-line rounded-lg p-3.5 flex flex-col gap-1.5">
          <div className="text-xs text-muted font-bold">{it.kind}</div>
          <div className="text-base font-bold">{it.what}</div>
          {it.cond && (
            <div className="flex flex-wrap gap-1.5 my-0.5">
              {it.cond.map((c, i) => <span key={i} className="text-[13px] px-[9px] py-0.5 rounded-md bg-[#F6F4EF] border border-line [&_b]:text-[15px]">{c}</span>)}
            </div>
          )}
          <div className="text-muted text-[13px] flex-1">{it.why}</div>
          <div className="flex flex-wrap gap-2 mt-1.5">
            {it.actions.map((ac) => (
              <button key={ac.label} onClick={ac.fn} className={`flex-1 min-h-12 rounded-lg border border-accent font-bold text-sm leading-tight px-2 py-1.5 active:translate-y-px ${ac.ghost ? 'bg-white' : 'bg-accent'}`}>
                {ac.label}
              </button>
            ))}
          </div>
        </div>
      ))}
      {doneKeys.map((k) => (
        <div key={k} className="border border-line rounded-lg px-3.5 py-2.5 flex items-center text-muted text-[13px]">
          <span className="text-accent-ink font-bold mr-1.5">✓</span>{state.done[k]}
        </div>
      ))}
    </div>
  )
}
