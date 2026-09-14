import 'bootstrap/dist/css/bootstrap.min.css'
import './bootstrap-studio.css'
import './bootstrap-studio.js'
import './style.css'
import {
  claimDailyChallenge as claimDailyChallengeRequest,
  completeQuest as completeQuestRequest,
  fetchBootstrap,
  saveAttendance,
  submitSuggestion,
  saveGoals,
  updateGoalProgress,
  saveProfile,
  saveAvatar,
  submitSupportRequest,
} from './api/appApi'

const app = document.querySelector('#app')
let questReadTimer = null
const savedTheme = localStorage.getItem('cooked-theme')
if (savedTheme) document.documentElement.dataset.theme = savedTheme

const TABS = ['HOME', 'GOALS', 'HISTORY', 'NEW_TODAY', 'KNOW_THE_CON', 'SETTINGS']

const HTML_ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

const AVATAR_DEFAULT = { shirt: '#ff6b00', skin: '#bd7a58', hair: 'classic' }
const AVATAR_HAIRSTYLES = ['classic', 'wave', 'curly', 'buzz']
const AVATAR_SKIN_TONES = ['#f6d3bd', '#dfa07c', '#bd7a58', '#8d573f', '#603829']

function normalizeAvatar(avatar = {}) {
  const isColor = (value) => /^#[0-9a-f]{6}$/i.test(value || '')
  return {
    shirt: isColor(avatar.shirt) ? avatar.shirt : AVATAR_DEFAULT.shirt,
    skin: AVATAR_SKIN_TONES.includes(avatar.skin) ? avatar.skin : AVATAR_DEFAULT.skin,
    hair: AVATAR_HAIRSTYLES.includes(avatar.hair) ? avatar.hair : AVATAR_DEFAULT.hair,
  }
}

async function persistAvatar(partialAvatar) {
  const avatar = normalizeAvatar({ ...state.user.avatar, ...partialAvatar })
  try {
    applyProfile(await saveAvatar(avatar))
  } catch {
    state.xpToast = 'Could not save avatar changes'
  }
  render()
}

// Escapes user- or API-sourced text before it is interpolated into innerHTML,
// preventing markup/script injection from untrusted content (e.g. hydrated API data).
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char])
}

function loadAvatarPositions() {
  try {
    const saved = JSON.parse(localStorage.getItem('cooked-avatar-positions') || '{}')
    return Object.fromEntries(
      Object.entries(saved).flatMap(([tab, position]) => {
        const x = Number(position?.x)
        const y = Number(position?.y)
        return TABS.includes(tab) && Number.isFinite(x) && Number.isFinite(y) ? [[tab, { x, y }]] : []
      }),
    )
  } catch {
    return {}
  }
}

const QUEST_META = {
  attendance: { title: 'Attendance', icon: '🗓️' },
  history: { title: 'History', icon: '📖' },
  law: { title: 'Law', icon: '⚖️' },
  opportunities: { title: 'Opportunities', icon: '🏆' },
  dailyBrief: { title: 'Daily Brief', icon: '📰' },
  surprise: { title: 'Surprise', icon: '🔒', locked: true },
}

const state = {
  user: {
    name: 'Student',
    streak: 0,
    longestStreak: 0,
    level: 1,
    xp: 0,
    levelCap: 1000,
    dailyXp: 0,
    weeklyXp: 0,
    monthlyXp: 0,
    achievements: [],
    avatar: AVATAR_DEFAULT,
  },
  activeTab: 'HOME',
  settingsMenuOpen: false,
  settingsSection: 'profile',
  activeQuestId: null,
  xpToast: '',
  avatarPositions: loadAvatarPositions(),
  attendance: { schoolName: 'School Attendance', mode: 'calendar', records: [] },
  history: null,
  law: null,
  opportunities: [],
  news: [],
  rewards: [],
  quests: [],
  dailyChallenge: { title: 'Daily Sprint', task: 'Complete any 2 quests today', reward: 80, goal: 2, claimed: false },
  milestones: {},
  goals: null,
  notifications: [],
  notificationsOpen: false,
  attendanceMonth: new Date().toISOString().slice(0, 7),
  attendanceDate: new Date().toISOString().slice(0, 10),
}

function todayInfo() {
  const now = new Date()
  return {
    day: now.getDate(),
    month: now.toLocaleString(undefined, { month: 'long' }),
    year: now.getFullYear(),
    weekday: now.toLocaleString(undefined, { weekday: 'long' }),
  }
}

function attendanceRecords(month = state.attendanceMonth) {
  const records = state.attendance.records
    .map((record) => {
      const parsed = new Date(record.date)
      if (Number.isNaN(parsed.getTime())) return null
      return { date: record.date, day: parsed.getDate(), status: record.status }
    })
    .filter((record) => record && record.date.startsWith(month))
  return records
}

function attendanceOverall() {
  const records = attendanceRecords()
  if (!records.length) return 0
  const present = records.filter((record) => record.status === 'present').length
  return Math.round((present / records.length) * 100)
}

function applyProfile(profile) {
  state.user = { ...state.user, ...profile.user, avatar: normalizeAvatar(profile.user?.avatar) }
  state.attendance = profile.attendance
  state.history = profile.history
  state.law = profile.law
  state.news = profile.news
  state.opportunities = profile.opportunities
  state.quests = profile.quests
  state.dailyChallenge = profile.dailyChallenge
  state.milestones = profile.milestones || {}
  state.goals = profile.goals || null
  state.notifications = profile.notifications || state.notifications || []
}

async function markTodayAttendance(status) {
  try {
    applyProfile(await saveAttendance(state.attendanceDate, status))
    render()
  } catch {
    state.xpToast = 'Could not save attendance'
    render()
  }
}

function levelProgress() {
  const earned = Math.max(0, state.user.xp)
  return Math.min(100, (earned / state.user.levelCap) * 100)
}

function remainingXp() {
  return Math.max(0, state.user.levelCap - state.user.xp)
}

function completedQuestsCount() {
  return state.quests.filter((quest) => quest.status === 'completed').length
}

function questById(id) {
  return state.quests.find((quest) => quest.id === id)
}

function completedUnlockedQuestsCount() {
  return state.quests.filter((quest) => quest.status === 'completed').length
}

function currentRank() {
  if (state.user.level >= 15) return 'Master'
  if (state.user.level >= 10) return 'Champion'
  if (state.user.level >= 5) return 'Rising'
  return 'Starter'
}

function questClass(status) {
  if (status === 'completed') return 'completed'
  if (status === 'active') return 'active'
  if (status === 'locked') return 'locked'
  return 'pending'
}

async function markQuestCompleted(id) {
  const quest = questById(id)
  if (!quest || quest.status === 'completed' || quest.status === 'locked') return

  try {
    const reward = quest.reward
    applyProfile(await completeQuestRequest(id))
    state.xpToast = `+${reward} XP`
    render()
    setTimeout(() => {
      state.xpToast = ''
      render()
    }, 1200)
  } catch {
    state.xpToast = 'Could not complete quest'
    render()
  }
}

async function claimDailyChallenge() {
  const completed = completedUnlockedQuestsCount()
  if (state.dailyChallenge.claimed || completed < state.dailyChallenge.goal) return

  try {
    const reward = state.dailyChallenge.reward
    applyProfile(await claimDailyChallengeRequest())
    state.xpToast = `+${reward} XP Daily Bonus`
    render()
    setTimeout(() => {
      state.xpToast = ''
      render()
    }, 1200)
  } catch {
    state.xpToast = 'Daily challenge is not ready'
    render()
  }
}

function openQuest(id) {
  const quest = questById(id)
  if (!quest || quest.status === 'locked') return
  state.activeQuestId = id
  state.activeTab = 'HOME'
  render()
}

function avatarPosition() {
  return state.avatarPositions[state.activeTab] || { x: 0, y: 0 }
}

function saveAvatarPosition(position) {
  state.avatarPositions[state.activeTab] = position
  localStorage.setItem('cooked-avatar-positions', JSON.stringify(state.avatarPositions))
}

function renderAvatar() {
  const avatar = normalizeAvatar(state.user.avatar)
  return `
    <span class="app-avatar hair-${avatar.hair}" aria-hidden="true" style="--avatar-shirt:${avatar.shirt}; --avatar-skin:${avatar.skin};">
      <span class="avatar-shirt"></span>
      <span class="avatar-neck"></span>
      <span class="avatar-ear avatar-ear-left"></span>
      <span class="avatar-ear avatar-ear-right"></span>
      <span class="avatar-face">
        <span class="avatar-brow avatar-brow-left"></span>
        <span class="avatar-brow avatar-brow-right"></span>
        <span class="avatar-eye avatar-eye-left"></span>
        <span class="avatar-eye avatar-eye-right"></span>
        <span class="avatar-nose"></span>
        <span class="avatar-mouth"></span>
      </span>
      <span class="avatar-hair"></span>
    </span>
  `
}

function renderFloatingAvatar() {
  const position = avatarPosition()
  return `
    <button class="floating-avatar" type="button" aria-label="Move your student avatar" title="Drag to move your avatar" data-draggable-avatar style="--avatar-x: ${position.x}px; --avatar-y: ${position.y}px">
      ${renderAvatar()}
    </button>
  `
}

function renderTopHeader() {
  const notificationsEnabled = localStorage.getItem('cooked-notifications') !== 'off'
  return `
    <header class="app-header d-flex align-items-center justify-content-between">
      <div class="d-flex align-items-center">
        <div class="app-brand">
          <h1 class="wordmark m-0">COOKED?</h1>
        </div>
      </div>
      <nav class="app-nav d-none d-lg-flex align-items-center gap-4">
        <button class="nav-link ${state.activeTab === 'HOME' ? 'active' : ''}" data-tab="HOME">Home</button>
        <button class="nav-link ${state.activeTab === 'GOALS' ? 'active' : ''}" data-tab="GOALS">Goals</button>
        <button class="nav-link ${state.activeTab === 'HISTORY' ? 'active' : ''}" data-tab="HISTORY">History</button>
        <button class="nav-link ${state.activeTab === 'NEW_TODAY' ? 'active' : ''}" data-tab="NEW_TODAY">New Today</button>
        <button class="nav-link ${state.activeTab === 'KNOW_THE_CON' ? 'active' : ''}" data-tab="KNOW_THE_CON">Know the Con</button>
      </nav>
      <div class="app-actions d-flex align-items-center gap-2">
        <button class="icon-btn bell position-relative" aria-label="Notifications" data-open-notifications>🔔${notificationsEnabled && state.notifications.length ? `<span class="position-absolute top-0 end-0">${state.notifications.length}</span>` : ''}</button>
        <button class="avatar-btn rounded-circle" aria-label="Open profile settings" data-open-profile>${renderAvatar()}</button>
      </div>
    </header>
  `
}

function goalSubjects(exam) {
  return exam === 'NEET'
    ? [{ key: 'physics', label: 'Physics', short: 'P' }, { key: 'chemistry', label: 'Chemistry', short: 'C' }, { key: 'biology', label: 'Biology', short: 'B' }]
    : [{ key: 'physics', label: 'Physics', short: 'P' }, { key: 'chemistry', label: 'Chemistry', short: 'C' }, { key: 'maths', label: 'Mathematics', short: 'M' }]
}

function renderGoalTargetFields(exam) {
  return `<div class="goal-target-fields">${goalSubjects(exam).map((subject) => `<label><span><b>${subject.short}</b> ${subject.label}</span><input name="${subject.key}" type="number" min="0" max="1000" inputmode="numeric" placeholder="0"><small>questions</small></label>`).join('')}</div>`
}

function renderGoalsSetup() {
  return `
    <section class="goals-setup card p-4">
      <p class="tag mb-2">Daily goals</p>
      <h2 class="mb-2">Make a plan you can actually finish.</h2>
      <p class="text-muted">Set the number of questions you want to solve each day. You can change this whenever you need.</p>
      <p class="goals-privacy-note">🔒 THIS IS PERSONAL — NO ONE IS GONNA SEE THIS. PUT THE CORRECT NUMBER.</p>
      <form id="goalsSetup" class="goals-form">
        <fieldset><legend>I'm preparing for</legend><div class="exam-options"><label><input type="radio" name="exam" value="JEE" checked><span>JEE</span></label><label><input type="radio" name="exam" value="NEET"><span>NEET</span></label></div></fieldset>
        <div id="goalTargetFields">${renderGoalTargetFields('JEE')}</div>
        <label class="goal-note-field">Note <textarea name="note" rows="3" maxlength="2000" placeholder="Write a study note, reminder, or plan. Targets are optional."></textarea></label>
        <p class="small text-muted mb-0">Add targets, a note, or both. You can start with notes and add targets later.</p>
        <button class="primary-btn goal-save-btn" type="submit">Start my daily goal →</button>
      </form>
    </section>
  `
}

function renderGoalsTab() {
  if (!state.goals?.exam) return renderGoalsSetup()
  const { exam, targets = {}, progress = {} } = state.goals
  const subjects = goalSubjects(exam)
  const targetTotal = subjects.reduce((sum, subject) => sum + (targets[subject.key] || 0), 0)
  const progressTotal = subjects.reduce((sum, subject) => sum + Math.min(progress[subject.key] || 0, targets[subject.key] || 0), 0)
  const complete = targetTotal > 0 && progressTotal >= targetTotal
  const percent = targetTotal ? Math.min(100, Math.round((progressTotal / targetTotal) * 100)) : 0
  return `
    <section class="goals-hero card p-4"><div><p class="tag mb-2">${exam} prep</p><h2 class="mb-1">Your daily question goal</h2><p class="text-muted mb-0">Small, honest targets. Real momentum.</p></div><div class="goal-score ${complete ? 'complete' : ''}"><strong>${percent}%</strong><span>today</span></div></section>
    <section class="card goals-progress-card p-3 mt-3">
      <div class="d-flex justify-content-between align-items-center gap-2 mb-3"><h3 class="m-0">Today's progress</h3><span class="text-muted small">${progressTotal} / ${targetTotal} questions</span></div><div class="goal-overall-progress mb-3"><span style="width:${percent}%"></span></div>
      <div class="goal-list">${subjects.map((subject) => { const target = targets[subject.key] || 0; const done = Math.min(progress[subject.key] || 0, target); const subjectPercent = target ? Math.round((done / target) * 100) : 0; return `<article class="goal-subject ${done >= target && target ? 'done' : ''}"><div class="goal-subject-heading"><span class="goal-letter">${subject.short}</span><strong>${subject.label}</strong><span>${done} / ${target}</span></div><div class="goal-overall-progress"><span style="width:${subjectPercent}%"></span></div><div class="goal-stepper"><button type="button" data-goal-step="${subject.key}" data-goal-change="-1" ${done <= 0 ? 'disabled' : ''}>−</button><strong>${done}</strong><button type="button" data-goal-step="${subject.key}" data-goal-change="1" ${done >= target ? 'disabled' : ''}>+</button></div></article>` }).join('')}</div>
      ${state.goals.note ? `<article class="goal-note"><strong>Note</strong><p>${escapeHtml(state.goals.note)}</p></article>` : ''}
      <form id="goalNoteForm" class="goal-note-form mt-3"><textarea name="note" rows="2" maxlength="2000" placeholder="Add a note without changing your targets">${escapeHtml(state.goals.note || '')}</textarea><button class="link-btn" type="submit">Save note</button></form>
      <div class="goal-celebration ${complete ? 'show' : ''}">${complete ? '🎉 Goal complete! You kept your promise to yourself.' : 'Every question counts — keep going.'}</div><button class="link-btn mt-3" type="button" data-edit-goals>Edit goals</button>
    </section>
  `
}

function renderGreeting() {
  return `
    <section class="greeting card p-4">
      <div class="row align-items-center">
        <div class="col-12">
          <p class="muted mb-1">Good morning,</p>
          <h2 class="mb-1">${state.user.name} 👋</h2>
          <p class="mb-2">Let's make today count.</p>
          <p class="rank-pill mb-0">Rank: ${currentRank()}</p>
        </div>
      </div>
    </section>
  `
}

function renderLevelCard() {
  return `
    <section class="xp-card card p-3 d-flex align-items-center gap-3">
      <div class="level-badge">${state.user.level}</div>
      <div class="xp-main flex-grow-1">
        <p class="label mb-1">LEVEL ${state.user.level}</p>
        <strong class="d-block">${state.user.xp.toLocaleString()} / ${state.user.levelCap.toLocaleString()} XP</strong>
        <div class="xp-progress mt-2"><span style="width:${levelProgress()}%"></span></div>
      </div>
      <div class="xp-next text-end">
        <p class="mb-1">${remainingXp().toLocaleString()} XP to next level</p>
        <span>›</span>
      </div>
    </section>
  `
}

function renderJourneyCard() {
  return `
    <section class="journey card p-3">
      <div class="journey-head d-flex justify-content-between align-items-center gap-2">
        <h3 class="m-0">Today's Journey</h3>
        <p class="m-0 text-muted">${completedQuestsCount()} / ${state.quests.length} Completed</p>
      </div>
      <div class="quest-path mt-3">
        ${state.quests
          .map((quest, index) => {
            const meta = QUEST_META[quest.id]
            return `
              <div class="quest-node ${questClass(quest.status)} position-relative pb-2" data-quest="${quest.id}">
                <button class="quest-hit w-100 text-start" ${quest.status === 'locked' ? 'disabled' : ''}>
                  <span class="quest-icon">${quest.status === 'completed' ? '✓' : meta.icon}</span>
                  <span class="quest-name fw-semibold">${meta.title}</span>
                  <span class="quest-xp">${quest.status === 'completed' ? `+${quest.reward} XP earned` : `+${quest.reward} XP`}</span>
                </button>
                ${index < state.quests.length - 1 ? '<div class="path-line"></div>' : ''}
              </div>
            `
          })
          .join('')}
      </div>
    </section>
  `
}

function renderStreakAndXp() {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  return `
    <section class="stats-grid">
      <article class="card streak-card p-3">
        <h3 class="fs-5">🔥 ${state.user.streak} Day Streak</h3>
        <p class="text-muted mt-1">Keep it going!</p>
        <div class="streak-days d-grid grid-cols-7 gap-1 mt-3">
          ${days
            .map((day, i) => `<span class="${i < 6 ? 'done' : ''}">${day}</span>`)
            .join('')}
        </div>
      </article>
      <article class="card total-xp-card p-3">
        <h3 class="fs-5">Total XP</h3>
        <strong class="d-block mt-2">${(state.user.xp / 1000).toFixed(1)}K</strong>
        <p class="text-muted">+${state.user.dailyXp} XP today</p>
        <div class="trend mt-2" aria-hidden="true"></div>
      </article>
    </section>
  `
}

function renderWhatsNew() {
  const feature = state.history
  if (!feature) {
    return `
      <section class="section-title-row d-flex align-items-center justify-content-between mb-2"><h3 class="m-0">What's New</h3></section>
      <article class="card featured p-3 mb-1"><p class="text-muted m-0">Today's featured story will appear here when it is published.</p></article>
    `
  }
  return `
    <section class="section-title-row d-flex align-items-center justify-content-between mb-2">
      <h3 class="m-0">What's New</h3>
      <button class="link-btn">View All ></button>
    </section>
    <article class="card featured d-grid gap-3 p-3 mb-1">
      <div class="featured-media">🚀</div>
      <div class="featured-body d-flex flex-column gap-2">
        <p class="tag">${feature.category}</p>
        <h3 class="m-0">${feature.title}</h3>
        <p class="text-muted">On July 20, 1969, humanity took its first steps on the Moon.</p>
        <button class="icon-btn bookmark" aria-label="Bookmark">🔖</button>
      </div>
    </article>
  `
}

function renderQuestDetail() {
  const id = state.activeQuestId
  const meta = QUEST_META[id]
  const quest = questById(id)
  if (!id || !meta || !quest) return ''

  let content = ''

  if (id === 'attendance') {
    content = `
      <p>Mark whether you attended school today and keep your monthly record updated.</p>
      <p class="detail-meta text-muted small">Overall attendance: ${attendanceOverall()}%</p>
    `
  }

  if (id === 'history') {
    content = `
      <p>${state.history?.body || 'Today\'s history story has not been published yet.'}</p>
      ${state.history?.source ? `<p class="detail-meta text-muted small">Source: ${state.history.source}</p>` : ''}
    `
  }

  if (id === 'law') {
    content = `
      <p>${state.law ? `<strong>${state.law.article}:</strong> ${state.law.title}` : 'Today\'s legal concept has not been published yet.'}</p>
      <p>${state.law?.whatItMeans || ''}</p>
      <p class="detail-meta text-muted small">Educational content only.</p>
    `
  }

  if (id === 'opportunities') {
    content = `<ul class="mb-0">${state.opportunities
      .map((item) => `<li>${item.title} • Deadline ${item.deadline}</li>`)
      .join('')}</ul>`
  }

  if (id === 'dailyBrief') {
    const story = state.news[0]
    content = `
      <p><strong>${story?.headline || 'Today\'s news brief has not been published yet.'}</strong></p>
      <p>${story?.summary || ''}</p>
      ${story ? `<p class="detail-meta text-muted small">${story.source} • ${story.date}</p>` : ''}
    `
  }

  const readingWords = content.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length
  const readingSeconds = Math.max(5, Math.ceil((readingWords / 250) * 60))

  return `
    <section class="card detail-card p-3 d-flex flex-column gap-3 mt-2">
      <button class="link-btn" data-back-home>← Back to Home</button>
      <h3>${meta.icon} ${meta.title}</h3>
      ${content}
      <div class="read-to-complete ${quest.status === 'completed' ? 'completed' : ''}" data-auto-complete-quest="${id}" data-read-seconds="${readingSeconds}">
        <div class="d-flex justify-content-between gap-2"><span>${quest.status === 'completed' ? 'Quest completed' : 'Reading progress'}</span><strong>${quest.status === 'completed' ? '✓' : `${readingSeconds}s`}</strong></div>
        <div class="reading-progress"><span style="animation-duration: ${readingSeconds}s"></span></div>
        <small>${quest.status === 'completed' ? 'Progress saved to your account.' : 'Stay on this page while you read. It will complete automatically.'}</small>
      </div>
    </section>
  `
}

function renderMomentumCard() {
  const completed = completedUnlockedQuestsCount()
  const percent = Math.min(100, (completed / state.dailyChallenge.goal) * 100)
  const ready = completed >= state.dailyChallenge.goal

  return `
    <section class="card momentum-card p-3 d-grid gap-2">
      <div class="momentum-head d-flex justify-content-between align-items-center gap-2">
        <h3 class="m-0">⚡ ${state.dailyChallenge.title}</h3>
        <p class="m-0 text-muted">${completed} / ${state.dailyChallenge.goal} quests</p>
      </div>
      <p class="mb-0">${state.dailyChallenge.task}</p>
      <div class="challenge-progress"><span style="width:${percent}%"></span></div>
      <button class="primary-btn challenge-claim" data-claim-daily ${!ready || state.dailyChallenge.claimed ? 'disabled' : ''}>
        ${
          state.dailyChallenge.claimed
            ? '✓ Claimed'
            : ready
              ? `Claim +${state.dailyChallenge.reward} XP`
              : `${state.dailyChallenge.goal - completed} more to unlock`
        }
      </button>
    </section>
  `
}

function renderHomeTab() {
  return `
    ${renderGreeting()}
    <div class="dashboard-grid mt-3">
      <div class="row g-3">
        <div class="col-12 col-lg-8">
          ${renderAttendanceCard()}
        </div>
        <div class="col-12 col-lg-4">
          <div class="d-grid gap-3">
            ${renderLevelCard()}
            ${renderStreakAndXp()}
          </div>
        </div>
      </div>
    </div>
    <div class="home-secondary-grid mt-3">
      ${renderJourneyCard()}
      <div class="d-grid gap-3">
        ${renderMomentumCard()}
        ${renderWhatsNew()}
      </div>
    </div>
  `
}

function renderAttendanceCard() {
  const today = todayInfo()
  const selectedDate = state.attendanceDate
  const selectedRecord = state.attendance.records.find((record) => record.date === selectedDate)
  const monthDate = new Date(`${state.attendanceMonth}-01T00:00:00`)
  const monthLabel = monthDate.toLocaleString(undefined, { month: 'long', year: 'numeric' })
  const overall = attendanceOverall()
  const records = attendanceRecords()
  const recordMap = new Map(records.map((record) => [record.day, record.status]))
  const totalDays = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate()
  const calendarDays = Array.from({ length: totalDays }, (_, index) => index + 1)
  const firstWeekday = (new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).getDay() + 6) % 7
  const presentCount = records.filter((record) => record.status === 'present').length
  const absentCount = records.filter((record) => record.status === 'absent').length
  const selectedLabel = selectedRecord
    ? selectedRecord.status === 'present'
      ? 'Marked Present'
      : 'Marked Absent'
    : 'Not marked yet'

  return `
    <section class="card attendance-card p-3">
      <div class="attendance-head">
        <div>
          <p class="tag mb-2">School</p>
          <h3 class="m-0">Attendance</h3>
          <p class="text-muted mb-0">Track any day, in any month</p>
        </div>
        <div class="attendance-score">
          <strong>${overall}%</strong>
          <span>Overall</span>
        </div>
      </div>

      <div class="today-attendance">
        <div>
          <label class="text-muted mb-1" for="attendanceDate">Selected date</label>
          <input id="attendanceDate" type="date" value="${selectedDate}" max="9999-12-31">
          <h4 class="m-0 mt-2">${selectedLabel}</h4>
        </div>
        <div class="attendance-actions">
          <button class="attendance-choice present ${selectedRecord?.status === 'present' ? 'active' : ''}" data-attendance-status="present">Present</button>
          <button class="attendance-choice absent ${selectedRecord?.status === 'absent' ? 'active' : ''}" data-attendance-status="absent">Absent</button>
        </div>
      </div>

      <div class="mini-calendar" aria-label="${monthLabel} attendance calendar">
        <div class="calendar-title">
          <label><span class="visually-hidden">Month</span><input id="attendanceMonth" type="month" value="${state.attendanceMonth}"></label>
          <span>${presentCount} present / ${absentCount} absent</span>
        </div>
        <div class="calendar-weekdays">
          ${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day) => `<span>${day}</span>`).join('')}
        </div>
        <div class="calendar-grid">
          ${Array.from({ length: firstWeekday }, () => '<span class="calendar-day calendar-day-empty" aria-hidden="true"></span>').join('')}
          ${calendarDays
            .map((day) => {
              const status = recordMap.get(day)
              const classes = ['calendar-day']
              if (status) classes.push(status)
              if (day === today.day) classes.push('today')
              return `<span class="${classes.join(' ')}">${day}</span>`
            })
            .join('')}
        </div>
      </div>
    </section>
  `
}

function renderHistoryTab() {
  return `
    <section class="panel p-3">
      <h2>📖 History</h2>
      <p class="muted text-muted">Learn about today's historical event.</p>
      <article class="card p-3 mt-3">
        <p class="tag mb-2">${state.history?.category || 'History of the Day'}</p>
        <h3 class="m-0 mb-2">${state.history?.title || 'No story published yet'}</h3>
        <p class="text-muted mb-2">${state.history?.period || 'Check back later today.'}</p>
        <p class="mb-0">${state.history?.body || 'A new history story will appear here when it is published.'}</p>
        ${state.history?.source ? `<p class="detail-meta text-muted small">Source: ${state.history.source}</p>` : ''}
      </article>
    </section>
  `
}

function renderNewTodayTab() {
  return `
    <section class="panel p-3">
      <h2>📰 New Today</h2>
      <p class="muted text-muted">Latest news and opportunities.</p>
      
      <h3 class="mt-3 mb-2">Daily News</h3>
      <div class="news-list d-grid gap-2 mb-4">
        ${state.news.map(story => `
          <article class="card p-3">
            <p class="tag mb-1">${story.category}</p>
            <h4 class="m-0 mb-2">${story.headline}</h4>
            <p class="text-muted mb-2">${story.summary}</p>
            <p class="detail-meta text-muted small">${story.source} • ${story.date}</p>
          </article>
        `).join('') || '<p class="text-muted mb-0">No news has been published yet.</p>'}
      </div>
      
      <h3 class="mb-2">Opportunities</h3>
      <div class="opportunities-list d-grid gap-2">
        ${state.opportunities.map(opp => `
          <article class="card p-3">
            <div class="d-flex justify-content-between align-items-start gap-2">
              <div>
                <h4 class="m-0 mb-1">${opp.title}</h4>
                <p class="text-muted small mb-0">${opp.type}</p>
              </div>
              <span class="badge bg-warning text-dark">Deadline: ${opp.deadline}</span>
            </div>
          </article>
        `).join('') || '<p class="text-muted mb-0">No opportunities have been added yet.</p>'}
      </div>
    </section>
  `
}

function renderKnowTheConTab() {
  return `
    <section class="panel p-3">
      <h2>⚖️ Know the Con</h2>
      <p class="muted text-muted">Understand today's legal concept.</p>
      <article class="card p-3 mt-3">
        <h3 class="m-0 mb-2">${state.law ? `${state.law.article}: ${state.law.title}` : 'No legal concept published yet'}</h3>
        <div class="law-content d-grid gap-3 mt-3">
          <div>
            <h4 class="fs-5 mb-1">What it means</h4>
            <p class="text-muted">${state.law?.whatItMeans || 'A clear explanation will appear here when today\'s concept is published.'}</p>
          </div>
          <div>
            <h4 class="fs-5 mb-1">Why it matters</h4>
            <p class="text-muted">${state.law?.whyItMatters || 'This section will explain the practical impact.'}</p>
          </div>
          <div>
            <h4 class="fs-5 mb-1">Example</h4>
            <p class="text-muted">${state.law?.example || 'An example will be available with the published concept.'}</p>
          </div>
          <div>
            <h4 class="fs-5 mb-1">Qualification</h4>
            <p class="text-muted">${state.law?.qualification || 'Any qualifications will be shown here.'}</p>
          </div>
        </div>
        ${state.law?.source ? `<p class="detail-meta text-muted small mt-3">Source: ${state.law.source}</p>` : ''}
      </article>
    </section>
  `
}

function renderMoreTab() {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'Dark' : 'Light'
  const notifications = localStorage.getItem('cooked-notifications') === 'off' ? 'Off' : 'On'
  return `
    <section class="panel p-3">
      <h2>☰ More</h2>
      <p class="muted text-muted">Account settings and preferences.</p>
      <article class="card p-3 mt-3 d-grid gap-3">
        <div class="d-flex align-items-center gap-3">
          <div class="profile-hero">${renderAvatar()}</div>
          <div>
            <h3 class="m-0">${state.user.name}</h3>
            <p class="text-muted m-0">Level ${state.user.level} • ${state.user.xp.toLocaleString()} XP</p>
          </div>
        </div>
        <div class="d-grid gap-2 mt-2">
          <button class="link-btn text-start p-2" data-edit-profile>✏️ Edit Profile</button>
          <button class="link-btn text-start p-2" data-theme-toggle>🎨 Change Theme — ${theme}</button>
          <button class="link-btn text-start p-2" data-notifications-toggle>🔔 Notifications — ${notifications}</button>
          <button class="link-btn text-start p-2" data-privacy>🔒 Privacy Settings</button>
        </div>
        <div class="mt-3 pt-3 d-grid gap-2" style="border-top: 1px solid var(--border);">
          <h4 class="fs-5 mb-1">Help & Support</h4>
          <input id="supportSubject" class="form-control" maxlength="120" placeholder="Subject (e.g. Missing quest)">
          <textarea id="supportMessage" class="form-control" rows="3" maxlength="2000" placeholder="Tell us what happened..."></textarea>
          <button class="primary-btn" type="button" id="sendSupport">Send</button>
        </div>
        <div class="mt-3 pt-3 d-grid gap-2" style="border-top: 1px solid var(--border);">
          <h4 class="fs-5 mb-1">Send a suggestion</h4>
          <textarea id="suggestionInput" class="form-control" rows="3" maxlength="1000" placeholder="What would make COOKED? better?"></textarea>
          <button class="primary-btn" type="button" id="sendSuggestion">Send</button>
        </div>
        <div class="mt-3 pt-3" style="border-top: 1px solid var(--border);">
          <h4 class="fs-5 mb-2">About COOKED?</h4>
          <p class="text-muted small">COOKED? is your gamified student companion. Track attendance, learn history, understand law, and discover opportunities - all while earning XP and leveling up your character.</p>
        </div>
      </article>
    </section>
  `
}

function renderNotificationsPanel() {
  if (!state.notificationsOpen) return ''
  return `<aside class="notifications-panel card" role="dialog" aria-label="Notifications"><div class="notifications-head"><h2>Notifications</h2><button type="button" class="icon-btn" data-close-notifications aria-label="Close notifications">×</button></div>${state.notifications.length ? `<div class="notifications-list">${state.notifications.map((notification) => `<article><strong>${escapeHtml(notification.title || 'COOKED?')}</strong><p>${escapeHtml(notification.message || '')}</p><small>${escapeHtml(notification.createdAt || '')}</small></article>`).join('')}</div>` : '<p class="notifications-empty">No notifications</p>'}</aside>`
}


function renderAvatarCustomizer() {
  const avatar = normalizeAvatar(state.user.avatar)
  return `<article class="card avatar-customizer mt-3">
    <div class="avatar-customizer-head"><div><h3>Customize your avatar</h3><p>It will look the same everywhere in COOKED?</p></div><div class="avatar-preview">${renderAvatar()}</div></div>
    <div class="avatar-control"><label for="avatarShirtColor">T-shirt color</label><div class="shirt-color-row"><input id="avatarShirtColor" type="color" value="${avatar.shirt}" data-avatar-shirt><span class="shirt-color-swatch" style="--swatch:${avatar.shirt}"></span><small>Pick any color</small></div></div>
    <div class="avatar-control"><span>Hairstyle</span><div class="avatar-choice-row">${AVATAR_HAIRSTYLES.map((hair) => `<button type="button" class="avatar-choice ${avatar.hair === hair ? 'selected' : ''}" data-avatar-hair="${hair}"><span class="avatar-choice-head hair-sample-${hair}"></span>${hair}</button>`).join('')}</div></div>
    <div class="avatar-control"><span>Skin tone</span><div class="skin-tone-row">${AVATAR_SKIN_TONES.map((skin) => `<button type="button" class="skin-tone ${avatar.skin === skin ? 'selected' : ''}" style="--skin-tone:${skin}" data-avatar-skin="${skin}" aria-label="Select skin tone"></button>`).join('')}</div></div>
  </article>`
}

function renderSettingsTab() {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'Dark' : 'Light'
  const notifications = localStorage.getItem('cooked-notifications') === 'off' ? 'Off' : 'On'
  const section = state.settingsSection
  const avatar = normalizeAvatar(state.user.avatar)
  return `
    <section class="panel settings-panel p-3">
      <div class="settings-heading"><div><p class="tag mb-2">Your space</p><h2>Settings</h2><p class="muted text-muted">Make COOKED? feel like yours.</p></div><span class="settings-gear" aria-hidden="true">⚙</span></div>
      <nav class="settings-tabs" aria-label="Settings sections">
        ${[['profile', 'Profile'], ['appearance', 'Appearance'], ['notifications', 'Notifications'], ['privacy', 'Privacy'], ['help', 'Help & Support']].map(([key, label]) => `<button type="button" class="${section === key ? 'active' : ''}" data-settings-section="${key}">${label}</button>`).join('')}
      </nav>
      ${section === 'profile' ? renderAvatarCustomizer() : ''}
      ${section === 'profile' ? `<article class="card settings-profile mt-3"><div class="d-flex align-items-center gap-3"><div class="profile-hero">${renderAvatar()}</div><div class="flex-grow-1"><h3 class="m-0">${state.user.name}</h3><p class="text-muted m-0">Level ${state.user.level} • ${state.user.xp.toLocaleString()} XP</p></div><button class="settings-edit" type="button" data-edit-profile aria-label="Edit profile">✎</button></div></article>` : ''}
      ${section === 'appearance' ? `<article class="card settings-card mt-3"><div class="settings-row"><div class="settings-row-icon palette">◐</div><div><strong>Theme</strong><p>Choose what feels best for your eyes.</p></div></div><div class="theme-picker" role="group" aria-label="Color theme"><button type="button" class="${theme === 'Light' ? 'selected' : ''}" data-set-theme="light">☀ Light</button><button type="button" class="${theme === 'Dark' ? 'selected' : ''}" data-set-theme="dark">☾ Dark</button></div></article>` : ''}
      ${section === 'notifications' ? `<article class="card settings-card settings-list mt-3"><button type="button" class="settings-row settings-action" data-notifications-toggle><span class="settings-row-icon bell-row">♢</span><span class="settings-row-copy"><strong>Notifications</strong><small>Daily reminders and updates</small></span><span class="settings-toggle ${notifications === 'On' ? 'on' : ''}" aria-hidden="true"><span></span></span><span class="settings-status ${notifications === 'On' ? 'on' : ''}">${notifications}</span><span class="settings-chevron">›</span></button></article>` : ''}
      ${section === 'privacy' ? `<article class="card settings-card mt-3"><div class="settings-row"><div class="settings-row-icon lock-row">⌑</div><div><strong>Privacy</strong><p>Your goals and attendance stay on your device or your own server.</p></div></div><button class="primary-btn mt-3" type="button" data-privacy>Review privacy</button></article>` : ''}
      ${section === 'help' ? `<article class="card settings-card settings-support mt-3"><div><h4>Need a hand?</h4><p>Send feedback or tell us what went wrong.</p></div><input id="supportSubject" class="form-control" maxlength="120" placeholder="What can we help with?"><textarea id="supportMessage" class="form-control" rows="3" maxlength="2000" placeholder="Tell us a little more..."></textarea><button class="primary-btn" type="button" id="sendSupport">Send message</button><details><summary>Send a suggestion instead</summary><textarea id="suggestionInput" class="form-control mt-2" rows="3" maxlength="1000" placeholder="What would make COOKED? better?"></textarea><button class="link-btn mt-2" type="button" id="sendSuggestion">Send suggestion →</button></details></article>` : ''}
    </section>
  `
}

function tabLabel(tab) {
  return {
    HOME: 'Home',
    GOALS: 'Goals',
    HISTORY: 'History',
    NEW_TODAY: 'Today',
    KNOW_THE_CON: 'Law',
    SETTINGS: 'Settings',
  }[tab]
}

function tabIcon(tab) {
  return {
    HOME: '⌂',
    GOALS: '◎',
    HISTORY: '◷',
    NEW_TODAY: '✦',
    KNOW_THE_CON: '⚖',
    SETTINGS: '⚙',
  }[tab]
}

function renderBottomNav() {
  return `
    <nav class="bottom-nav card" aria-label="Primary navigation">
      ${TABS.filter((tab) => tab !== 'SETTINGS').map(
        (tab) => `
          <button class="tab-btn ${state.activeTab === tab ? 'active' : ''}" data-tab="${tab}">
            <span aria-hidden="true">${tabIcon(tab)}</span>
            <small>${tabLabel(tab)}</small>
          </button>
        `,
      ).join('')}
    </nav>
  `
}

function renderMilestones(tab) {
  const milestones = (state.milestones[tab] || []).map((item) =>
    typeof item === 'string'
      ? { label: item, progress: 'Not started', earned: false }
      : { label: item.label, progress: item.progress || 'Not started', earned: Boolean(item.earned) },
  )
  if (!milestones.length) return ''
  const earnedCount = milestones.filter((milestone) => milestone.earned).length
  return `
    <details class="milestones card">
      <summary>
        <span>Milestones</span>
        <span class="milestone-count">${earnedCount} / ${milestones.length}</span>
      </summary>
      <div class="milestone-list">
        ${milestones
          .map(
            (milestone) => `
              <div class="milestone-row ${milestone.earned ? 'earned' : 'locked'}">
                <span class="milestone-state" aria-hidden="true">${milestone.earned ? '✓' : '○'}</span>
                <span class="milestone-label">${milestone.label}</span>
                <span class="milestone-progress">${milestone.progress}</span>
              </div>
            `,
          )
          .join('')}
      </div>
    </details>
  `
}


function renderActiveTab() {
  if (state.activeQuestId) return renderQuestDetail()

  if (state.activeTab === 'GOALS') return renderGoalsTab()
  if (state.activeTab === 'HISTORY') return renderHistoryTab()
  if (state.activeTab === 'NEW_TODAY') return renderNewTodayTab()
  if (state.activeTab === 'KNOW_THE_CON') return renderKnowTheConTab()
  if (state.activeTab === 'SETTINGS') return renderSettingsTab()
  return renderHomeTab()
}

function render() {
  if (questReadTimer) {
    clearTimeout(questReadTimer)
    questReadTimer = null
  }
  app.innerHTML = `
    <div class="app-shell" data-active-tab="${state.activeTab}">
      ${renderTopHeader()}
      ${renderNotificationsPanel()}
      <main class="mobile-surface tab-view">${renderActiveTab()}${renderMilestones(state.activeTab)}</main>
      ${renderFloatingAvatar()}
      ${renderBottomNav()}
      ${state.xpToast ? `<div class="xp-toast">${state.xpToast}</div>` : ''}
    </div>
  `

  bindEvents()
}

function bindEvents() {
  document.querySelectorAll('[data-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      state.activeTab = button.dataset.tab
      state.settingsMenuOpen = false
      if (state.activeTab !== 'HOME') state.activeQuestId = null
      render()
    })
  })

  const openProfile = document.querySelector('[data-open-profile]')
  if (openProfile) {
    openProfile.addEventListener('click', () => {
      state.activeTab = 'SETTINGS'
      state.settingsSection = 'profile'
      state.activeQuestId = null
      render()
    })
  }

  const shirtPicker = document.querySelector('[data-avatar-shirt]')
  if (shirtPicker) shirtPicker.addEventListener('change', () => persistAvatar({ shirt: shirtPicker.value }))

  document.querySelectorAll('[data-avatar-hair]').forEach((button) => {
    button.addEventListener('click', () => persistAvatar({ hair: button.dataset.avatarHair }))
  })

  document.querySelectorAll('[data-avatar-skin]').forEach((button) => {
    button.addEventListener('click', () => persistAvatar({ skin: button.dataset.avatarSkin }))
  })

  const settingsToggle = document.querySelector('[data-settings-toggle]')
  if (settingsToggle) {
    settingsToggle.addEventListener('click', () => {
      state.settingsMenuOpen = !state.settingsMenuOpen
      render()
    })
  }

  document.querySelectorAll('[data-settings-section]').forEach((button) => {
    button.addEventListener('click', () => {
      state.settingsSection = button.dataset.settingsSection
      state.activeTab = 'SETTINGS'
      state.activeQuestId = null
      state.settingsMenuOpen = false
      render()
    })
  })

  const goalsForm = document.querySelector('#goalsSetup')
  if (goalsForm) {
    goalsForm.querySelectorAll('input[name="exam"]').forEach((input) => input.addEventListener('change', () => {
      document.querySelector('#goalTargetFields').innerHTML = renderGoalTargetFields(input.value)
    }))
    goalsForm.addEventListener('submit', async (event) => {
      event.preventDefault()
      const form = new FormData(goalsForm)
      const exam = form.get('exam')
      const targets = Object.fromEntries(goalSubjects(exam).map((subject) => [subject.key, Math.max(0, Number(form.get(subject.key)) || 0)]))
      const note = String(form.get('note') || '').trim()
      if (!Object.values(targets).some((value) => value > 0) && !note) {
        state.xpToast = 'Add a target or write a note'
        render()
        return
      }
      try {
        applyProfile(await saveGoals({ exam, targets, note }))
        render()
      } catch {
        state.xpToast = 'Could not save goals'
        render()
      }
    })
  }

  document.querySelectorAll('[data-goal-step]').forEach((button) => button.addEventListener('click', async () => {
    const key = button.dataset.goalStep
    const nextProgress = { ...(state.goals.progress || {}) }
    nextProgress[key] = Math.max(0, (nextProgress[key] || 0) + Number(button.dataset.goalChange))
    try {
      applyProfile(await updateGoalProgress(nextProgress))
      render()
    } catch {
      state.xpToast = 'Could not update progress'
      render()
    }
  }))

  const goalNoteForm = document.querySelector('#goalNoteForm')
  if (goalNoteForm) goalNoteForm.addEventListener('submit', async (event) => {
    event.preventDefault()
    const note = String(new FormData(goalNoteForm).get('note') || '').trim()
    try {
      applyProfile(await saveGoals({ exam: state.goals.exam || 'JEE', targets: state.goals.targets || {}, note }))
      render()
    } catch {
      state.xpToast = 'Could not save note'
      render()
    }
  })

  const editGoalsButton = document.querySelector('[data-edit-goals]')
  if (editGoalsButton) editGoalsButton.addEventListener('click', () => {
    state.goals = null
    render()
  })

  document.querySelectorAll('[data-quest]').forEach((node) => {
    node.addEventListener('click', () => openQuest(node.dataset.quest))
  })

  document.querySelectorAll('[data-open-quest]').forEach((button) => {
    button.addEventListener('click', () => openQuest(button.dataset.openQuest))
  })

  document.querySelectorAll('[data-complete-quest]').forEach((button) => {
    button.addEventListener('click', () => markQuestCompleted(button.dataset.completeQuest))
  })

  const readingQuest = document.querySelector('[data-auto-complete-quest]')
  if (readingQuest && questById(readingQuest.dataset.autoCompleteQuest)?.status !== 'completed') {
    const seconds = Number(readingQuest.dataset.readSeconds)
    questReadTimer = window.setTimeout(() => markQuestCompleted(readingQuest.dataset.autoCompleteQuest), seconds * 1000)
  }

  document.querySelectorAll('[data-attendance-status]').forEach((button) => {
    button.addEventListener('click', () => markTodayAttendance(button.dataset.attendanceStatus))
  })

  const attendanceDate = document.querySelector('#attendanceDate')
  if (attendanceDate) attendanceDate.addEventListener('change', () => {
    state.attendanceDate = attendanceDate.value
    state.attendanceMonth = attendanceDate.value.slice(0, 7)
    render()
  })
  const attendanceMonth = document.querySelector('#attendanceMonth')
  if (attendanceMonth) attendanceMonth.addEventListener('change', () => {
    state.attendanceMonth = attendanceMonth.value
    state.attendanceDate = `${attendanceMonth.value}-${String(new Date(`${attendanceMonth.value}-01T00:00:00`).getDate()).padStart(2, '0')}`
    render()
  })

  const claimButton = document.querySelector('[data-claim-daily]')
  if (claimButton) {
    claimButton.addEventListener('click', claimDailyChallenge)
  }

  const backButton = document.querySelector('[data-back-home]')
  if (backButton) {
    backButton.addEventListener('click', () => {
      state.activeQuestId = null
      render()
    })
  }

  const suggestionButton = document.querySelector('#sendSuggestion')
  if (suggestionButton) {
    suggestionButton.addEventListener('click', async () => {
      const message = document.querySelector('#suggestionInput')?.value?.trim()
      if (!message) {
        state.xpToast = 'Write a suggestion first'
        render()
        return
      }
      try {
        await submitSuggestion(message)
        const field = document.querySelector('#suggestionInput')
        if (field) field.value = ''
        state.xpToast = 'Suggestion sent. Thank you!'
      } catch {
        state.xpToast = 'Suggestion could not be sent.'
      }
      render()
    })
  }

  const sendSupport = document.querySelector('#sendSupport')
  if (sendSupport) {
    sendSupport.addEventListener('click', async () => {
      const subject = document.querySelector('#supportSubject')?.value?.trim() || 'General'
      const message = document.querySelector('#supportMessage')?.value?.trim()
      if (!message) {
        state.xpToast = 'Write a short message first'
        render()
        return
      }
      try {
        await submitSupportRequest({ subject, message })
        const subjectField = document.querySelector('#supportSubject')
        const messageField = document.querySelector('#supportMessage')
        if (subjectField) subjectField.value = ''
        if (messageField) messageField.value = ''
        state.xpToast = 'Support request sent.'
      } catch {
        state.xpToast = 'Could not send support request.'
      }
      render()
    })
  }

  const editProfile = document.querySelector('[data-edit-profile]')
  if (editProfile) {
    editProfile.addEventListener('click', async () => {
      const name = window.prompt('Your display name', state.user.name)
      const clean = (name || '').trim()
      if (!clean) return
      try {
        applyProfile(await saveProfile(clean))
        state.xpToast = 'Profile updated.'
      } catch {
        state.xpToast = 'Could not save profile.'
      }
      render()
    })
  }

  const themeToggle = document.querySelector('[data-theme-toggle]')
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'
      document.documentElement.dataset.theme = next
      localStorage.setItem('cooked-theme', next)
      render()
    })
  }

  document.querySelectorAll('[data-set-theme]').forEach((button) => {
    button.addEventListener('click', () => {
      const next = button.dataset.setTheme
      document.documentElement.dataset.theme = next
      localStorage.setItem('cooked-theme', next)
      render()
    })
  })

  const notifToggle = document.querySelector('[data-notifications-toggle]')
  if (notifToggle) {
    notifToggle.addEventListener('click', () => {
      const enabled = localStorage.getItem('cooked-notifications') !== 'off'
      localStorage.setItem('cooked-notifications', enabled ? 'off' : 'on')
      state.xpToast = enabled ? 'Notifications disabled on this device.' : 'Notifications enabled on this device.'
      render()
    })
  }

  const openNotifications = document.querySelector('[data-open-notifications]')
  if (openNotifications) openNotifications.addEventListener('click', () => {
    state.notificationsOpen = !state.notificationsOpen
    render()
  })
  const closeNotifications = document.querySelector('[data-close-notifications]')
  if (closeNotifications) closeNotifications.addEventListener('click', () => {
    state.notificationsOpen = false
    render()
  })

  const privacyBtn = document.querySelector('[data-privacy]')
  if (privacyBtn) {
    privacyBtn.addEventListener('click', () => {
      state.xpToast = 'Your goals & attendance stay on this device / your own server. No account needed.'
      render()
    })
  }

  bindDraggableAvatar()
}

function bindDraggableAvatar() {
  const avatar = document.querySelector('[data-draggable-avatar]')
  if (!avatar) return

  let startPointer = null
  let startPosition = null
  let startBounds = null

  avatar.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return

    startPointer = { x: event.clientX, y: event.clientY }
    startPosition = avatarPosition()
    startBounds = avatar.getBoundingClientRect()
    avatar.setPointerCapture(event.pointerId)
    avatar.classList.add('is-dragging')
    event.preventDefault()
  })

  avatar.addEventListener('pointermove', (event) => {
    if (!startPointer || !startPosition || !startBounds) return

    const x = Math.round(
      Math.min(
        window.innerWidth - startBounds.right + startPosition.x - 8,
        Math.max(-startBounds.left + startPosition.x + 8, startPosition.x + event.clientX - startPointer.x),
      ),
    )
    const y = Math.round(
      Math.min(
        window.innerHeight - startBounds.bottom + startPosition.y - 8,
        Math.max(-startBounds.top + startPosition.y + 8, startPosition.y + event.clientY - startPointer.y),
      ),
    )

    avatar.style.setProperty('--avatar-x', `${x}px`)
    avatar.style.setProperty('--avatar-y', `${y}px`)
    saveAvatarPosition({ x, y })
  })

  const finishDrag = () => {
    startPointer = null
    startPosition = null
    startBounds = null
    avatar.classList.remove('is-dragging')
  }

  avatar.addEventListener('pointerup', finishDrag)
  avatar.addEventListener('pointercancel', finishDrag)
}

async function hydrateFromApis() {
  try {
    applyProfile(await fetchBootstrap())
  } catch {
    state.xpToast = 'Could not connect to the server'
  }
}

await hydrateFromApis()
render()
