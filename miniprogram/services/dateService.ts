const WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'] as const

function toDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

function toDateStr(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function addDays(dateStr: string, days: number): string {
  const date = toDate(dateStr)
  date.setDate(date.getDate() + days)
  return toDateStr(date)
}

export function getToday(): string {
  return toDateStr(new Date())
}

export function diffDays(date1: string, date2: string): number {
  const d1 = toDate(date1)
  const d2 = toDate(date2)
  const ms = d2.getTime() - d1.getTime()
  return Math.round(ms / (1000 * 60 * 60 * 24))
}

export function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return `${m}月${d}日`
}

export function formatDateFull(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return `${y}年${m}月${d}日`
}

export function getWeekday(dateStr: string): string {
  const date = toDate(dateStr)
  return WEEKDAY_NAMES[date.getDay()]
}

export function isToday(dateStr: string): boolean {
  return dateStr === getToday()
}

export function calculateShiftedDates(
  cycleStartDate: string,
  pauseDuration: number,
  resumeOption: 'postpone' | 'skip'
): { adjustedDays: number } {
  if (resumeOption === 'postpone') {
    return { adjustedDays: pauseDuration }
  }
  return { adjustedDays: 0 }
}
