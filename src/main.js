import 'bootstrap/dist/css/bootstrap.min.css'
import './bootstrap-studio.css'
import './bootstrap-studio.js'
import './style.css'
import { fetchAttendanceOverview } from './api/attendanceApi'
import { fetchDailyNews } from './api/newsApi'
import { fetchHistoryOfTheDay } from './api/historyApi'
import { fetchLawOfTheDay } from './api/lawApi'
import { fetchOpportunities } from './api/opportunitiesApi'
import { submitSuggestion } from './api/feedbackApi'

const app = document.querySelector('#app')

const TABS = ['HOME', 'HISTORY', 'NEW_TODAY', 'KNOW_THE_CON', 'MORE']

const QUEST_META = {
  attendance: { title: 'Attendance', icon: '🗓️', reward: 10 },
  history: { title: 'History', icon: '📖', reward: 30 },
  law: { title: 'Law', icon: '⚖️', reward: 30 },
  opportunities: { title: 'Opportunities', icon: '🏆', reward: 20 },
  dailyBrief: { title: 'Daily Brief', icon: '📰', reward: 20 },
  surprise: { title: 'Surprise', icon: '🔒', reward: 0, locked: true },
}

const state = {
  user: {
    name: 'Shorya',
    streak: 7,
    longestStreak: 12,
    level: 12,
    xp: 2840,
    levelCap: 3000,
    dailyXp: 120,
    weeklyXp: 440,
    monthlyXp: 1780,
    achievements: ['Consistency Starter', 'Law Explorer', 'Early Bird'],
  },
  activeTab: 'HOME',
  activeQuestId: null,
  xpToast: '',
  mobileMenuOpen: false,
  attendance: {
    schoolName: 'School Attendance',
    mode: 'calendar',
    selectedDate: '2026-08-13',
    anonymous: {
      presentDays: 72,
      totalDays: 96,
      targetPercent: 75,
    },
    records: [
      { date: '2026-08-01', status: 'present' },
      { date: '2026-08-02', status: 'present' },
      { date: '2026-08-03', status: 'absent' },
      { date: '2026-08-04', status: 'present' },
      { date: '2026-08-05', status: 'present' },
      { date: '2026-08-08', status: 'present' },
      { date: '2026-08-09', status: 'absent' },
      { date: '2026-08-10', status: 'present' },
    ],
  },
  history: {
    title: 'Apollo 11: A Giant Leap',
    period: 'July 20, 1969',
    category: 'History of the Day',
    body: 'Apollo 11 made history when astronauts Neil Armstrong and Buzz Aldrin landed on the Moon while Michael Collins orbited above. The mission showed that massive scientific projects become possible when research, engineering, and disciplined teamwork align. Its influence extended far beyond spaceflight, accelerating advances in computing, communications, and materials used in daily life. The mission still inspires today\'s student projects and modern lunar programs.',
    source: 'NASA Apollo Archive',
  },
  law: {
    article: 'Article 14',
    title: 'Equality before law',
    whatItMeans: 'Everyone receives equal protection of the laws and is treated fairly under the same legal framework.',
    whyItMatters: 'It protects students and citizens from unfair or arbitrary treatment.',
    example: 'If two students face the same rule violation, both should be evaluated by the same process.',
    qualification: 'Reasonable classification is allowed when there is a legitimate objective.',
    source: 'Constitution of India, Article 14',
  },
  opportunities: [
    { title: 'ISRO Student Research Program', type: 'Internship', deadline: 'Aug 20' },
    { title: 'National Hackathon 2026', type: 'Competition', deadline: 'Aug 14' },
    { title: 'Young India Policy Fellowship', type: 'Fellowship', deadline: 'Aug 28' },
  ],
  news: [
    {
      category: 'AI & Technology',
      headline: 'Open-source learning models improve student productivity tools',
      source: 'MIT Technology Review',
      date: 'Today',
      summary: 'Smaller models are making personalized learning assistants faster and more affordable.',
      whyItMatters: 'Students can use practical AI tools even on low-end devices.',
      url: '#',
    },
  ],
  rewards: [
    { name: 'Explorer Hoodie', cost: 3000, type: 'Outfit' },
    { name: 'City Sunset Background', cost: 2200, type: 'Background' },
    { name: 'Trailblazer Backpack', cost: 2600, type: 'Accessory' },
    { name: 'Aero Glasses', cost: 1800, type: 'Accessory' },
  ],
  quests: [
    { id: 'attendance', status: 'completed' },
    { id: 'history', status: 'active' },
    { id: 'law', status: 'completed' },
    { id: 'opportunities', status: 'completed' },
    { id: 'dailyBrief', status: 'completed' },
    { id: 'surprise', status: 'locked' },
  ],
  dailyChallenge: {
    title: 'Daily Sprint',
    task: 'Complete any 2 quests today',
    reward: 80,
    goal: 2,
    claimed: false,
  },
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

function attendanceRecords() {
  const today = todayInfo()
  const records = state.attendance.records.filter((record) => record.day !== today.day)
  if (state.attendance.todayStatus) {
    records.push({ day: today.day, status: state.attendance.todayStatus })
  }
  return records
}

function attendanceOverall() {
  const records = attendanceRecords()
  if (!records.length) return 0
  const present = records.filter((record) => record.status === 'present').length
  return Math.round((present / records.length) * 100)
}

function markTodayAttendance(status) {
  state.attendance.todayStatus = status
  render()
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

function markQuestCompleted(id) {
  const quest = questById(id)
  const meta = QUEST_META[id]

  if (!quest || !meta || quest.status === 'completed' || quest.status === 'locked') return

  quest.status = 'completed'
  state.user.xp += meta.reward
  state.user.dailyXp += meta.reward
  state.user.weeklyXp += meta.reward
  state.user.monthlyXp += meta.reward
  state.xpToast = `+${meta.reward} XP`

  while (state.user.xp >= state.user.levelCap) {
    state.user.level += 1
    state.user.levelCap += 1000
  }

  render()

  setTimeout(() => {
    state.xpToast = ''
    render()
  }, 1200)
}

function claimDailyChallenge() {
  const completed = completedUnlockedQuestsCount()
  if (state.dailyChallenge.claimed || completed < state.dailyChallenge.goal) return

  state.dailyChallenge.claimed = true
  state.user.xp += state.dailyChallenge.reward
  state.user.dailyXp += state.dailyChallenge.reward
  state.user.weeklyXp += state.dailyChallenge.reward
  state.user.monthlyXp += state.dailyChallenge.reward
  state.xpToast = `+${state.dailyChallenge.reward} XP Daily Bonus`

  while (state.user.xp >= state.user.levelCap) {
    state.user.level += 1
    state.user.levelCap += 1000
  }

  render()

  setTimeout(() => {
    state.xpToast = ''
    render()
  }, 1200)
}

function openQuest(id) {
  const quest = questById(id)
  if (!quest || quest.status === 'locked') return
  state.activeQuestId = id
  state.activeTab = 'HOME'
  render()
}

function renderTopHeader() {
  return `
    <header class="app-header d-flex align-items-center justify-content-between">
      <div class="d-flex align-items-center gap-3">
        <button class="icon-btn d-lg-none" aria-label="Menu" data-toggle-mobile-menu>☰</button>
        <div class="app-brand">
          <h1 class="wordmark m-0">COOKED?</h1>
        </div>
      </div>
      
      <nav class="app-nav d-none d-lg-flex align-items-center gap-4">
        <button class="nav-link ${state.activeTab === 'HOME' ? 'active' : ''}" data-tab="HOME">Home</button>
        <button class="nav-link ${state.activeTab === 'HISTORY' ? 'active' : ''}" data-tab="HISTORY">History</button>
        <button class="nav-link ${state.activeTab === 'NEW_TODAY' ? 'active' : ''}" data-tab="NEW_TODAY">New Today</button>
        <button class="nav-link ${state.activeTab === 'KNOW_THE_CON' ? 'active' : ''}" data-tab="KNOW_THE_CON">Know the Con</button>
        <button class="nav-link ${state.activeTab === 'MORE' ? 'active' : ''}" data-tab="MORE">More</button>
      </nav>
      
      <div class="app-actions d-flex align-items-center gap-2">
        <button class="icon-btn bell position-relative" aria-label="Notifications">🔔<span class="position-absolute top-0 end-0">2</span></button>
        <button class="avatar-btn rounded-circle" aria-label="Profile">🧑🏽</button>
      </div>
    </header>
    
    <!-- Mobile Navigation Menu -->
    <nav class="mobile-nav d-lg-none ${state.mobileMenuOpen ? 'open' : ''}">
      <button class="nav-link ${state.activeTab === 'HOME' ? 'active' : ''}" data-tab="HOME">Home</button>
      <button class="nav-link ${state.activeTab === 'HISTORY' ? 'active' : ''}" data-tab="HISTORY">History</button>
      <button class="nav-link ${state.activeTab === 'NEW_TODAY' ? 'active' : ''}" data-tab="NEW_TODAY">New Today</button>
      <button class="nav-link ${state.activeTab === 'KNOW_THE_CON' ? 'active' : ''}" data-tab="KNOW_THE_CON">Know the Con</button>
      <button class="nav-link ${state.activeTab === 'MORE' ? 'active' : ''}" data-tab="MORE">More</button>
    </nav>
  `
}

function renderGreeting() {
  return `
    <section class="greeting card p-4">
      <div class="row align-items-center">
        <div class="col-12 col-lg-7">
          <p class="muted mb-1">Good morning,</p>
          <h2 class="mb-1">${state.user.name} 👋</h2>
          <p class="mb-2">Let's make today count.</p>
          <p class="rank-pill mb-0">Rank: ${currentRank()}</p>
        </div>
        <div class="col-12 col-lg-5 d-flex justify-content-lg-end justify-content-center mt-3 mt-lg-0">
          <div class="character-wrap position-relative overflow-hidden" aria-label="Student character">
            <div class="sun"></div>
            <div class="character">🧑🏽‍🎓</div>
          </div>
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
                  <span class="quest-xp">${quest.status === 'completed' ? `+${meta.reward} XP earned` : `+${meta.reward} XP`}</span>
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
      <p>${state.history.body}</p>
      <p class="detail-meta text-muted small">Source: ${state.history.source}</p>
    `
  }

  if (id === 'law') {
    content = `
      <p><strong>${state.law.article}:</strong> ${state.law.title}</p>
      <p>${state.law.whatItMeans}</p>
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
      <p><strong>${story.headline}</strong></p>
      <p>${story.summary}</p>
      <p class="detail-meta text-muted small">${story.source} • ${story.date}</p>
    `
  }

  return `
    <section class="card detail-card p-3 d-flex flex-column gap-3 mt-2">
      <button class="link-btn" data-back-home>← Back to Home</button>
      <h3>${meta.icon} ${meta.title}</h3>
      ${content}
      <button class="primary-btn" data-complete-quest="${id}" ${quest.status === 'completed' ? 'disabled' : ''}>
        ${quest.status === 'completed' ? '✓ Completed' : `Complete quest +${meta.reward} XP`}
      </button>
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
  `
}

function renderAttendanceCard() {
  const today = todayInfo()
  const overall = attendanceOverall()
  const records = attendanceRecords()
  const recordMap = new Map(records.map((record) => [record.day, record.status]))
  const monthIndex = new Date().getMonth()
  const totalDays = new Date(today.year, monthIndex + 1, 0).getDate()
  const calendarDays = Array.from({ length: totalDays }, (_, index) => index + 1)
  const presentCount = records.filter((record) => record.status === 'present').length
  const absentCount = records.filter((record) => record.status === 'absent').length
  const todayLabel = state.attendance.todayStatus
    ? state.attendance.todayStatus === 'present'
      ? 'Marked Present'
      : 'Marked Absent'
    : 'Not marked yet'

  return `
    <section class="card attendance-card p-3">
      <div class="attendance-head">
        <div>
          <p class="tag mb-2">School</p>
          <h3 class="m-0">Attendance</h3>
          <p class="text-muted mb-0">${today.weekday}, ${today.month} ${today.day}, ${today.year}</p>
        </div>
        <div class="attendance-score">
          <strong>${overall}%</strong>
          <span>Overall</span>
        </div>
      </div>

      <div class="today-attendance">
        <div>
          <p class="text-muted mb-1">Today</p>
          <h4 class="m-0">${todayLabel}</h4>
        </div>
        <div class="attendance-actions">
          <button class="attendance-choice present ${state.attendance.todayStatus === 'present' ? 'active' : ''}" data-attendance-status="present">Present</button>
          <button class="attendance-choice absent ${state.attendance.todayStatus === 'absent' ? 'active' : ''}" data-attendance-status="absent">Absent</button>
        </div>
      </div>

      <div class="mini-calendar" aria-label="${today.month} attendance calendar">
        <div class="calendar-title">
          <strong>${today.month}</strong>
          <span>${presentCount} present / ${absentCount} absent</span>
        </div>
        <div class="calendar-weekdays">
          ${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day) => `<span>${day}</span>`).join('')}
        </div>
        <div class="calendar-grid">
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

function renderLegacyAttendanceCard() {
  return `
    <section class="card p-3">
      <div class="d-flex justify-content-between align-items-center gap-2 mb-3">
        <h3 class="m-0">🗓️ Attendance</h3>
        <p class="m-0 text-muted">Overall: ${state.attendance.overall}%</p>
      </div>
      <div class="attendance-progress mb-3">
        <div class="progress" style="height: 10px;">
          <div class="progress-bar" style="width: ${state.attendance.overall}%; background: var(--primary);"></div>
        </div>
        <p class="detail-meta text-muted small mt-2">${state.attendance.warning}</p>
      </div>
      <div class="subjects-list d-grid gap-2">
        ${state.attendance.subjects.map(subject => `
          <article class="card p-2" style="border: 1px solid var(--border);">
            <div class="d-flex justify-content-between align-items-center gap-2">
              <div>
                <h4 class="m-0 fs-6">${subject.name}</h4>
                <p class="m-0 text-muted small">${subject.present}/${subject.total} classes</p>
              </div>
              <div class="text-end">
                <strong class="${subject.status === 'Healthy' ? 'text-success' : subject.status === 'At Risk' ? 'text-danger' : 'text-warning'}">${Math.round((subject.present / subject.total) * 100)}%</strong>
                <p class="m-0 text-muted small">${subject.status}</p>
              </div>
            </div>
          </article>
        `).join('')}
      </div>
      <button class="primary-btn w-100 mt-3">Mark Today's Attendance</button>
    </section>
  `
}

function renderHistoryTab() {
  return `
    <section class="panel p-3">
      <h2>📖 History</h2>
      <p class="muted text-muted">Learn about today's historical event.</p>
      <article class="card p-3 mt-3">
        <p class="tag mb-2">${state.history.category}</p>
        <h3 class="m-0 mb-2">${state.history.title}</h3>
        <p class="text-muted mb-2">${state.history.period}</p>
        <p class="mb-3">${state.history.body}</p>
        <p class="detail-meta text-muted small">Source: ${state.history.source}</p>
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
        `).join('')}
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
        `).join('')}
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
        <h3 class="m-0 mb-2">${state.law.article}: ${state.law.title}</h3>
        <div class="law-content d-grid gap-3 mt-3">
          <div>
            <h4 class="fs-5 mb-1">What it means</h4>
            <p class="text-muted">${state.law.whatItMeans}</p>
          </div>
          <div>
            <h4 class="fs-5 mb-1">Why it matters</h4>
            <p class="text-muted">${state.law.whyItMatters}</p>
          </div>
          <div>
            <h4 class="fs-5 mb-1">Example</h4>
            <p class="text-muted">${state.law.example}</p>
          </div>
          <div>
            <h4 class="fs-5 mb-1">Qualification</h4>
            <p class="text-muted">${state.law.qualification}</p>
          </div>
        </div>
        <p class="detail-meta text-muted small mt-3">Source: ${state.law.source}</p>
      </article>
    </section>
  `
}

function renderMoreTab() {
  return `
    <section class="panel p-3">
      <h2>☰ More</h2>
      <p class="muted text-muted">Account settings and preferences.</p>
      
      <article class="card p-3 mt-3 d-grid gap-3">
        <div class="d-flex align-items-center gap-3">
          <div class="profile-hero" style="width: 60px; height: 60px; font-size: 30px;">🧑🏽‍🎓</div>
          <div>
            <h3 class="m-0">${state.user.name}</h3>
            <p class="text-muted m-0">Level ${state.user.level} • ${state.user.xp.toLocaleString()} XP</p>
          </div>
        </div>
        
        <div class="d-grid gap-2 mt-2">
          <button class="link-btn text-start p-2">Edit Profile</button>
          <button class="link-btn text-start p-2">Change Theme</button>
          <button class="link-btn text-start p-2">Notifications</button>
          <button class="link-btn text-start p-2">Privacy Settings</button>
          <button class="link-btn text-start p-2">Help & Support</button>
          <button class="link-btn text-start p-2">About COOKED?</button>
        </div>
        
        <div class="mt-3 pt-3" style="border-top: 1px solid var(--border);">
          <h4 class="fs-5 mb-2">Description</h4>
          <p class="text-muted small">COOKED? is your gamified student companion. Track attendance, learn history, understand law, and discover opportunities - all while earning XP and leveling up your character.</p>
        </div>
        
        <button class="primary-btn mt-2">Sign Out</button>
      </article>
    </section>
  `
}

function renderActiveTab() {
  if (state.activeTab === 'HOME') return renderHomeTab()
  if (state.activeTab === 'HISTORY') return renderHistoryTab()
  if (state.activeTab === 'NEW_TODAY') return renderNewTodayTab()
  if (state.activeTab === 'KNOW_THE_CON') return renderKnowTheConTab()
  return renderMoreTab()
}

function tabIcon(tab) {
  if (tab === 'HOME') return '🏠'
  if (tab === 'HISTORY') return '📖'
  if (tab === 'NEW_TODAY') return '📰'
  if (tab === 'KNOW_THE_CON') return '⚖️'
  return '☰'
}

function tabLabel(tab) {
  if (tab === 'HOME') return 'Home'
  if (tab === 'HISTORY') return 'History'
  if (tab === 'NEW_TODAY') return 'New Today'
  if (tab === 'KNOW_THE_CON') return 'Know the Con'
  return 'More'
}

function renderBottomNav() {
  return `
    <nav class="bottom-nav card">
      ${TABS.map(
        (tab) => `
          <button class="tab-btn ${state.activeTab === tab ? 'active' : ''}" data-tab="${tab}">
            <span>${tabIcon(tab)}</span>
            <small>${tabLabel(tab)}</small>
          </button>
        `,
      ).join('')}
    </nav>
  `
}

function render() {
  app.innerHTML = `
    <div class="app-shell">
      ${renderTopHeader()}
      <main class="mobile-surface">${renderActiveTab()}</main>
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
      state.mobileMenuOpen = false
      if (state.activeTab !== 'HOME') state.activeQuestId = null
      render()
    })
  })

  const mobileMenuToggle = document.querySelector('[data-toggle-mobile-menu]')
  if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', () => {
      state.mobileMenuOpen = !state.mobileMenuOpen
      render()
    })
  }

  document.querySelectorAll('[data-quest]').forEach((node) => {
    node.addEventListener('click', () => openQuest(node.dataset.quest))
  })

  document.querySelectorAll('[data-open-quest]').forEach((button) => {
    button.addEventListener('click', () => openQuest(button.dataset.openQuest))
  })

  document.querySelectorAll('[data-complete-quest]').forEach((button) => {
    button.addEventListener('click', () => markQuestCompleted(button.dataset.completeQuest))
  })

  document.querySelectorAll('[data-attendance-status]').forEach((button) => {
    button.addEventListener('click', () => markTodayAttendance(button.dataset.attendanceStatus))
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
      try {
        await submitSuggestion({ message: 'Loving the gamified journey flow!' })
        alert('Suggestion sent.')
      } catch {
        alert('Configure src/api/feedbackApi.js with your endpoint first.')
      }
    })
  }
}

async function hydrateFromApis() {
  const [attendance, news, history, law, opportunities] = await Promise.allSettled([
    fetchAttendanceOverview(),
    fetchDailyNews(),
    fetchHistoryOfTheDay(),
    fetchLawOfTheDay(),
    fetchOpportunities(),
  ])

  if (attendance.status === 'fulfilled' && Array.isArray(attendance.value?.records)) state.attendance = attendance.value
  if (news.status === 'fulfilled' && Array.isArray(news.value) && news.value.length) state.news = news.value
  if (history.status === 'fulfilled' && history.value?.title) state.history = history.value
  if (law.status === 'fulfilled' && law.value?.title) state.law = law.value
  if (opportunities.status === 'fulfilled' && Array.isArray(opportunities.value) && opportunities.value.length) {
    state.opportunities = opportunities.value
  }
}

await hydrateFromApis()
render()
