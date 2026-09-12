import { ColdTable } from './components/ColdTable'
import { Header } from './components/Header'
import { Summary } from './components/Summary'
import { Timeline } from './components/Timeline'
import { TodoList } from './components/TodoList'
import { useStore } from './domain/store'

const H2 = ({ children }: { children: string }) => <h2 className="text-[13px] text-muted font-bold tracking-wide mb-2.5">{children}</h2>

export default function App() {
  const { state, actions } = useStore()
  return (
    <div className="max-w-[1240px] mx-auto px-6 pt-6 pb-14 max-[720px]:px-3 max-[720px]:pt-4">
      <Header onReset={actions.reset} />
      <section className="mb-8"><H2>今日やること</H2><TodoList state={state} actions={actions} /></section>
      <Timeline state={state} />
      <section className="mb-8"><H2>冷蔵在庫(まだ追熟していない)</H2><ColdTable cold={state.cold} /></section>
      <section className="mb-8"><H2>在庫の見通し</H2><Summary state={state} /></section>
    </div>
  )
}
