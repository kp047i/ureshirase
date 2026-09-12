import { FIXED_TODAY, TODAY, ymdw } from '../domain/time'

export function Header({ onReset }: { onReset: () => void }) {
  return (
    <header className="flex flex-wrap items-center gap-x-[18px] gap-y-2 mb-7">
      <div aria-label="ウレシラセ">
        <svg viewBox="0 0 250 76" role="img" className="h-[50px] w-auto block max-[720px]:h-10">
          <title>ウレシラセ</title>
          <circle cx="52" cy="16" r="6" fill="#D5E8C2" /><circle cx="76" cy="16" r="8" fill="#B7D89C" /><circle cx="104" cy="16" r="10" fill="#9CCB6B" /><circle cx="136" cy="16" r="12" fill="#6FAE3B" /><circle cx="174" cy="16" r="14" fill="#8FBC3F" />
          <text x="125" y="70" textAnchor="middle" fontSize="40" fontWeight="700" letterSpacing="3" fontFamily="'Noto Sans JP','Hiragino Sans',sans-serif"><tspan fill="#7CB342">ウレ</tspan><tspan fill="#2F6B47">シラセ</tspan></text>
        </svg>
      </div>
      <div className="flex items-baseline gap-3.5 pl-[18px] border-l border-line max-[720px]:border-l-0 max-[720px]:pl-0 max-[720px]:w-full">
        <h1 className="font-head text-xl font-bold">追熟ダッシュボード</h1>
        <div className="text-[15px] text-muted">{ymdw(TODAY)}{FIXED_TODAY ? '(固定)' : ''}</div>
      </div>
      <button onClick={onReset} className="ml-auto text-xs text-muted border border-line rounded-md px-3 py-1 hover:bg-paper" title="ブラウザに保存した操作を消して最初の状態に戻す">
        最初の状態に戻す
      </button>
    </header>
  )
}
