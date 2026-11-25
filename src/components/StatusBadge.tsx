import type { PaymentLinkStatus } from '../utils/types'

export function StatusBadge({ status }: { status: PaymentLinkStatus }) {
  return (
    <span className={`status-badge status-badge--${status.toLowerCase()}`}>
      <span className="visually-hidden">Status: </span>
      {status}
    </span>
  )
}
