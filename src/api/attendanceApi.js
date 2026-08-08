import { createApiSlot } from './apiSlot'

export const attendanceApiSlot = createApiSlot({
  name: 'Attendance',
  endpoint: 'PASTE_API_ENDPOINT_HERE',
})

export async function fetchAttendanceOverview() {
  attendanceApiSlot.assertConfigured()
  const response = await fetch(attendanceApiSlot.endpoint)
  if (!response.ok) throw new Error('Failed to fetch attendance overview')
  return response.json()
}
