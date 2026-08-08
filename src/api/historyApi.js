import { createApiSlot } from './apiSlot'

export const historyApiSlot = createApiSlot({
  name: 'History',
  endpoint: 'PASTE_API_ENDPOINT_HERE',
})

export async function fetchHistoryOfTheDay() {
  historyApiSlot.assertConfigured()
  const response = await fetch(historyApiSlot.endpoint)
  if (!response.ok) throw new Error('Failed to fetch history of the day')
  return response.json()
}
