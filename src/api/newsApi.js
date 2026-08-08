import { createApiSlot } from './apiSlot'

export const newsApiSlot = createApiSlot({
  name: 'News',
  endpoint: 'PASTE_API_ENDPOINT_HERE',
})

export async function fetchDailyNews() {
  newsApiSlot.assertConfigured()
  const response = await fetch(newsApiSlot.endpoint)
  if (!response.ok) throw new Error('Failed to fetch daily news')
  return response.json()
}
