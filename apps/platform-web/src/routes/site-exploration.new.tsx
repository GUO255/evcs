import { createFileRoute } from '@tanstack/react-router'

import { SiteExplorationNewPage } from '@/features/site-planning/site-exploration-edit-page'

export const Route = createFileRoute('/site-exploration/new')({ component: SiteExplorationNewPage })
