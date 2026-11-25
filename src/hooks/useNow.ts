import { useEffect, useState } from 'react'

// setTimeout overflows above ~24.8 days.
const MAX_TIMEOUT_MS = 2 ** 31 - 1

/**
 * Current time as React state, refreshed exactly when `nextChangeAt` passes
 * (e.g. the next link expiry) and whenever the tab becomes visible again.
 */
export function useNow(nextChangeAt: number | null): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    if (nextChangeAt === null) return
    const delay = Math.min(Math.max(nextChangeAt - Date.now(), 0) + 25, MAX_TIMEOUT_MS)
    const timer = setTimeout(() => setNow(new Date()), delay)
    return () => clearTimeout(timer)
  }, [nextChangeAt, now])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') setNow(new Date())
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  return now
}
