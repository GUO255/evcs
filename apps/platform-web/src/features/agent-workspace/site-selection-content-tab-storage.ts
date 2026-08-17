export const SITE_SELECTION_CONTENT_TAB_STORAGE_KEY = 'evcs.site-selection.content-tab.v1'
export const SITE_SELECTION_MODE_TAB_STORAGE_KEY = 'evcs.site-selection.mode-tab.v1'

export type SiteSelectionContentTab = 'map' | 'agent-site-selection'
export type SiteSelectionModeTab =
  | 'single-site-score'
  | 'multi-site-comparison'
  | 'network-layout-optimization'

type ReadableStorage = Pick<Storage, 'getItem'>
type WritableStorage = Pick<Storage, 'setItem'>

export function isSiteSelectionContentTab(value: unknown): value is SiteSelectionContentTab {
  return value === 'map' || value === 'agent-site-selection'
}

export function readSiteSelectionContentTab(storage: ReadableStorage): SiteSelectionContentTab {
  try {
    const value = storage.getItem(SITE_SELECTION_CONTENT_TAB_STORAGE_KEY)
    return isSiteSelectionContentTab(value) ? value : 'map'
  } catch {
    return 'map'
  }
}

export function writeSiteSelectionContentTab(
  storage: WritableStorage,
  tab: SiteSelectionContentTab,
): void {
  try {
    storage.setItem(SITE_SELECTION_CONTENT_TAB_STORAGE_KEY, tab)
  } catch {
    // Session storage restrictions must not make navigation unusable.
  }
}

export function isSiteSelectionModeTab(value: unknown): value is SiteSelectionModeTab {
  return value === 'single-site-score'
    || value === 'multi-site-comparison'
    || value === 'network-layout-optimization'
}

export function readSiteSelectionModeTab(storage: ReadableStorage): SiteSelectionModeTab {
  try {
    const value = storage.getItem(SITE_SELECTION_MODE_TAB_STORAGE_KEY)
    return isSiteSelectionModeTab(value) ? value : 'single-site-score'
  } catch {
    return 'single-site-score'
  }
}

export function writeSiteSelectionModeTab(
  storage: WritableStorage,
  tab: SiteSelectionModeTab,
): void {
  try {
    storage.setItem(SITE_SELECTION_MODE_TAB_STORAGE_KEY, tab)
  } catch {
    // Session storage restrictions must not make navigation unusable.
  }
}
