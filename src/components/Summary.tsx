import { derive, ordersOf, spareOf } from '../domain/derive'
import { T, md } from '../domain/time'
import type { State } from '../domain/types'

/** 在庫の見通し。kg 単位のロットだけを合計し、パック・箱は数えない */
export function Summary({ state }: { state: State }) {
  const { lots, orders } = state
  const t7 = T(7)
  let nowKg = 0, nowSpare = 0, in7Kg = 0, wasteKg = 0, processKg = 0, toProcessKg = 0
  for (const lot of lots) {
    if (lot.unit !== 'kg') continue
    const d = derive(lot)
    const os = ordersOf(lot, orders)
    const last = os[os.length - 1]
    const spare = spareOf(lot, orders)
    if (lot.disposed === 'process') { processKg += spare; continue }
    if (lot.disposed === 'waste' || d.stage === 'expired') { wasteKg += spare; continue }
    if (d.stage === 'process') { toProcessKg += spare; continue }
    if (d.stage === 'ready') { nowKg += lot.qty; nowSpare += spare }
    if (!(last && last.date < t7) && d.restEnd <= t7 && t7 <= d.readyEnd) in7Kg += lot.qty
  }
  const cards = [
    { k: 'いま出荷できる(生食)', v: nowKg, n: `うち注文なし ${nowSpare}kg`, hero: true },
    { k: `7日後(${md(t7)})に出荷できる見込み`, v: in7Kg, n: '追熟中で 7日後に出荷可能になっているもの', hero: true },
    { k: '加工に回す期限が迫っている', v: toProcessKg, n: processKg ? `加工に回した ${processKg}kg は含まない` : '生食期限を過ぎ、加工期限内' },
    { k: '期限切れ廃棄', v: wasteKg, n: '加工期限も過ぎたもの' },
  ]
  return (
    <div className="grid grid-cols-4 max-[720px]:grid-cols-2 border border-line rounded-lg overflow-hidden">
      {cards.map((c, i) => (
        <div key={c.k} className={`px-4 py-3.5 ${i > 0 ? 'border-l border-line' : ''} max-[720px]:[&:nth-child(3)]:border-l-0 max-[720px]:[&:nth-child(n+3)]:border-t max-[720px]:[&:nth-child(n+3)]:border-line`}>
          <div className="text-xs text-muted">{c.k}</div>
          <div className={`font-head text-[28px] leading-tight mt-0.5 ${c.hero ? 'text-accent-ink' : ''}`}>{c.v.toLocaleString()}<small className="text-[13px] font-body text-muted ml-0.5">kg</small></div>
          <div className="text-[11px] text-muted">{c.n}</div>
        </div>
      ))}
    </div>
  )
}
