async function request(path, options) {
  const response = await fetch(`/api${path}`, options)
  if (!response.ok) throw new Error(`Request failed: ${response.status}`)
  return response.json()
}

export const fetchBootstrap = () => request('/bootstrap')

export const saveTodayAttendance = (status) =>
  request('/attendance/today', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })

export const saveAttendance = (date, status) =>
  request('/attendance', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date, status }),
  })

export const fetchNotifications = () => request('/notifications')

export const completeQuest = (id) => request(`/quests/${id}/complete`, { method: 'POST' })

export const claimDailyChallenge = () => request('/daily-challenge/claim', { method: 'POST' })

export const submitSuggestion = (message) =>
  request('/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  })

export const saveGoals = (goals) =>
  request('/goals', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(goals),
  })

export const updateGoalProgress = (progress) =>
  request('/goals/progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ progress }),
  })
export const saveProfile = (name) =>
  request('/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })

export const saveAvatar = (avatar) =>
  request('/profile/avatar', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ avatar }),
  })

export const submitSupportRequest = ({ subject, message }) =>
  request('/support', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subject, message }),
  })

