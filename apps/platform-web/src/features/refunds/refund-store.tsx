import { createContext, useCallback, useContext, useMemo, useState } from 'react'

import {
  createInitialRefunds,
  type RefundRecord,
  type RefundReviewInput,
} from './refund-data'

interface RefundStore {
  refunds: readonly RefundRecord[]
  reviewRefund: (refundId: string, input: RefundReviewInput) => void
}

const RefundContext = createContext<RefundStore | null>(null)

export function RefundProvider({ children }: { children: React.ReactNode }) {
  const [refunds, setRefunds] = useState(createInitialRefunds)
  const reviewRefund = useCallback((refundId: string, input: RefundReviewInput) => {
    const reviewedAt = new Date().toISOString()
    setRefunds((currentRefunds) => currentRefunds.map((refund) => (
      refund.id === refundId && refund.status === 'pending'
        ? { ...refund, status: input.decision, reviewer: input.reviewer, reviewRemark: input.remark, reviewedAt }
        : refund
    )))
  }, [])

  const value = useMemo<RefundStore>(() => ({
    refunds, reviewRefund,
  }), [refunds, reviewRefund])
  return <RefundContext value={value}>{children}</RefundContext>
}

export function useRefunds(): RefundStore {
  const store = useContext(RefundContext)
  if (!store) throw new Error('useRefunds must be used within RefundProvider')
  return store
}
