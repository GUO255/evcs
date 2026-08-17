import { createContext, useCallback, useContext, useMemo, useState } from 'react'

import {
  createInitialCustomers,
  generateCustomerCode,
  type Customer,
  type CustomerInput,
} from './customer-data'

interface CustomerStore {
  customers: readonly Customer[]
  getCustomer: (customerId: string) => Customer | undefined
  createCustomer: (input: CustomerInput) => void
  updateCustomer: (customerId: string, input: CustomerInput) => void
  deleteCustomer: (customerId: string) => void
}

const CustomerContext = createContext<CustomerStore | null>(null)

export function CustomerProvider({ children }: { children: React.ReactNode }) {
  const [customers, setCustomers] = useState(createInitialCustomers)

  const getCustomer = useCallback(
    (customerId: string) => customers.find((customer) => customer.id === customerId),
    [customers],
  )

  const createCustomer = useCallback((input: CustomerInput) => {
    setCustomers((currentCustomers) => {
      const timestamp = new Date().toISOString()
      const customer: Customer = {
        ...input,
        unifiedSocialCreditCode: input.unifiedSocialCreditCode.toUpperCase(),
        id: crypto.randomUUID(),
        customerCode: generateCustomerCode(currentCustomers),
        createdAt: timestamp,
        updatedAt: timestamp,
      }
      return [customer, ...currentCustomers]
    })
  }, [])

  const updateCustomer = useCallback((customerId: string, input: CustomerInput) => {
    setCustomers((currentCustomers) => currentCustomers.map((customer) => {
      if (customer.id !== customerId) return customer
      return {
        ...customer,
        ...input,
        unifiedSocialCreditCode: input.unifiedSocialCreditCode.toUpperCase(),
        updatedAt: new Date().toISOString(),
      }
    }))
  }, [])

  const deleteCustomer = useCallback((customerId: string) => {
    setCustomers((currentCustomers) => (
      currentCustomers.filter((customer) => customer.id !== customerId)
    ))
  }, [])

  const value = useMemo<CustomerStore>(() => ({
    customers,
    getCustomer,
    createCustomer,
    updateCustomer,
    deleteCustomer,
  }), [createCustomer, customers, deleteCustomer, getCustomer, updateCustomer])

  return <CustomerContext value={value}>{children}</CustomerContext>
}

export function useCustomers(): CustomerStore {
  const store = useContext(CustomerContext)
  if (!store) throw new Error('useCustomers must be used within CustomerProvider')
  return store
}
