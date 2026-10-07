const CURRENCY = 'INR'
const LOCALE = 'en-IN'

const money = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: CURRENCY,
  maximumFractionDigits: 0,
})

/** Format minor units (paise) as currency. */
export const formatPrice = (minor: number) => money.format(minor / 100)

/** Convert a major-unit form value to minor units without float drift. */
export const toMinor = (major: number) => Math.round(major * 100)

const dateFmt = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' })

/** Format a YYYY-MM-DD string without timezone shifting. */
export const formatDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return dateFmt.format(new Date(y, m - 1, d))
}

export const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const todayISO = () => toISODate(new Date())

export const addDaysISO = (iso: string, n: number) => {
  const [y, m, d] = iso.split('-').map(Number)
  return toISODate(new Date(y, m - 1, d + n))
}

export const diffDays = (start: string, end: string) => {
  const [y1, m1, d1] = start.split('-').map(Number)
  const [y2, m2, d2] = end.split('-').map(Number)
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000)
}

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
