import { createContext, useCallback, useContext, useMemo, useState } from 'react'

import {
  createInitialMerchants,
  generateMerchantCode,
  normalizeMerchantInput,
  type Merchant,
  type MerchantInput,
} from './merchant-data'

interface MerchantStore {
  merchants: readonly Merchant[]
  getMerchant: (merchantId: string) => Merchant | undefined
  createMerchant: (input: MerchantInput) => void
  updateMerchant: (merchantId: string, input: MerchantInput) => void
  deleteMerchant: (merchantId: string) => void
}

const MerchantContext = createContext<MerchantStore | null>(null)

export function MerchantProvider({ children }: { children: React.ReactNode }) {
  const [merchants, setMerchants] = useState(createInitialMerchants)

  const getMerchant = useCallback(
    (merchantId: string) => merchants.find((merchant) => merchant.id === merchantId),
    [merchants],
  )

  const createMerchant = useCallback((input: MerchantInput) => {
    const timestamp = new Date().toISOString()
    setMerchants((currentMerchants) => {
      const createdMerchant: Merchant = {
        ...normalizeMerchantInput(input),
        id: crypto.randomUUID(),
        merchantCode: generateMerchantCode(currentMerchants),
        createdAt: timestamp,
        updatedAt: timestamp,
      }
      return [createdMerchant, ...currentMerchants]
    })
  }, [])

  const updateMerchant = useCallback((merchantId: string, input: MerchantInput) => {
    setMerchants((currentMerchants) => currentMerchants.map((merchant) => {
      if (merchant.id !== merchantId) return merchant
      return {
        ...merchant,
        ...normalizeMerchantInput(input),
        updatedAt: new Date().toISOString(),
      }
    }))
  }, [])

  const deleteMerchant = useCallback((merchantId: string) => {
    setMerchants((currentMerchants) => (
      currentMerchants.filter((merchant) => merchant.id !== merchantId)
    ))
  }, [])

  const value = useMemo<MerchantStore>(() => ({
    merchants,
    getMerchant,
    createMerchant,
    updateMerchant,
    deleteMerchant,
  }), [createMerchant, deleteMerchant, getMerchant, merchants, updateMerchant])

  return <MerchantContext value={value}>{children}</MerchantContext>
}

export function useMerchants(): MerchantStore {
  const store = useContext(MerchantContext)
  if (!store) throw new Error('useMerchants must be used within MerchantProvider')
  return store
}
