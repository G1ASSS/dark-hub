'use client'
import { createContext, useContext } from 'react'

export type AccountData = {
  username: string
  email: string
  role: string
  displayName: string
  avatarUrl: string | null
  bio: string
  website: string
  location: string
  planSlug: string
  planName: string
  twoFactorEnabled: boolean
  counts: { favorites: number; history: number; downloads: number }
}

const AccountContext = createContext<AccountData | null>(null)

export function AccountProvider({ value, children }: { value: AccountData; children: React.ReactNode }) {
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}

export function useAccount() {
  const ctx = useContext(AccountContext)
  if (!ctx) throw new Error('useAccount must be used inside AccountProvider')
  return ctx
}
