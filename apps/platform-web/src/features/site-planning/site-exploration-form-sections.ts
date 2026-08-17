export const siteExplorationFormSections = [
  { id: 'location', label: '位置信息' },
  { id: 'site', label: '场站信息' },
  { id: 'transport', label: '交通与区位' },
  { id: 'land', label: '土地与建设' },
  { id: 'supporting', label: '配套与评估' },
  { id: 'power', label: '电力情况' },
  { id: 'preliminary-design', label: '现场初步设计' },
] as const

export type SiteExplorationFormSectionId = (typeof siteExplorationFormSections)[number]['id']

export function getSiteExplorationFormSection(
  id: SiteExplorationFormSectionId,
) {
  return siteExplorationFormSections.find((section) => section.id === id)!
}
