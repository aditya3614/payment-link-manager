import { useCallback, useState } from 'react'
import { PaymentLinkForm } from './components/PaymentLinkForm'
import { PaymentLinkList } from './components/PaymentLinkList'
import { StatusFilter } from './components/StatusFilter'
import { createSeedLinks } from './data/seedLinks'
import { useNow } from './hooks/useNow'
import { usePaymentLinks } from './hooks/usePaymentLinks'
import { sortByCreatedDesc } from './utils/paymentLinks'
import { countByStatus, filterLinksByStatus, getNextExpiryTime } from './utils/status'
import type { PaymentLink, StatusFilter as StatusFilterValue, ValidPaymentLinkData } from './utils/types'

interface AppProps {
  /** Defaults to mock seed data; tests pass their own (e.g. `[]`). */
  initialLinks?: PaymentLink[]
}

export default function App({ initialLinks }: AppProps) {
  const { links, addLink } = usePaymentLinks(() => initialLinks ?? createSeedLinks())
  const [filter, setFilter] = useState<StatusFilterValue>('All')

  // Status is derived from `now`, which re-renders exactly when the next link expires.
  const now = useNow(getNextExpiryTime(links))

  const counts = countByStatus(links, now)
  const visibleLinks = sortByCreatedDesc(filterLinksByStatus(links, filter, now))

  const handleCreate = useCallback(
    (data: ValidPaymentLinkData) => {
      const link = addLink(data)
      // New links are Active; make sure the merchant can see what they just made.
      setFilter((current) => (current === 'All' || current === 'Active' ? current : 'All'))
      return link
    },
    [addLink],
  )

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__inner">
          <h1>Payment Links</h1>
          <p className="app-header__subtitle">Demo data is kept in memory and resets when you reload.</p>
        </div>
      </header>

      <main className="layout">
        <section className="panel panel--form" aria-labelledby="create-heading">
          <h2 id="create-heading">Create payment link</h2>
          <PaymentLinkForm onCreate={handleCreate} />
        </section>

        <section className="panel panel--list" aria-labelledby="links-heading">
          <div className="list-header">
            <h2 id="links-heading">Your payment links</h2>
            <StatusFilter value={filter} counts={counts} onChange={setFilter} />
            <p className="list-summary" aria-live="polite">
              {filter === 'All'
                ? `Showing all ${links.length} ${links.length === 1 ? 'link' : 'links'}`
                : `Showing ${visibleLinks.length} of ${links.length} links · ${filter}`}
            </p>
          </div>
          <PaymentLinkList
            links={visibleLinks}
            totalCount={links.length}
            filter={filter}
            now={now}
            onShowAll={() => setFilter('All')}
          />
        </section>
      </main>
    </div>
  )
}
