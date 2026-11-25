import { formatAmount, formatDateTime, formatPhone } from '../utils/format'
import { getEffectiveStatus } from '../utils/status'
import type { PaymentLink, PaymentLinkStatus, StatusFilter } from '../utils/types'
import { StatusBadge } from './StatusBadge'

const EXPIRY_LABEL: Record<PaymentLinkStatus, string> = {
  Active: 'Expires',
  Expired: 'Expired on',
  Paid: 'Expiry',
}

interface PaymentLinkListProps {
  /** Already filtered and sorted. */
  links: PaymentLink[]
  totalCount: number
  filter: StatusFilter
  now: Date
  onShowAll: () => void
}

export function PaymentLinkList({ links, totalCount, filter, now, onShowAll }: PaymentLinkListProps) {
  if (totalCount === 0) {
    return (
      <div className="empty-state">
        <p className="empty-state__title">No payment links yet</p>
        <p>Create your first link with the form and it will appear here.</p>
      </div>
    )
  }

  if (links.length === 0) {
    return (
      <div className="empty-state">
        <p className="empty-state__title">No {filter.toLowerCase()} links</p>
        <p>Nothing matches this filter right now.</p>
        <button type="button" className="button button--secondary" onClick={onShowAll}>
          Show all links
        </button>
      </div>
    )
  }

  return (
    <ul className="link-list" aria-label="Payment links">
      {links.map((link) => (
        <PaymentLinkCard key={link.id} link={link} now={now} />
      ))}
    </ul>
  )
}

function PaymentLinkCard({ link, now }: { link: PaymentLink; now: Date }) {
  const status = getEffectiveStatus(link, now)

  return (
    <li className="link-card" data-testid="payment-link">
      <div className="link-card__header">
        <p className="link-card__amount">{formatAmount(link.amountPaise)}</p>
        <StatusBadge status={status} />
      </div>
      <p className="link-card__description">
        {link.description}
      </p>
      <dl className="link-card__meta">
        <div>
          <dt>Customer</dt>
          <dd>
            {link.customerEmail && <span className="contact">{link.customerEmail}</span>}
            {link.customerPhone && <span className="contact">{formatPhone(link.customerPhone)}</span>}
          </dd>
        </div>
        <div>
          <dt>Created</dt>
          <dd>
            <time dateTime={link.createdAt}>{formatDateTime(link.createdAt)}</time>
          </dd>
        </div>
        <div>
          <dt>{EXPIRY_LABEL[status]}</dt>
          <dd>
            {link.expiresAt ? <time dateTime={link.expiresAt}>{formatDateTime(link.expiresAt)}</time> : 'Never'}
          </dd>
        </div>
      </dl>
    </li>
  )
}
