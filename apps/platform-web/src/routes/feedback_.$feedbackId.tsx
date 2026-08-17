import { createFileRoute } from '@tanstack/react-router'

import { FeedbackDetailPage } from '@/features/feedback/feedback-detail-page'

export const Route = createFileRoute('/feedback_/$feedbackId')({
  component: FeedbackDetailRoute,
})

function FeedbackDetailRoute() {
  const { feedbackId } = Route.useParams()
  return <FeedbackDetailPage feedbackId={feedbackId} />
}
