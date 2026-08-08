import { createApiSlot } from './apiSlot'

export const supportApiSlot = createApiSlot({
  name: 'Support',
  endpoint: 'PASTE_API_ENDPOINT_HERE',
})

export async function submitSupportRequest(payload) {
  supportApiSlot.assertConfigured()
  const response = await fetch(supportApiSlot.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) throw new Error('Failed to submit support request')
  return response.json()
}
