import { createApiSlot } from './apiSlot'

export const lawApiSlot = createApiSlot({
  name: 'Law',
  endpoint: 'PASTE_API_ENDPOINT_HERE',
})

export async function fetchLawOfTheDay() {
  lawApiSlot.assertConfigured()
  const response = await fetch(lawApiSlot.endpoint)
  if (!response.ok) throw new Error('Failed to fetch law of the day')
  return response.json()
}
