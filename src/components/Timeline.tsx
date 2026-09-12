import { useState } from 'react'
import { RANGE_END, RANGE_START, derive, liveLots, ordersOf, packPlan, pendingGroups, recommendedStart, segmentsOf, shipWarning, spareOf, xOf } from '../domain/derive'
import { BUFFER_DAYS, PACK, RANGE_DAYS, VARIETIES, VARIETY_IDS, qtyText } from '../domain/master'
import { DAY, NOW, TODAY, WD, hm, hoursLabel, md, sameDay, dayOf } from '../domain/time'
import type { Derived, Lot, Order, PendingGroup, State, VarietyId } from '../domain/types'

type View = 'variety' | 'order'

const Chip = ({ v }: { v: VarietyId }) => <span className="chip" style={{ background: VARIETIES[v].color }} />

function Cells({ head }: { head?: boolean }) {
  return (
    <>
      {Array.from({ length: RANGE_DAYS }, (_, i) => {
        const d = RANGE_START + i * DAY
        const today = sameDay(d, TODAY)
        return (
          <div key={i} className={`cell${today ? ' today' : ''}`}>
            {head && <><b>{md(d)}</b><span>{today ? '今日' : WD[new Date(d).getDay()]}</span></>}
          </div>
        )
      })}
    </>
  )
}

function Bars({ x, d, orders, endOrder, top, height }: { x: Lot | PendingGroup; d: Derived; orders: Order[]; endOrder?: Order; top?: string; height?: string }) {
  const segs = segmentsOf(x, d, orders, endOrder)
  return (
    <>
      {segs.map((sg, i) => {
        const l = xOf(sg.from)
        const w = xOf(sg.to) - l
        const cls = ['seg', sg.st, i === 0 ? 'first' : '', i === segs.length - 1 ? 'last' : '', d.ghost ? 'ghost' : ''].join(' ')
        return <div key={i} className={cls} style={{ left: `${l}%`, width: `${w}%`, ...(top ? { top, height } : {}) }} title={`${sg.label}: ${md(sg.from)} ${hm(sg.from)} 〜 ${md(sg.to)} ${hm(sg.to)}`} />
      })}
      {d.ghost && <div className="note top" style={{ left: `calc(${xOf(d.start)}% + 3px)` }}>{md(d.start)} 開始推奨</div>}
    </>
  )
}

function PackMark({ o }: { o: Order }) {
  const p = packPlan(o)
  if (!p) return null
  const px = xOf(o.date)
  const flip = px > 78
  const text = `パック ${sameDay(p.start, o.date) ? '' : md(p.start) + ' '}${hm(p.start)}〜 ${hoursLabel(p.minutes)}`
  if (o.date >= RANGE_END) return <div className="pack r" style={{ left: '100%' }}>{text} →</div>
  return <div className={`pack${flip ? ' r' : ''}`} style={{ left: `${xOf(p.start)}%` }} title={`${p.cups}カップ、1人で${hoursLabel(p.minutes)}`}>{text}</div>
}

function ShipMark({ o, warn, text }: { o: Order; warn: string | null; text?: string }) {
  const px = xOf(o.date)
  const flip = px > 78
  const label = text ?? `${md(o.date)} ${o.client} ${qtyText(o.qty, o.unit)}${o.kind === 'process' ? '(加工)' : ''}${o.shippedAt ? ' ✓' : ''}`
  if (o.date >= RANGE_END)
    return <><div className={`note bottom${warn ? ' warn' : ''}`} style={{ right: 4 }}>{label} →</div><PackMark o={o} /></>
  return (
    <>
      <div className={`ship${warn ? ' warn' : ''}${o.kind === 'process' ? ' process' : ''}`} style={{ left: `${px}%` }} />
      <div className={`note bottom${warn ? ' warn' : ''}`} style={flip ? { right: `${100 - px}%`, marginRight: 4 } : { left: `calc(${px}% + 4px)` }}>
        {warn ? `⚠ ${warn} · ` : ''}{label}
      </div>
      <PackMark o={o} />
    </>
  )
}

/** 同じ日の注文は1つの注記にまとめる(パック詰めの開始時刻は注文ごと) */
function Marks({ orders, d }: { orders: Order[]; d: Derived }) {
  const byDay = new Map<number, Order[]>()
  for (const o of orders) {
    const k = dayOf(o.date)
    byDay.set(k, [...(byDay.get(k) ?? []), o])
  }
  return (
    <>
      {[...byDay.values()].map((g) => {
        const first = g[0]
        if (!first) return null
        const text = g.length === 1 ? undefined : `${md(first.date)} ${g.map((o) => `${o.client} ${qtyText(o.qty, o.unit)}`).join(' + ')}`
        return (
          <span key={first.id}>
            <ShipMark o={first} warn={shipWarning(first, d)} text={text} />
            {g.slice(1).map((o) => <PackMark key={o.id} o={o} />)}
          </span>
        )
      })}
    </>
  )
}

function stateText(d: Derived) {
  const m: Record<Derived['stage'], string> = { eth: 'エチレン中', rest: '寝かせ中', check: 'チェック待ち', ready: `生食 残り${d.daysLeft}日`, process: `加工へ 残り${d.processDaysLeft}日`, expired: '期限切れ', pending: '未着手' }
  const warn = (d.stage === 'ready' && d.daysLeft <= 2) || d.stage === 'process' || d.stage === 'expired'
  return warn ? <span className="text-warn font-bold">{m[d.stage]}</span> : <>{m[d.stage]}</>
}

function Row({ label, children, cls = '' }: { label: React.ReactNode; children: React.ReactNode; cls?: string }) {
  return (
    <div className={`row ${cls}`}>
      <div className="label">{label}</div>
      <div className="track"><Cells /><div className="bars">{children}</div></div>
    </div>
  )
}
function GroupRow({ label, text }: { label: React.ReactNode; text: string }) {
  return <div className="row group"><div className="label"><div className="l1">{label}</div></div><div className="track">{text}</div></div>
}

function LotLane({ lot, orders }: { lot: Lot; orders: Order[] }) {
  const d = derive(lot)
  const v = d.v
  const os = ordersOf(lot, orders)
  const spare = spareOf(lot, orders)
  const showExpNote = spare > 0 && d.readyEnd > RANGE_START && d.readyEnd < RANGE_END
  return (
    <Row label={<>
      <div className="l1"><Chip v={lot.variety} />{v.name} {lot.grade} · {qtyText(lot.qty, lot.unit)}<span className="lot">#{lot.id}</span></div>
      <div className="l2">{lot.place} · {stateText(d)}{spare > 0 ? ` · 注文なし ${qtyText(spare, lot.unit)}` : ''}</div>
    </>}>
      <Bars x={lot} d={d} orders={os} />
      <Marks orders={os} d={d} />
      {showExpNote && (
        <div className="note top warn" style={{ left: `calc(${xOf(d.readyEnd)}% + 4px)` }}>
          {md(d.readyEnd)} 生食期限 → {md(d.processEnd)} 加工期限 · 注文なし {qtyText(spare, lot.unit)}
        </div>
      )}
    </Row>
  )
}

function PendingLane({ g, coldQty }: { g: PendingGroup; coldQty: number }) {
  const d = derive(g)
  return (
    <Row label={<>
      <div className="l1"><Chip v={g.variety} />{d.v.name} · {qtyText(g.qty, g.unit)}<span className="lot">未着手</span></div>
      <div className="l2">{g.orders.map((o) => `${o.client} ${o.qty}`).join(' + ')} · 冷蔵 {coldQty}kg</div>
    </>}>
      <Bars x={g} d={d} orders={g.orders} />
      <Marks orders={g.orders} d={d} />
    </Row>
  )
}

/** 注文別: 1注文=1レーン。ロットが付いていれば実績の帯、無ければ開始推奨日からの予定 */
function OrderLane({ o, lots, coldQty }: { o: Order; lots: Lot[]; coldQty: number }) {
  const v = VARIETIES[o.variety]
  const mine = o.lots.map((id) => lots.find((l) => l.id === id)).filter((l): l is Lot => !!l)
  const warns: string[] = []
  let sub: React.ReactNode
  let bars: React.ReactNode
  if (mine.length) {
    const n = mine.length
    const gap = 2
    const hgt = (16 - gap * (n - 1)) / n
    bars = mine.map((lot, i) => {
      const d = derive(lot)
      const w = shipWarning(o, d)
      if (w) warns.push(`#${lot.id} ${w}`)
      return <Bars key={lot.id} x={lot} d={d} orders={[]} endOrder={o} top={n > 1 ? `calc(50% - 8px + ${i * (hgt + gap)}px)` : undefined} height={`${hgt}px`} />
    })
    sub = mine.map((l) => <span key={l.id}>#{l.id}({stateText(derive(l))}) </span>)
  } else if (o.kind === 'process') {
    bars = null
    sub = <><span className="lot">ロット未選択</span> 生食期限を過ぎたロットを充てる</>
  } else {
    const g: PendingGroup = { id: `P${o.id}`, variety: o.variety, start: recommendedStart(o), qty: o.qty, unit: o.unit, orders: [o], ghost: true }
    const d = derive(g)
    bars = <Bars x={g} d={d} orders={[o]} endOrder={o} />
    sub = <><span className="lot">未着手</span> {md(d.start)} 開始 · 冷蔵 {coldQty}kg</>
  }
  return (
    <Row label={<>
      <div className="l1"><Chip v={o.variety} />{md(o.date)} {o.client} {qtyText(o.qty, o.unit)}{o.kind === 'process' && <span className="text-st-process text-[11px] font-bold">加工</span>}</div>
      <div className="l2">{v.name} · パック{o.pack ? 'あり' : 'なし'} · {sub}</div>
    </>}>
      {bars}
      <ShipMark o={o} warn={warns.join(' / ') || null} />
    </Row>
  )
}

export function Timeline({ state }: { state: State }) {
  const [view, setView] = useState<View>(() => (new URLSearchParams(location.search).get('view') === 'order' ? 'order' : 'variety'))
  const { lots, orders, cold } = state
  const coldQty = (v: VarietyId) => cold.filter((c) => c.variety === v).reduce((s, c) => s + c.qty, 0)
  const live = liveLots(lots)
  const groups = pendingGroups(orders)
  const spareList = live.map((l) => ({ l, s: spareOf(l, orders) })).filter((o) => o.s > 0)

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-[13px] text-muted font-bold tracking-wide">追熟タイムライン</h2>
        <div className="inline-flex border border-line rounded-md overflow-hidden">
          {(['order', 'variety'] as const).map((vw) => (
            <button key={vw} onClick={() => setView(vw)} className={`text-xs px-3 py-1 ${view === vw ? 'bg-ink text-white' : 'bg-white text-muted'}`}>{vw === 'order' ? '注文別' : '品種別'}</button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-muted mb-2 [&_span]:inline-flex [&_span]:items-center [&_span]:gap-1.5 [&_i]:inline-block [&_i]:w-3.5 [&_i]:h-2 [&_i]:rounded-sm">
        <span><i className="bg-st-eth" />エチレン</span>
        <span><i className="bg-st-rest" />寝かせ</span>
        <span><i className="bg-st-ready" />出荷可能(生食 7日)</span>
        <span><i className="bg-st-process" />加工に回せる(5日)</span>
        <span><i className="bg-st-expired" />期限切れ</span>
        <span><i className="bg-st-rest opacity-45" />未着手(開始推奨日からの予定)</span>
        <span><i className="!w-[3px] !h-2.5 bg-ink" />パック詰めの開始時刻(1人)</span>
        <span>│ 出荷</span>
      </div>
      <div className="border border-line rounded-lg overflow-x-auto">
        <div className="tl">
          <div className="row head">
            <div className="label">{view === 'order' ? '注文' : '品種 / ロット'}</div>
            <div className="track"><Cells head /></div>
          </div>
          {view === 'order' ? (
            <>
              {[...orders].sort((a, b) => a.date - b.date).map((o) => <OrderLane key={o.id} o={o} lots={lots} coldQty={coldQty(o.variety)} />)}
              <div className="row footnote">
                <div className="label">注文なしの追熟</div>
                <div className="track">{spareList.map((o) => `#${o.l.id} ${VARIETIES[o.l.variety].name} ${qtyText(o.s, o.l.unit)}`).join('、')}はこの表示に出ない</div>
              </div>
            </>
          ) : (
            VARIETY_IDS.map((key) => {
              const v = VARIETIES[key]
              const ls = live.filter((l) => l.variety === key).map((l) => ({ l, d: derive(l) })).sort((a, b) => a.d.restEnd - b.d.restEnd).map((o) => o.l)
              const pend = groups.filter((g) => g.variety === key)
              if (!ls.length && !pend.length) return null
              const running = ls.filter((l) => l.unit === 'kg').reduce((a, l) => a + l.qty, 0)
              const runningOther = ls.filter((l) => l.unit !== 'kg').map((l) => qtyText(l.qty, l.unit)).join('+')
              const pending = pend.reduce((a, g) => a + g.qty, 0)
              return (
                <div key={key}>
                  <GroupRow label={<><Chip v={key} />{v.name}</>} text={`追熟中 ${running}kg${runningOther ? ` + ${runningOther}` : ''}${pending ? ` · 未着手 ${pending}kg` : ''} · 冷蔵 ${coldQty(key)}kg`} />
                  {ls.map((l) => <LotLane key={l.id} lot={l} orders={orders} />)}
                  {pend.map((g) => <PendingLane key={g.id} g={g} coldQty={coldQty(key)} />)}
                </div>
              )
            })
          )}
          <div className="nowline" style={{ left: `calc(var(--label-w) + (100% - var(--label-w)) * ${xOf(NOW) / 100})` }} />
        </div>
      </div>
      <details className="mt-2 text-xs text-muted">
        <summary className="cursor-pointer">計算のルール</summary>
        <p className="mt-1 ml-3.5">
          開始推奨日 = 出荷日 − 到達日数(エチレン+寝かせ+チェック1日) − 余裕{BUFFER_DAYS}日。同じ品種で開始日が同じ注文は1ロットにまとめる。<br />
          品種マスタ: {VARIETY_IDS.map((k) => `${VARIETIES[k].name} ${VARIETIES[k].ethTemp}℃ ${VARIETIES[k].ethHours}h→${VARIETIES[k].restDays}日`).join(' / ')}。出荷可能(生食)は寝かせ終了から{VARIETIES.hayward.windowDays}日、その後{VARIETIES.hayward.processDays}日は加工に回せる。温度はマスタの設定値で、ロットごとには入力しない。<br />
          段階(エチレン中・寝かせ中・出荷可能・加工へ・期限切れ)は開始日時と現在時刻から導く。人が入れるのは開始・抜いた・チェック・出荷と、予定と違ったとき(もう1日・加工へ・廃棄)だけ。<br />
          パック詰め: 1カップ{PACK.cupGrams}g、1人{PACK.minPerCup}分/カップ、作業は{PACK.workStartH}〜{PACK.workEndH}時。出荷時刻から逆算して開始時刻を出す。
        </p>
      </details>
    </section>
  )
}
