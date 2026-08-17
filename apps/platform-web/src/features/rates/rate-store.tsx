import { useSyncExternalStore } from 'react'

import {
  createInitialRateTemplates,
  generateRateTemplateCode,
  type RateTemplate,
  type RateTemplateInput,
} from './rate-data'

let templates: readonly RateTemplate[] = createInitialRateTemplates()
const listeners = new Set<() => void>()

function emitChange(nextTemplates: readonly RateTemplate[]) {
  templates = nextTemplates
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useRates() {
  return useSyncExternalStore(
    subscribe,
    () => templates,
    () => templates,
  )
}

export function createRateTemplate(input: RateTemplateInput) {
  const now = new Date().toISOString()
  emitChange([{
    ...input,
    id: crypto.randomUUID(),
    code: generateRateTemplateCode(templates),
    name: input.name.trim(),
    periods: input.periods.map((period) => ({ ...period })),
    createdAt: now,
    updatedAt: now,
  }, ...templates])
}

export function updateRateTemplate(id: string, input: RateTemplateInput) {
  emitChange(templates.map((template) => template.id === id ? {
    ...template,
    ...input,
    name: input.name.trim(),
    periods: input.periods.map((period) => ({ ...period })),
    updatedAt: new Date().toISOString(),
  } : template))
}

export function deleteRateTemplate(id: string) {
  emitChange(templates.filter((template) => template.id !== id))
}
