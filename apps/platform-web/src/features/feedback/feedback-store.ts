import { useSyncExternalStore } from 'react'

import { initialFeedbackRecords, type FeedbackRecord } from './feedback-data'

let records: readonly FeedbackRecord[] = initialFeedbackRecords.map((record) => ({ ...record }))
const listeners = new Set<() => void>()

function emitChange(nextRecords: readonly FeedbackRecord[]) {
  records = nextRecords
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useFeedbackRecords() {
  return useSyncExternalStore(subscribe, () => records, () => records)
}

export function updateFeedbackReply(id: string, reply: string) {
  emitChange(records.map((record) => record.id === id ? {
    ...record,
    status: 'replied',
    reply,
    repliedAt: new Date().toISOString(),
  } : record))
}
