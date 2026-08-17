import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'

interface AuthStatusPageProps {
  eyebrow: string
  title: string
  description: string
  action?: ReactNode
}

export function AuthStatusPage({ eyebrow, title, description, action }: AuthStatusPageProps) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-6">
      <section className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.2em] text-primary">{eyebrow}</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
        {action ? <div className="mt-6">{action}</div> : null}
      </section>
    </main>
  )
}

export function RetryLoginButton({ onClick }: { onClick: () => void }) {
  return <Button onClick={onClick}>重新登录</Button>
}
