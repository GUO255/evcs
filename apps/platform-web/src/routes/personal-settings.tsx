import { createFileRoute } from '@tanstack/react-router'

import { PersonalSettingsPage } from '@/features/personal-settings/personal-settings-page'

export const Route = createFileRoute('/personal-settings')({
  component: PersonalSettingsPage,
})
