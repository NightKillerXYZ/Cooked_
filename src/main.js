import './style.css'
import { fetchAttendanceOverview } from './api/attendanceApi'
import { fetchDailyNews } from './api/newsApi'
import { fetchHistoryOfTheDay } from './api/historyApi'
import { fetchLawOfTheDay } from './api/lawApi'
import { fetchOpportunities } from './api/opportunitiesApi'
import { submitSuggestion } from './api/feedbackApi'

const app = document.querySelector('#app')

const TABS = ['HOME', 'QUESTS', 'PROGRESS', 'REWARDS', 'PROFILE']

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
  attendance: {
    overall: 86,
    status: 'Healthy',
    warning: '1 subject needs attention',
    subjects: [
      { name: 'Physics', present: 38, total: 44, status: 'Healthy' },
      { name: 'Mathematics', present: 27, total: 38, status: 'At Risk' },
      { name: 'Computer Science', present: 29, total: 34, status: 'Watch' },
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
    <header class="top-header card">
      <button class="icon-btn" aria-label="Menu">☰</button>
      <h1 class="wordmark">COOKED?</h1>
      <div class="header-right">
        <button class="icon-btn bell" aria-label="Notifications">🔔<span>2</span></button>
        <button class="avatar-btn" aria-label="Profile">🧑🏽</button>
      </div>
    </header>
  `
}

function renderGreeting() {
  return `
    <section class="greeting card">
      <div>
        <p class="muted">Good morning,</p>
        <h2>${state.user.name} 👋</h2>
        <p>Let's make today count.</p>
        <p class="rank-pill">Rank: ${currentRank()}</p>
      </div>
      <div class="character-wrap" aria-label="Student character">
        <div class="sun"></div>
        <div class="character">🧑🏽‍🎓</div>
      </div>
    </section>
  `
}

function renderLevelCard() {
  return `
    <section class="xp-card card">
      <div class="level-badge">${state.user.level}</div>
      <div class="xp-main">
        <p class="label">LEVEL ${state.user.level}</p>
        <strong>${state.user.xp.toLocaleString()} / ${state.user.levelCap.toLocaleString()} XP</strong>
        <div class="xp-progress"><span style="width:${levelProgress()}%"></span></div>
      </div>
      <div class="xp-next">
        <p>${remainingXp().toLocaleString()} XP to next level</p>
        <span>›</span>
      </div>
    </section>
  `
}

function renderJourneyCard() {
  return `
    <section class="journey card">
      <div class="journey-head">
        <h3>Today's Journey</h3>
        <p>${completedQuestsCount()} / ${state.quests.length} Completed</p>
      </div>
      <div class="quest-path">
        ${state.quests
          .map((quest, index) => {
            const meta = QUEST_META[quest.id]
            return `
              <div class="quest-node ${questClass(quest.status)}" data-quest="${quest.id}">
                <button class="quest-hit" ${quest.status === 'locked' ? 'disabled' : ''}>
                  <span class="quest-icon">${quest.status === 'completed' ? '✓' : meta.icon}</span>
                  <span class="quest-name">${meta.title}</span>
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
      <article class="card streak-card">
        <h3>🔥 ${state.user.streak} Day Streak</h3>
        <p>Keep it going!</p>
        <div class="streak-days">
          ${days
            .map((day, i) => `<span class="${i < 6 ? 'done' : ''}">${day}</span>`)
            .join('')}
        </div>
      </article>
      <article class="card total-xp-card">
        <h3>Total XP</h3>
        <strong>${(state.user.xp / 1000).toFixed(1)}K</strong>
        <p>+${state.user.dailyXp} XP today</p>
        <div class="trend" aria-hidden="true"></div>
      </article>
    </section>
  `
}

function renderWhatsNew() {
  const feature = state.history
  return `
    <section class="section-title-row">
      <h3>What's New</h3>
      <button class="link-btn">View All ></button>
    </section>
    <article class="card featured">
      <div class="featured-media">🚀</div>
      <div class="featured-body">
        <p class="tag">${feature.category}</p>
        <h3>${feature.title}</h3>
        <p>On July 20, 1969, humanity took its first steps on the Moon.</p>
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
      <p>Track today\'s classes and update present/absent status to keep your risk under control.</p>
      <p class="detail-meta">Overall attendance: ${state.attendance.overall}% • ${state.attendance.warning}</p>
    `
  }

  if (id === 'history') {
    content = `
      <p>${state.history.body}</p>
      <p class="detail-meta">Source: ${state.history.source}</p>
    `
  }

  if (id === 'law') {
    content = `
      <p><strong>${state.law.article}:</strong> ${state.law.title}</p>
      <p>${state.law.whatItMeans}</p>
      <p class="detail-meta">Educational content only.</p>
    `
  }

  if (id === 'opportunities') {
    content = `<ul>${state.opportunities
      .map((item) => `<li>${item.title} • Deadline ${item.deadline}</li>`)
      .join('')}</ul>`
  }

  if (id === 'dailyBrief') {
    const story = state.news[0]
    content = `
      <p><strong>${story.headline}</strong></p>
      <p>${story.summary}</p>
      <p class="detail-meta">${story.source} • ${story.date}</p>
    `
  }

  return `
    <section class="card detail-card">
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
    <section class="card momentum-card">
      <div class="momentum-head">
        <h3>⚡ ${state.dailyChallenge.title}</h3>
        <p>${completed} / ${state.dailyChallenge.goal} quests</p>
      </div>
      <p>${state.dailyChallenge.task}</p>
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
  if (state.activeQuestId) return `${renderTopHeader()}${renderQuestDetail()}`

  return `
    ${renderTopHeader()}
    ${renderGreeting()}
    ${renderLevelCard()}
    ${renderMomentumCard()}
    ${renderJourneyCard()}
    ${renderStreakAndXp()}
    ${renderWhatsNew()}
  `
}

function renderQuestsTab() {
  return `
    <section class="panel">
      <h2>Today's Quests</h2>
      <p class="muted">Complete meaningful actions to earn XP.</p>
      <div class="quest-list">
        ${state.quests
          .filter((quest) => quest.status !== 'locked')
          .map((quest) => {
            const meta = QUEST_META[quest.id]
            return `
              <article class="card quest-item ${questClass(quest.status)}">
                <div>
                  <h3>${meta.icon} ${meta.title}</h3>
                  <p>${meta.title === 'History' ? 'Learn today\'s historical event.' : 'Complete today\'s activity to make progress.'}</p>
                  <p class="detail-meta">+${meta.reward} XP</p>
                </div>
                <div class="quest-actions">
                  <button class="link-btn" data-open-quest="${quest.id}">Start Quest</button>
                  <button class="primary-btn" data-complete-quest="${quest.id}" ${quest.status === 'completed' ? 'disabled' : ''}>
                    ${quest.status === 'completed' ? '✓ Completed' : 'Mark Completed'}
                  </button>
                </div>
              </article>
            `
          })
          .join('')}
      </div>
    </section>
  `
}

function renderProgressTab() {
  return `
    <section class="panel">
      <h2>Progress</h2>
      <div class="progress-cards">
        <article class="card metric"><p>Current Level</p><strong>${state.user.level}</strong></article>
        <article class="card metric"><p>XP</p><strong>${state.user.xp.toLocaleString()}</strong></article>
        <article class="card metric"><p>XP to Next Level</p><strong>${remainingXp().toLocaleString()}</strong></article>
        <article class="card metric"><p>XP this Week</p><strong>${state.user.weeklyXp}</strong></article>
        <article class="card metric"><p>XP this Month</p><strong>${state.user.monthlyXp}</strong></article>
        <article class="card metric"><p>Current Streak</p><strong>${state.user.streak} days</strong></article>
        <article class="card metric"><p>Longest Streak</p><strong>${state.user.longestStreak} days</strong></article>
        <article class="card metric"><p>Quests Completed</p><strong>${completedQuestsCount()}</strong></article>
      </div>
      <article class="card achievement-block">
        <h3>Achievements</h3>
        <ul>${state.user.achievements.map((item) => `<li>${item}</li>`).join('')}</ul>
      </article>
    </section>
  `
}

function renderRewardsTab() {
  return `
    <section class="panel">
      <h2>Rewards</h2>
      <p class="muted">Cosmetics only. XP cannot be purchased.</p>
      <div class="rewards-grid">
        ${state.rewards
          .map(
            (item) => `
              <article class="card reward-item">
                <p class="tag">${item.type}</p>
                <h3>${item.name}</h3>
                <p>${item.cost.toLocaleString()} XP</p>
                <button class="primary-btn" ${state.user.xp < item.cost ? 'disabled' : ''}>
                  ${state.user.xp >= item.cost ? 'Unlock' : 'Keep Progressing'}
                </button>
              </article>
            `,
          )
          .join('')}
      </div>
    </section>
  `
}

function renderProfileTab() {
  return `
    <section class="panel">
      <article class="card profile-card">
        <div class="profile-hero">🧑🏽‍🎓</div>
        <div>
          <h2>${state.user.name}</h2>
          <p class="muted">Level ${state.user.level} • ${state.user.xp.toLocaleString()} XP</p>
          <p class="muted">Streak: ${state.user.streak} days • Quests: ${completedQuestsCount()}</p>
        </div>
        <button class="primary-btn">Customize Character</button>
      </article>
      <article class="card profile-achievements">
        <h3>Achievements</h3>
        <ul>${state.user.achievements.map((item) => `<li>${item}</li>`).join('')}</ul>
      </article>
      <button id="sendSuggestion" class="link-btn">Send a suggestion</button>
    </section>
  `
}

function renderActiveTab() {
  if (state.activeTab === 'HOME') return renderHomeTab()
  if (state.activeTab === 'QUESTS') return renderQuestsTab()
  if (state.activeTab === 'PROGRESS') return renderProgressTab()
  if (state.activeTab === 'REWARDS') return renderRewardsTab()
  return renderProfileTab()
}

function tabIcon(tab) {
  if (tab === 'HOME') return '🏠'
  if (tab === 'QUESTS') return '🏁'
  if (tab === 'PROGRESS') return '📊'
  if (tab === 'REWARDS') return '🎁'
  return '👤'
}

function renderBottomNav() {
  return `
    <nav class="bottom-nav card">
      ${TABS.map(
        (tab) => `
          <button class="tab-btn ${state.activeTab === tab ? 'active' : ''}" data-tab="${tab}">
            <span>${tabIcon(tab)}</span>
            <small>${tab}</small>
          </button>
        `,
      ).join('')}
    </nav>
  `
}

function render() {
  app.innerHTML = `
    <div class="app-shell">
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
      if (state.activeTab !== 'HOME') state.activeQuestId = null
      render()
    })
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

  if (attendance.status === 'fulfilled' && attendance.value?.overall) state.attendance = attendance.value
  if (news.status === 'fulfilled' && Array.isArray(news.value) && news.value.length) state.news = news.value
  if (history.status === 'fulfilled' && history.value?.title) state.history = history.value
  if (law.status === 'fulfilled' && law.value?.title) state.law = law.value
  if (opportunities.status === 'fulfilled' && Array.isArray(opportunities.value) && opportunities.value.length) {
    state.opportunities = opportunities.value
  }
}

await hydrateFromApis()
render()
