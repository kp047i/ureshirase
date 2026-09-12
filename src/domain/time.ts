export const DAY = 86400000
export const H = 3600000
export const MIN = 60000

const params = new URLSearchParams(location.search)
const todayParam = params.get('today')

/** 今日の 0:00。?today=YYYY-MM-DD で固定できる */
export const TODAY: number = (() => {
  const d = todayParam ? new Date(todayParam + 'T00:00:00') : new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
})()
/** 現在時刻。固定日のときは 8:30 とみなす */
export const NOW: number = todayParam ? TODAY + 8.5 * H : Date.now()
export const FIXED_TODAY = !!todayParam

export const T = (days: number, hour = 0): number => TODAY + days * DAY + hour * H

export const dayOf = (t: number): number => {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}
export const dayDiff = (a: number, b: number): number => Math.round((dayOf(a) - dayOf(b)) / DAY)
export const sameDay = (a: number, b: number): boolean => dayDiff(a, b) === 0

export const WD = ['日', '月', '火', '水', '木', '金', '土'] as const
export const md = (t: number): string => {
  const d = new Date(t)
  return `${d.getMonth() + 1}/${d.getDate()}`
}
export const hm = (t: number): string => {
  const d = new Date(t)
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}
export const ymdw = (t: number): string => {
  const d = new Date(t)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日(${WD[d.getDay()]})`
}
export const hoursLabel = (m: number): string =>
  m % 60 === 0 ? `${m / 60}時間` : `${Math.floor(m / 60)}時間${m % 60}分`
