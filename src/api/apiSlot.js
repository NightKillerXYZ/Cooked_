export function createApiSlot({ name, endpoint = 'PASTE_API_ENDPOINT_HERE' }) {
  const isConfigured = endpoint !== 'PASTE_API_ENDPOINT_HERE'

  return {
    name,
    endpoint,
    isConfigured,
    assertConfigured() {
      if (!isConfigured) {
        throw new Error(`${name} API slot is not configured yet.`)
      }
    },
  }
}
