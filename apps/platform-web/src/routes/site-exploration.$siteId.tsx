import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/site-exploration/$siteId')({
  component: Outlet,
})
