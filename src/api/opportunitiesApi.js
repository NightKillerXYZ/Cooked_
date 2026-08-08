import { createApiSlot } from './apiSlot'

export const opportunitiesApiSlot = createApiSlot({
  name: 'Opportunities',
  endpoint: 'PASTE_API_ENDPOINT_HERE',
})

export async function fetchOpportunities() {
  opportunitiesApiSlot.assertConfigured()
  const response = await fetch(opportunitiesApiSlot.endpoint)
  if (!response.ok) throw new Error('Failed to fetch opportunities')
  return response.json()
}
