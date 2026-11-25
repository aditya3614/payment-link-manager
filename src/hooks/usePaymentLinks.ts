import { useCallback, useState } from 'react'
import { buildPaymentLink, generatePaymentLinkId } from '../utils/paymentLinks'
import type { PaymentLink, ValidPaymentLinkData } from '../utils/types'

/** In-memory store for payment links (no backend). Resets on reload. */
export function usePaymentLinks(initialLinks: PaymentLink[] | (() => PaymentLink[])) {
  const [links, setLinks] = useState<PaymentLink[]>(initialLinks)

  const addLink = useCallback((data: ValidPaymentLinkData): PaymentLink => {
    const link = buildPaymentLink(data, new Date(), generatePaymentLinkId())
    setLinks((prev) => [link, ...prev])
    return link
  }, [])

  return { links, addLink }
}
