import { redirect } from '@tanstack/react-router'

import type { PlatformModule } from '@/features/product-shell/platform-modules'
import { isPlatformTab } from '@/features/product-shell/platform-modules'

export interface ModuleSearch {
  tab?: string
}

export function validateModuleSearch(search: Record<string, unknown>): ModuleSearch {
  return typeof search.tab === 'string' ? { tab: search.tab } : {}
}

export function canonicalizeModuleSearch(module: PlatformModule, search: ModuleSearch) {
  const firstTab = module.tabs[0]
  if (!firstTab) return
  if (search.tab && isPlatformTab(module, search.tab)) return

  throw redirect({
    to: module.path,
    search: { tab: firstTab.id },
    replace: true,
  })
}
