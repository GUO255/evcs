import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/site-exploration/$siteId/')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/site-exploration/$siteId/edit',
      params: { siteId: params.siteId },
      replace: true,
    })
  },
})
