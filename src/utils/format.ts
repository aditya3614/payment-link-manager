const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** 149950 → "₹1,499.50"; 50000000 → "₹5,00,000.00" (Indian digit grouping). */
export function formatAmount(amountPaise: number): string {
  return inrFormatter.format(amountPaise / 100)
}

/** "26 Nov 2026, 3:30 pm" in the viewer's time zone (overridable for deterministic tests). */
export function formatDateTime(iso: string, timeZone?: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(date)
}

/** "+919876543210" → "+91 98765 43210". Leaves anything unexpected untouched. */
export function formatPhone(phone: string): string {
  const match = /^\+91(\d{5})(\d{5})$/.exec(phone)
  return match ? `+91 ${match[1]} ${match[2]}` : phone
}

/** Formats a Date as a `datetime-local` input value ("YYYY-MM-DDTHH:mm") in local time. */
export function toDateTimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}`
}
