import { createApiSlot } from './apiSlot'

export const feedbackApiSlot = createApiSlot({
  name: 'Feedback',
  endpoint: 'PASTE_API_ENDPOINT_HERE',
})

export async function submitSuggestion(payload) {
  feedbackApiSlot.assertConfigured()
  const response = await fetch(feedbackApiSlot.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) throw new Error('Failed to submit suggestion')
  return response.json()
}
