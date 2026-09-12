import { VARIETIES, qtyText } from '../domain/master'
import { md } from '../domain/time'
import type { ColdStock } from '../domain/types'

export function ColdTable({ cold }: { cold: ColdStock[] }) {
  const rows = cold.filter((c) => c.qty > 0).sort((a, b) => a.variety.localeCompare(b.variety) || a.since - b.since)
  return (
    <table className="border border-line rounded-lg border-separate border-spacing-0 w-full max-w-[640px] text-[13px] [&_th]:px-3 [&_th]:py-1.5 [&_td]:px-3 [&_td]:py-1.5 [&_th]:text-left [&_td]:text-left [&_td]:border-t [&_td]:border-line-2">
      <thead><tr className="text-[11px] text-muted font-bold"><th>品種</th><th>規格</th><th className="!text-right">量</th><th>冷蔵した日</th></tr></thead>
      <tbody>
        {rows.map((c) => (
          <tr key={c.id}>
            <td><span className="chip mr-1.5" style={{ background: VARIETIES[c.variety].color }} />{VARIETIES[c.variety].name}</td>
            <td>{c.grade}</td>
            <td className="!text-right">{qtyText(c.qty, c.unit)}</td>
            <td>{md(c.since)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
