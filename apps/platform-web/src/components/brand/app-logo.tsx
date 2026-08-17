import { cn } from '@/lib/utils'

interface AppLogoProps {
  className?: string
}

export function AppLogo({ className }: AppLogoProps) {
  return (
    <img
      alt="极充智联"
      className={cn('h-11 w-auto', className)}
      height={53}
      src="/logo/logo.png"
      width={190}
    />
  )
}
