export type SiteSelectionAnalysisSection =
  | 'analysis'
  | 'team'
  | 'workRecords'
  | 'logs'
  | 'conversation'

export type SiteSelectionAnalysisSource = 'mock' | 'api'

export const siteSelectionAnalysisSources: Readonly<Record<SiteSelectionAnalysisSection, SiteSelectionAnalysisSource>> = {
  analysis: 'api',
  team: 'api',
  workRecords: 'api',
  logs: 'api',
  conversation: 'api',
}

export function usesSiteSelectionAnalysisApi(section: SiteSelectionAnalysisSection): boolean {
  return siteSelectionAnalysisSources[section] === 'api'
}
