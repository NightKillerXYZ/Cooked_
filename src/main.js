import './style.css'
import { fetchAttendanceOverview } from './api/attendanceApi'
import { fetchDailyNews } from './api/newsApi'
import { fetchHistoryOfTheDay } from './api/historyApi'
import { fetchLawOfTheDay } from './api/lawApi'
import { fetchOpportunities } from './api/opportunitiesApi'
import { submitSuggestion } from './api/feedbackApi'
import { submitSupportRequest } from './api/supportApi'

const app = document.querySelector('#app')

const state = {
  activeView: 'Home',
  activeLearn: 'History',
  activeMore: 'Suggestions',
  greetingName: 'Shorya',
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
  opportunities: [
    { title: 'ISRO Student Research Program', type: 'Internship', deadline: 'Aug 20' },
    { title: 'National Hackathon 2026', type: 'Competition', deadline: 'Aug 14' },
    { title: 'Young India Policy Fellowship', type: 'Fellowship', deadline: 'Aug 28' },
  ],
  history: {
    title: 'Why Apollo 11 mattered',
    period: '1969',
    category: 'Space history',
    body: 'Apollo 11 marked the first human landing on the Moon in July 1969. The mission was the result of intense Cold War competition, rapid engineering progress, and coordinated global scientific effort. It transformed space exploration from a dream into a repeatable human achievement. The landing also accelerated advances in electronics, materials, and systems engineering that later influenced everyday technology. Its legacy is still visible in modern lunar missions and long-term plans for deeper space exploration.',
    source: 'NASA Apollo 11 Mission Archive',
  },
  law: {
    article: 'Article 14',
    title: 'Equality before law',
    whatItMeans: 'Every person is treated equally in front of the law and receives equal legal protection.',
    whyItMatters: 'It protects students and citizens from arbitrary treatment by authorities and institutions.',
    example: 'Two students facing the same disciplinary rule should be evaluated by the same standard.',
    qualification: 'Reasonable classification is allowed when it has a clear and fair objective.',
    source: 'Constitution of India, Article 14',
  },
  news: [
    {
      category: 'AI & Technology',
      headline: 'Open-source models improve on-device learning tools for students',
      source: 'MIT Technology Review',
      date: 'Today',
      summary: 'New lightweight model releases are making educational assistants run faster on low-end hardware.',
      whyItMatters: 'This can make quality study tools cheaper and more accessible for students.',
      url: '#',
    },
    {
      category: 'Aerospace & Space',
      headline: 'New lunar mission planning calls for more student-built experiments',
      source: 'European Space Agency',
      date: 'Today',
      summary: 'The upcoming mission framework expands opportunities for universities to submit payload ideas.',
      whyItMatters: 'Students can access real mission pipelines earlier through university programs.',
      url: '#',
    },
    {
      category: 'Government & Civics',
      headline: 'Education policy update proposes stronger digital skills benchmarks',
      source: 'Press Information Bureau',
      date: 'Today',
      summary: 'Draft guidance recommends stronger AI, coding, and digital literacy outcomes in higher education.',
      whyItMatters: 'Curriculum priorities can affect placement readiness and competitive exams.',
      url: '#',
    },
  ],
}

const NAV_ITEMS = ['Home', 'Attendance', 'Learn', 'Opportunities', 'More']
const LEARN_ITEMS = ['History', 'Law']
const MORE_ITEMS = ['Suggestions', 'About', 'Report a Bug', 'Contact', 'Privacy', 'Version']

function getStatusClass(status) {
  const lower = status.toLowerCase()
  if (lower.includes('healthy')) return 'status healthy'
  if (lower.includes('watch')) return 'status watch'
  return 'status at-risk'
}

function attendancePercent(subject) {
  return ((subject.present / subject.total) * 100).toFixed(1)
}

function renderHome() {
  const journeyCards = [
    {
      key: 'Attendance',
      description: 'Know where you stand.',
      metric: `${state.attendance.overall}%`,
      meta: state.attendance.warning,
      accent: 'attendance',
    },
    {
      key: 'History',
      description: 'One thing worth knowing today.',
      metric: state.history.title,
      meta: '2 min read',
      accent: 'history',
    },
    {
      key: 'Law',
      description: 'One legal concept to understand today.',
      metric: `${state.law.article} — ${state.law.title}`,
      meta: '2 min read',
      accent: 'law',
    },
    {
      key: 'Opportunities',
      description: 'Discover things you could otherwise miss.',
      metric: `${state.opportunities.length} matches`,
      meta: `See what's available`,
      accent: 'opportunities',
    },
  ]

  return `
    <header class="page-head">
      <div>
        <h1>Good morning, ${state.greetingName} 👋</h1>
        <p>Here's what matters today.</p>
      </div>
      <div class="top-controls">
        <button class="ghost">🔔</button>
        <button class="ghost">Profile</button>
      </div>
    </header>

    <section class="section">
      <div class="section-head">
        <h2>Today's Journey</h2>
        <p>Your most useful things for today.</p>
      </div>
      <div class="journey-grid">
        ${journeyCards
          .map(
            (card) => `
              <button class="journey-card ${card.accent}" data-view="${card.key}">
                <div class="pill">${card.key}</div>
                <h3>${card.key}</h3>
                <p>${card.description}</p>
                <strong>${card.metric}</strong>
                <span>${card.meta}</span>
              </button>
            `,
          )
          .join('')}
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <h2>Your Daily Brief</h2>
        <p>News selected for your interests.</p>
      </div>
      <div class="news-grid">
        ${state.news
          .slice(0, 6)
          .map(
            (item) => `
              <article class="news-card">
                <span class="news-tag">${item.category}</span>
                <h3>${item.headline}</h3>
                <p class="meta">${item.source} • ${item.date}</p>
                <p>${item.summary}</p>
                <p><strong>Why it matters:</strong> ${item.whyItMatters}</p>
                <a href="${item.url}" target="_blank" rel="noreferrer">Read source</a>
              </article>
            `,
          )
          .join('')}
      </div>
    </section>

    <section class="section compact">
      <div class="section-head">
        <h2>Opportunities highlight</h2>
      </div>
      <div class="opportunity-strip">
        ${state.opportunities
          .map(
            (item) => `
              <article>
                <h3>${item.title}</h3>
                <p>${item.type} • Deadline ${item.deadline}</p>
              </article>
            `,
          )
          .join('')}
      </div>
    </section>
  `
}

function renderAttendance() {
  return `
    <header class="page-head simple">
      <div>
        <h1>Attendance</h1>
        <p>Know where you stand before it becomes a problem.</p>
      </div>
    </header>

    <section class="summary-card">
      <div>
        <p class="meta">Overall attendance</p>
        <h2>${state.attendance.overall}%</h2>
      </div>
      <div>
        <span class="${getStatusClass(state.attendance.status)}">${state.attendance.status}</span>
        <div class="progress"><span style="width:${state.attendance.overall}%"></span></div>
      </div>
    </section>

    <section class="section compact">
      <div class="section-head"><h2>Subjects</h2></div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Subject</th><th>Present / Total</th><th>Percentage</th><th>Status</th></tr>
          </thead>
          <tbody>
            ${state.attendance.subjects
              .map(
                (s) => `
                  <tr>
                    <td>${s.name}</td>
                    <td>${s.present} / ${s.total}</td>
                    <td>${attendancePercent(s)}%</td>
                    <td><span class="${getStatusClass(s.status)}">${s.status}</span></td>
                  </tr>
                `,
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </section>
  `
}

function renderLearn() {
  if (state.activeLearn === 'Law') {
    return `
      <header class="page-head simple"><div><h1>LAW OF THE DAY</h1></div></header>
      <section class="article-card">
        <p class="meta">${state.law.article}</p>
        <h2>${state.law.title}</h2>
        <h3>What it means</h3><p>${state.law.whatItMeans}</p>
        <h3>Why it matters</h3><p>${state.law.whyItMatters}</p>
        <h3>Real-life example</h3><p>${state.law.example}</p>
        <h3>Important qualification</h3><p>${state.law.qualification}</p>
        <h3>Source</h3><p>${state.law.source}</p>
        <p class="disclaimer">Educational content only. This is not legal advice.</p>
      </section>
    `
  }

  return `
    <header class="page-head simple"><div><h1>HISTORY OF THE DAY</h1></div></header>
    <section class="article-card">
      <p class="meta">${state.history.period} • ${state.history.category}</p>
      <h2>${state.history.title}</h2>
      <p>${state.history.body}</p>
      <div class="quiz-block">
        <h3>Quick check</h3>
        <p>Which statement best explains why Apollo 11 mattered long-term?</p>
        <ol>
          <li>It created immediate tourism on the Moon</li>
          <li>It proved complex global-scale engineering goals were achievable</li>
          <li>It ended all Cold War conflicts</li>
          <li>It replaced satellite technology</li>
        </ol>
      </div>
      <p><strong>Source:</strong> ${state.history.source}</p>
    </section>
  `
}

function renderOpportunities() {
  return `
    <header class="page-head simple">
      <div><h1>Opportunities</h1><p>Discover things you could otherwise miss.</p></div>
    </header>
    <section class="news-grid">
      ${state.opportunities
        .map(
          (item) => `
            <article class="news-card">
              <span class="news-tag">${item.type}</span>
              <h3>${item.title}</h3>
              <p class="meta">Deadline: ${item.deadline}</p>
              <p>Track this opportunity and apply on time.</p>
            </article>
          `,
        )
        .join('')}
    </section>
  `
}

function renderMore() {
  const map = {
    Suggestions: `
      <section class="article-card">
        <h2>Suggestions</h2>
        <p>Share feedback to help improve COOKED?.</p>
        <button id="sendSuggestion" class="primary">Send sample suggestion</button>
      </section>
    `,
    About: `
      <section class="article-card">
        <h2>About COOKED?</h2>
        <p>COOKED? helps students know what matters before it's too late.</p>
      </section>
    `,
    'Report a Bug': `
      <section class="article-card">
        <h2>Report a Bug</h2>
        <p>Found an issue? Send it to support with one tap.</p>
      </section>
    `,
    Contact: `
      <section class="article-card">
        <h2>Contact</h2>
        <p>Reach support for account and product help.</p>
        <button id="sendSupport" class="primary">Send sample support request</button>
      </section>
    `,
    Privacy: `
      <section class="article-card">
        <h2>Privacy</h2>
        <p>Sources are attributed, and student trust comes first.</p>
      </section>
    `,
    Version: `
      <section class="article-card">
        <h2>Version</h2>
        <p>COOKED? V1</p>
      </section>
    `,
  }

  return `<header class="page-head simple"><div><h1>More</h1></div></header>${map[state.activeMore]}`
}

function renderContent() {
  if (state.activeView === 'Home') return renderHome()
  if (state.activeView === 'Attendance') return renderAttendance()
  if (state.activeView === 'Learn') return renderLearn()
  if (state.activeView === 'Opportunities') return renderOpportunities()
  return renderMore()
}

function render() {
  app.innerHTML = `
    <div class="layout">
      <aside class="sidebar">
        <div class="brand">
          <h2>COOKED?</h2>
          <p>Your daily student companion.</p>
        </div>

        <nav class="main-nav">
          ${NAV_ITEMS.map(
            (item) => `<button class="nav-btn ${state.activeView === item ? 'active' : ''}" data-nav="${item}">${item}</button>`,
          ).join('')}
        </nav>

        ${
          state.activeView === 'Learn'
            ? `<div class="sub-nav">${LEARN_ITEMS.map(
                (item) => `<button class="sub-btn ${state.activeLearn === item ? 'active' : ''}" data-learn="${item}">${item}</button>`,
              ).join('')}</div>`
            : ''
        }

        ${
          state.activeView === 'More'
            ? `<div class="sub-nav">${MORE_ITEMS.map(
                (item) => `<button class="sub-btn ${state.activeMore === item ? 'active' : ''}" data-more="${item}">${item}</button>`,
              ).join('')}</div>`
            : ''
        }

        <footer class="profile-block">
          <div class="avatar">S</div>
          <div>
            <strong>${state.greetingName}</strong>
            <p>Student</p>
          </div>
        </footer>
      </aside>

      <main class="content">${renderContent()}</main>
    </div>
  `

  bindEvents()
}

function bindEvents() {
  document.querySelectorAll('[data-nav]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.activeView = btn.dataset.nav
      render()
    })
  })

  document.querySelectorAll('[data-learn]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.activeLearn = btn.dataset.learn
      render()
    })
  })

  document.querySelectorAll('[data-more]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.activeMore = btn.dataset.more
      render()
    })
  })

  document.querySelectorAll('[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.activeView = btn.dataset.view
      if (btn.dataset.view === 'History' || btn.dataset.view === 'Law') {
        state.activeView = 'Learn'
        state.activeLearn = btn.dataset.view
      }
      render()
    })
  })

  const suggestionButton = document.querySelector('#sendSuggestion')
  if (suggestionButton) {
    suggestionButton.addEventListener('click', async () => {
      try {
        await submitSuggestion({ message: 'Loving the clean daily briefing!' })
        alert('Suggestion sent.')
      } catch {
        alert('Configure src/api/feedbackApi.js with your endpoint first.')
      }
    })
  }

  const supportButton = document.querySelector('#sendSupport')
  if (supportButton) {
    supportButton.addEventListener('click', async () => {
      try {
        await submitSupportRequest({ message: 'Sample bug/support request.' })
        alert('Support request sent.')
      } catch {
        alert('Configure src/api/supportApi.js with your endpoint first.')
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

  if (attendance.status === 'fulfilled') state.attendance = attendance.value
  if (news.status === 'fulfilled') state.news = news.value
  if (history.status === 'fulfilled') state.history = history.value
  if (law.status === 'fulfilled') state.law = law.value
  if (opportunities.status === 'fulfilled') state.opportunities = opportunities.value
}

await hydrateFromApis()
render()
