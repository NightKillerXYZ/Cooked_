from __future__ import annotations

import json
import os
import re
import re
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from datetime import UTC, datetime, timedelta
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Lock
from typing import Any

try:
    from azure.cosmos import CosmosClient, PartitionKey, exceptions as cosmos_exceptions
except ImportError:
    CosmosClient = None
    PartitionKey = None
    cosmos_exceptions = None

# ---------------------------------------------------------------------------
# Paths & constants
# ---------------------------------------------------------------------------
ROOT_DIRECTORY = Path(__file__).resolve().parent.parent
DIST_DIRECTORY = ROOT_DIRECTORY / "dist"
DATA_FILE = ROOT_DIRECTORY / "backend" / "data" / "store.json"
CONSTITUTION_FILE = ROOT_DIRECTORY / "backend" / "data" / "constitution.json"
STORE_LOCK = Lock()
COSMOS_CONTAINER = None

QUEST_REWARDS: dict[str, int] = {
    "attendance": 10,
    "history": 30,
    "law": 30,
    "opportunities": 20,
    "dailyBrief": 20,
}

SURPRISE_REWARD: int = 50

# Milestones show progress/earned state next to each label. `metric` maps to a
# value computed from the profile (see compute_milestones) and `target` is the
# threshold. Values are tracked on a per-quest, lifetime basis.
DEFAULT_MILESTONES: dict[str, list[dict[str, Any]]] = {
    "HOME": [
        {"label": "Show up for 7 days", "metric": "streak", "target": 7},
        {"label": "Keep a 14-day streak", "metric": "streak", "target": 14},
        {"label": "Reach Level 15", "metric": "level", "target": 15},
    ],
    "HISTORY": [
        {"label": "Read your first history story", "metric": "history", "target": 1},
        {"label": "Complete 7 history quests", "metric": "history", "target": 7},
        {"label": "Become a History Scholar", "metric": "history", "target": 15},
    ],
    "NEW_TODAY": [
        {"label": "Explore today's brief", "metric": "dailyBrief", "target": 1},
        {"label": "Check the news 7 times", "metric": "dailyBrief", "target": 7},
        {"label": "Review 7 opportunities", "metric": "opportunities", "target": 7},
    ],
    "KNOW_THE_CON": [
        {"label": "Learn your first law lesson", "metric": "law", "target": 1},
        {"label": "Complete 10 law lessons", "metric": "law", "target": 10},
        {"label": "Know Your Rights badge", "metric": "law", "target": 20},
    ],
    "MORE": [
        {"label": "Consistency Starter", "metric": "streak", "target": 3},
        {"label": "Earn your first achievement", "metric": "achievements", "target": 1},
        {"label": "Reach 1000 XP", "metric": "xp", "target": 1000},
    ],
}

DEFAULT_ACHIEVEMENTS: list[dict[str, Any]] = [
    {"id": "first_quest", "label": "First Quest", "metric": "questsTotal", "target": 1},
    {"id": "all_quests_day", "label": "Full Day Champion", "metric": "allQuestsToday", "target": 1},
    {"id": "streak_3", "label": "On a Roll", "metric": "streak", "target": 3},
    {"id": "streak_7", "label": "Week Warrior", "metric": "streak", "target": 7},
    {"id": "streak_14", "label": "Fortnight Focus", "metric": "streak", "target": 14},
    {"id": "level_5", "label": "Level 5 Achiever", "metric": "level", "target": 5},
    {"id": "level_10", "label": "Level 10 Achiever", "metric": "level", "target": 10},
    {"id": "xp_1000", "label": "XP Explorer", "metric": "xp", "target": 1000},
    {"id": "law_5", "label": "Rights Scholar", "metric": "law", "target": 5},
    {"id": "history_7", "label": "Time Traveler", "metric": "history", "target": 7},
]

STUDENT_NEWS_TERMS: tuple[str, ...] = (
    "education", "student", "science", "technology", "scholarship",
    "olympiad", "research", "space", "environment", "career",
)
BLOCKED_NEWS_TERMS: tuple[str, ...] = (
    "celebrity", "gossip", "betting", "horoscope", "crime", "sports score",
)

# ---------------------------------------------------------------------------
# Curated fallback content — used when no external APIs are configured
# ---------------------------------------------------------------------------
CURATED_HISTORY: list[dict[str, str]] = [
    {
        "category": "History of the Day",
        "title": "India's First General Election Begins (1951)",
        "period": "October 25, 1951",
        "body": (
            "On this day in 1951, India conducted its first-ever general election — the largest democratic "
            "exercise in human history at the time. Over 173 million eligible voters, most of whom had never "
            "voted before, went to the polls across the country. The Election Commission of India, led by "
            "Sukumar Sen, orchestrated this massive logistical feat using paper ballots and wooden ballot boxes "
            "carried by elephants and camels to remote villages. The Indian National Congress, led by Jawaharlal "
            "Nehru, won a decisive majority with 364 of 489 seats. This election proved to the world that "
            "democracy could thrive in a newly independent, largely illiterate nation — establishing India's "
            "reputation as the world's largest democracy."
        ),
        "source": "Election Commission of India Archives",
    },
    {
        "category": "History of the Day",
        "title": "The Chipko Movement Takes Root (1973)",
        "period": "March 26, 1973",
        "body": (
            "In the Himalayan village of Mandal, Uttarakhand, villagers — led primarily by women — embraced "
            "trees to prevent loggers from felling them. This act of non-violent resistance gave birth to the "
            "Chipko Movement (meaning 'to hug' or 'to cling'). The movement was sparked when the government "
            "granted a logging company permission to cut ash trees in the region, while local communities "
            "depended on those same forests for their livelihood. Chandi Prasad Bhatt and Gaura Devi emerged "
            "as key leaders. The movement spread across India and inspired similar environmental protests "
            "worldwide, including the Chipko-inspired tree-sitting campaigns in North America. It demonstrated "
            "that grassroots action could successfully challenge industrial exploitation of natural resources."
        ),
        "source": "Environmental History Archives of India",
    },
    {
        "category": "History of the Day",
        "title": "Discovery of the Indus Valley Civilization (1921)",
        "period": "September 20, 1921",
        "body": (
            "Archaeologist Daya Ram Sahni began excavations at Harappa in present-day Pakistan, unearthing "
            "one of the world's oldest urban civilizations. The Indus Valley Civilization (c. 3300–1300 BCE) "
            "rivaled ancient Egypt and Mesopotamia in scale and sophistication. Its cities featured advanced "
            "drainage systems, standardized fired-brick construction, grid-planned streets, and public baths "
            "like the Great Bath of Mohenjo-daro. The civilization had a writing system that remains "
            "undeciphered to this day. At its peak, it spanned over 1.2 million square kilometers across "
            "modern India, Pakistan, and Afghanistan. The discovery fundamentally rewrote the history of "
            "South Asia, proving that a highly advanced urban culture existed in the region long before "
            "the arrival of the Aryans."
        ),
        "source": "Archaeological Survey of India",
    },
    {
        "category": "History of the Day",
        "title": "Mangalyaan: India Reaches Mars (2014)",
        "period": "September 24, 2014",
        "body": (
            "India's Mars Orbiter Mission (MOM), nicknamed Mangalyaan, successfully entered Mars' orbit on "
            "its very first attempt — a feat no other space agency had achieved. Launched by ISRO on a "
            "shoestring budget of approximately $74 million (less than the budget of the Hollywood film "
            "'Gravity'), the mission made India the first Asian nation to reach Mars and the fourth space "
            "agency globally to do so. The spacecraft carried five scientific instruments to study the "
            "Martian surface, atmosphere, and mineral composition. Mangalyaan's success demonstrated India's "
            "cost-effective engineering prowess and inspired a generation of students to pursue careers in "
            "space science and technology."
        ),
        "source": "ISRO Mission Archives",
    },
    {
        "category": "History of the Day",
        "title": "The Quit India Resolution (1942)",
        "period": "August 8, 1942",
        "body": (
            "At the Bombay session of the All India Congress Committee, Mahatma Gandhi delivered his iconic "
            "'Do or Die' speech, launching the Quit India Movement — a mass civil disobedience campaign "
            "demanding an end to British rule. Gandhi urged Indians to act as a free nation and refuse to "
            "cooperate with the colonial government. Within hours of the speech, Gandhi, Nehru, Patel, and "
            "other Congress leaders were arrested. Despite the leadership vacuum, spontaneous protests erupted "
            "across the country — strikes, demonstrations, and acts of sabotage. The British responded with "
            "mass arrests and violence, but the movement made it clear that British rule in India was no "
            "longer sustainable. It marked the final, decisive phase of India's freedom struggle."
        ),
        "source": "National Archives of India",
    },
    {
        "category": "History of the Day",
        "title": "APJ Abdul Kalam Becomes President (2002)",
        "period": "July 25, 2002",
        "body": (
            "Dr. APJ Abdul Kalam, India's 'Missile Man,' was sworn in as the 11th President of India. "
            "Born into a modest Tamil Muslim family in Rameswaram, Kalam rose through sheer determination "
            "to become one of India's most celebrated scientists. He played a pivotal role in India's "
            "space program (SLV-3, India's first satellite launch vehicle) and guided the development of "
            "the Agni and Prithvi missiles. As President, he became known as the 'People's President' for "
            "his accessibility and his passion for inspiring young minds. He continued teaching and "
            "interacting with students until his final moments — he collapsed while delivering a lecture "
            "at IIM Shillong in 2015. His autobiography 'Wings of Fire' remains a beloved inspiration "
            "for millions of Indian students."
        ),
        "source": "Rashtrapati Bhavan Archives",
    },
    {
        "category": "History of the Day",
        "title": "The Green Revolution Transforms India (1960s)",
        "period": "1965–1970",
        "body": (
            "Facing severe food shortages and dependence on grain imports, India launched the Green "
            "Revolution under Prime Minister Lal Bahadur Shastri and continued by Indira Gandhi. Led by "
            "agricultural scientist Dr. M.S. Swaminathan, the program introduced high-yielding varieties "
            "of wheat and rice, modern irrigation techniques, chemical fertilizers, and pesticides. Punjab, "
            "Haryana, and western Uttar Pradesh became the epicenters of this agricultural transformation. "
            "Wheat production more than tripled within a decade, and India transformed from a food-deficit "
            "nation to self-sufficiency. While the revolution had environmental costs that are debated today, "
            "it undeniably saved millions from famine and laid the foundation for India's food security."
        ),
        "source": "Indian Council of Agricultural Research",
    },
]

CURATED_LAW: list[dict[str, str]] = [
    {
        "article": "Article 14",
        "title": "Right to Equality",
        "whatItMeans": (
            "Article 14 of the Indian Constitution guarantees that the State shall not deny any person "
            "equality before the law or equal protection of the laws within the territory of India. This "
            "means every citizen — regardless of their background, wealth, religion, caste, or gender — "
            "is treated equally under the same legal system. The State cannot discriminate arbitrarily, "
            "but it can make reasonable classifications (like reservations for disadvantaged groups) if "
            "they serve a legitimate public purpose."
        ),
        "whyItMatters": (
            "Equality before law is the bedrock of democracy. Without it, laws become tools of oppression "
            "rather than instruments of justice. Article 14 ensures that a billionaire and a daily wage "
            "worker stand as equals in a courtroom. It empowers citizens to challenge discriminatory laws "
            "and government actions in court."
        ),
        "example": (
            "If a government job advertisement says 'only candidates above 6 feet tall may apply' without "
            "any reasonable connection to the job requirements, a citizen can challenge this in court under "
            "Article 14 as arbitrary discrimination."
        ),
        "qualification": "Educational explanation, not legal advice.",
        "source": "Constitution of India",
    },
    {
        "article": "Article 19(1)(a)",
        "title": "Freedom of Speech and Expression",
        "whatItMeans": (
            "Article 19(1)(a) guarantees all citizens the right to freedom of speech and expression. This "
            "includes the right to express one's views through speech, writing, printing, pictures, films, "
            "or any other medium. It also includes the right to information — the right to know about "
            "government activities. However, this right is not absolute: Article 19(2) allows the State "
            "to impose reasonable restrictions for reasons like national security, public order, decency, "
            "contempt of court, defamation, and incitement to an offense."
        ),
        "whyItMatters": (
            "Free speech is essential for democracy to function. It allows citizens to criticize the "
            "government, debate public policies, share ideas, and hold power accountable. Without free "
            "speech, democracy becomes a hollow shell. This right also protects journalists, artists, "
            "and activists who speak truth to power."
        ),
        "example": (
            "A student writing a blog post criticizing a government policy is exercising their Article "
            "19(1)(a) right. However, if the same student publishes false statements that damage someone's "
            "reputation, that could be defamation — a reasonable restriction under Article 19(2)."
        ),
        "qualification": "Educational explanation, not legal advice.",
        "source": "Constitution of India",
    },
    {
        "article": "Article 21",
        "title": "Right to Life and Personal Liberty",
        "whatItMeans": (
            "Article 21 states: 'No person shall be deprived of his life or personal liberty except "
            "according to procedure established by law.' The Supreme Court has interpreted this article "
            "expansively over the decades. It now includes the right to live with human dignity, right "
            "to livelihood, right to health, right to education, right to a clean environment, right to "
            "privacy, and the right to a speedy trial. It is one of the most litigated and evolved "
            "articles in the Constitution."
        ),
        "whyItMatters": (
            "Article 21 is the heart of the Constitution's fundamental rights. It protects every person "
            "(not just citizens) from arbitrary state action. Its expansive interpretation has given "
            "Indians rights that aren't explicitly written in the Constitution — like the right to "
            "privacy (declared a fundamental right in 2017) and the right to die with dignity (passive "
            "euthanasia legalized in 2018)."
        ),
        "example": (
            "When the Supreme Court ruled that the right to privacy is a fundamental right under Article "
            "21 (Justice K.S. Puttaswamy v. Union of India, 2017), it affected everything from Aadhaar "
            "data protection to personal choices about marriage, food, and sexual orientation."
        ),
        "qualification": "Educational explanation, not legal advice.",
        "source": "Constitution of India",
    },
    {
        "article": "Article 21A",
        "title": "Right to Education",
        "whatItMeans": (
            "Article 21A, added by the 86th Constitutional Amendment in 2002, makes education a "
            "fundamental right for children aged 6 to 14 years. The State must provide free and "
            "compulsory education to all children in this age group. The Right to Education (RTE) Act "
            "of 2009 operationalized this article, setting norms for student-teacher ratios, "
            "infrastructure, and reserving 25% of seats in private schools for disadvantaged children."
        ),
        "whyItMatters": (
            "Education is the most powerful tool for breaking the cycle of poverty. By making it a "
            "fundamental right, the Constitution ensures that every child — regardless of their family's "
            "income — has access to schooling. An educated population is also essential for a functioning "
            "democracy, as informed citizens make better electoral choices."
        ),
        "example": (
            "If a private school refuses admission to a child from a disadvantaged background despite "
            "having vacant seats under the RTE quota, the parents can file a complaint with the local "
            "education authority. The school can face penalties including cancellation of recognition."
        ),
        "qualification": "Educational explanation, not legal advice.",
        "source": "Constitution of India",
    },
    {
        "article": "Article 32",
        "title": "Right to Constitutional Remedies",
        "whatItMeans": (
            "Article 32 gives every citizen the right to directly approach the Supreme Court if their "
            "fundamental rights are violated. Dr. B.R. Ambedkar called this the 'heart and soul' of "
            "the Constitution because without a remedy, all other rights are meaningless. The Supreme "
            "Court can issue writs — habeas corpus, mandamus, prohibition, certiorari, and quo warranto "
            "— to enforce fundamental rights. Article 32 itself is a fundamental right, meaning you "
            "can approach the Supreme Court even to protect your right to approach the Supreme Court."
        ),
        "whyItMatters": (
            "Article 32 transforms the Constitution from a document of promises into a living shield "
            "for citizens. It means the highest court in the country is directly accessible to any "
            "citizen whose rights have been violated — you don't need to climb through lower courts "
            "first. This is what makes fundamental rights truly 'fundamental' and not just aspirational."
        ),
        "example": (
            "During the COVID-19 pandemic, citizens filed Article 32 petitions when migrant workers "
            "were stranded without food or transport. The Supreme Court issued directions to the "
            "government to provide relief measures, demonstrating how Article 32 can be used to "
            "address large-scale rights violations."
        ),
        "qualification": "Educational explanation, not legal advice.",
        "source": "Constitution of India",
    },
    {
        "article": "Article 15",
        "title": "Prohibition of Discrimination",
        "whatItMeans": (
            "Article 15 prohibits the State from discriminating against any citizen on grounds only "
            "of religion, race, caste, sex, place of birth, or any of them. It also prohibits "
            "discrimination in access to shops, public restaurants, hotels, and places of public "
            "entertainment. Importantly, Article 15(3) and 15(4) allow the State to make special "
            "provisions for women, children, and socially and educationally backward classes — "
            "recognizing that true equality sometimes requires differential treatment."
        ),
        "whyItMatters": (
            "India's diversity is its strength, but also a potential source of division. Article 15 "
            "ensures that the State treats all citizens with equal respect regardless of their identity. "
            "It has been used to strike down discriminatory practices like denying entry to temples "
            "based on caste (Sabarimala case) and excluding women from certain professions."
        ),
        "example": (
            "When the Indian Air Force refused to grant permanent commissions to women officers, the "
            "Supreme Court ruled in 2020 that this violated Articles 14 and 15. The court held that "
            "women officers must be granted the same career opportunities as their male counterparts."
        ),
        "qualification": "Educational explanation, not legal advice.",
        "source": "Constitution of India",
    },
    {
        "article": "Article 51A",
        "title": "Fundamental Duties",
        "whatItMeans": (
            "Article 51A lists 11 fundamental duties of every Indian citizen, added by the 42nd "
            "Amendment in 1976. These include: respecting the Constitution and national symbols, "
            "cherishing the noble ideals of the freedom struggle, protecting India's sovereignty "
            "and integrity, defending the country, promoting harmony, preserving cultural heritage, "
            "protecting the environment, developing scientific temper, safeguarding public property, "
            "and striving for excellence. While these duties are non-justiciable (cannot be enforced "
            "by courts), they serve as moral obligations for every citizen."
        ),
        "whyItMatters": (
            "Rights and duties are two sides of the same coin. You cannot demand rights while "
            "ignoring your responsibilities. Fundamental duties remind citizens that democracy "
            "requires active participation — protecting the environment, respecting diversity, "
            "and upholding constitutional values are everyone's job, not just the government's."
        ),
        "example": (
            "The duty to 'develop scientific temper, humanism, and the spirit of inquiry and reform' "
            "(Article 51A(h)) encourages citizens to question superstitions and embrace rational "
            "thinking. This duty supports India's progress as a modern, scientific nation."
        ),
        "qualification": "Educational explanation, not legal advice.",
        "source": "Constitution of India",
    },
]

CURATED_NEWS: list[dict[str, str]] = [
    {
        "headline": "ISRO Announces New Student Satellite Program for 2026",
        "summary": "ISRO has launched a nationwide program inviting college students to design and build small satellites, with the best projects getting a chance to be launched aboard PSLV missions.",
        "source": "ISRO Official",
        "date": datetime.now(UTC).date().isoformat(),
        "category": "Science",
    },
    {
        "headline": "National Education Policy Drives Surge in Multidisciplinary Courses",
        "summary": "Universities across India report a 40% increase in students opting for multidisciplinary degree combinations under the NEP 2020 framework, blending engineering with arts and commerce with science.",
        "source": "Education Ministry",
        "date": datetime.now(UTC).date().isoformat(),
        "category": "Education",
    },
    {
        "headline": "Indian Teen Wins International Science Olympiad Gold",
        "summary": "A 16-year-old from Bengaluru secured a gold medal at the International Physics Olympiad, continuing India's strong performance in global academic competitions.",
        "source": "Hindustan Times",
        "date": datetime.now(UTC).date().isoformat(),
        "category": "Education",
    },
    {
        "headline": "India's Renewable Energy Capacity Crosses 200 GW Milestone",
        "summary": "India has achieved a major milestone in its green energy transition, with solar and wind energy installations surpassing 200 gigawatts of installed capacity.",
        "source": "Ministry of New and Renewable Energy",
        "date": datetime.now(UTC).date().isoformat(),
        "category": "Environment",
    },
    {
        "headline": "New Scholarship Program Targets First-Generation College Students",
        "summary": "The government has announced a ₹500 crore scholarship fund specifically for students who are the first in their families to attend college, covering tuition and living expenses.",
        "source": "The Hindu",
        "date": datetime.now(UTC).date().isoformat(),
        "category": "Education",
    },
    {
        "headline": "Indian Researchers Develop Low-Cost Water Purification Technology",
        "summary": "A team from IIT Madras has created a graphene-based water filter that costs under ₹500 and can provide clean drinking water for a family of five for an entire year.",
        "source": "Nature India",
        "date": datetime.now(UTC).date().isoformat(),
        "category": "Technology",
    },
]

CURATED_OPPORTUNITIES: list[dict[str, str]] = [
    {
        "title": "National Science Talent Search 2026",
        "type": "Scholarship",
        "deadline": (datetime.now(UTC) + timedelta(days=30)).date().isoformat(),
    },
    {
        "title": "Young Innovators Challenge — IIT Delhi",
        "type": "Competition",
        "deadline": (datetime.now(UTC) + timedelta(days=45)).date().isoformat(),
    },
    {
        "title": "Summer Research Fellowship — IISc Bangalore",
        "type": "Fellowship",
        "deadline": (datetime.now(UTC) + timedelta(days=60)).date().isoformat(),
    },
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def load_env() -> None:
    """Load .env file into os.environ (does not override existing vars)."""
    env_file = Path(__file__).with_name(".env")
    if not env_file.exists():
        return
    for line in env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


load_env()


def today_iso() -> str:
    """Return today's date as an ISO string (YYYY-MM-DD) in UTC."""
    return datetime.now(UTC).date().isoformat()


def fresh_profile() -> dict[str, Any]:
    """Return a brand-new profile with default values."""
    return {
        "user": {
            "name": "Student",
            "streak": 0,
            "longestStreak": 0,
            "level": 1,
            "xp": 0,
            "levelCap": 1000,
            "dailyXp": 0,
            "weeklyXp": 0,
            "monthlyXp": 0,
            "achievements": [],
            "avatar": {"shirt": "#ff6b00", "skin": "#bd7a58", "hair": "classic"},
        },
        "attendance": {
            "schoolName": "School Attendance",
            "mode": "calendar",
            "records": [],
            "todayStatus": None,
        },
        "history": None,
        "law": None,
        "news": [],
        "opportunities": [],
        "quests": [
            {"id": "attendance", "status": "active", "reward": QUEST_REWARDS["attendance"]},
            {"id": "history", "status": "active", "reward": QUEST_REWARDS["history"]},
            {"id": "law", "status": "active", "reward": QUEST_REWARDS["law"]},
            {"id": "opportunities", "status": "active", "reward": QUEST_REWARDS["opportunities"]},
            {"id": "dailyBrief", "status": "active", "reward": QUEST_REWARDS["dailyBrief"]},
            {"id": "surprise", "status": "locked", "reward": 0},
        ],
        "dailyChallenge": {
            "title": "Daily Sprint",
            "task": "Complete any 2 quests today",
            "reward": 80,
            "goal": 2,
            "claimed": False,
        },
        "goals": None,
        "notifications": [],
        "stats": {"quests": {}, "attendancePresent": 0, "attendanceAbsent": 0},
        "milestones": {group: [dict(m) for m in entries] for group, entries in DEFAULT_MILESTONES.items()},
    }


def load_store() -> dict[str, Any]:
    """Load the persistent store from disk, or create a fresh one."""
    container = get_cosmos_container()
    if container is not None:
        try:
            item = container.read_item(item="app-store", partition_key="app-store")
            return {key: value for key, value in item.items() if key not in {"id", "partitionKey"}}
        except cosmos_exceptions.CosmosResourceNotFoundError:
            store: dict[str, Any] = {"profile": fresh_profile(), "feedback": [], "dailyContent": {}}
            save_store(store)
            return store

    if not DATA_FILE.exists():
        store: dict[str, Any] = {"profile": fresh_profile(), "feedback": [], "dailyContent": {}}
        save_store(store)
        return store
    return json.loads(DATA_FILE.read_text(encoding="utf-8"))


def save_store(store: dict[str, Any]) -> None:
    """Persist the store to disk atomically."""
    container = get_cosmos_container()
    if container is not None:
        container.upsert_item({"id": "app-store", "partitionKey": "app-store", **store})
        return

    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    DATA_FILE.write_text(json.dumps(store, indent=2, ensure_ascii=False), encoding="utf-8")


def get_cosmos_container() -> Any:
    """Return the configured Cosmos container, or None for local development."""
    global COSMOS_CONTAINER
    if COSMOS_CONTAINER is not None:
        return COSMOS_CONTAINER

    endpoint = os.getenv("COSMOS_ENDPOINT", "").strip()
    key = os.getenv("COSMOS_KEY", "").strip()
    if not endpoint or not key:
        return None
    if CosmosClient is None or PartitionKey is None:
        raise RuntimeError("Install backend/requirements.txt before enabling Azure Cosmos DB.")

    client = CosmosClient(endpoint, key)
    database = client.create_database_if_not_exists(id=os.getenv("COSMOS_DATABASE_NAME", "Cooked"))
    COSMOS_CONTAINER = database.create_container_if_not_exists(
        id=os.getenv("COSMOS_CONTAINER_NAME", "app-store"),
        partition_key=PartitionKey(path="/partitionKey"),
    )
    return COSMOS_CONTAINER


def add_xp(profile: dict[str, Any], amount: int) -> None:
    """Add XP to a user profile, handling level-ups."""
    user = profile["user"]
    user["xp"] += amount
    user["dailyXp"] += amount
    user["weeklyXp"] += amount
    user["monthlyXp"] += amount
    while user["xp"] >= user["levelCap"]:
        user["level"] += 1
        user["levelCap"] += 1000


def request_json(url: str, *, headers: dict[str, str] | None = None, payload: dict[str, Any] | None = None) -> Any:
    """Make an HTTP request and parse the JSON response."""
    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    request = Request(url, data=body, headers=headers or {}, method="POST" if body else "GET")
    with urlopen(request, timeout=20) as response:
        return json.loads(response.read().decode("utf-8"))


# ---------------------------------------------------------------------------
# Daily reset logic
# ---------------------------------------------------------------------------
def reset_daily_state(profile: dict[str, Any]) -> None:
    """Reset quests, daily challenge, and daily XP for a new day."""
    # Reset quests (except 'surprise' which stays locked)
    for quest in profile["quests"]:
        if quest["id"] == "surprise":
            quest["status"] = "locked"
            quest["reward"] = 0
        else:
            quest["status"] = "active"
            quest["reward"] = QUEST_REWARDS.get(quest["id"], 0)

    # Reset daily challenge
    profile["dailyChallenge"]["claimed"] = False

    # Reset daily XP
    profile["user"]["dailyXp"] = 0

    # Daily question-goal progress starts fresh each day; targets stay in place.
    if profile.get("goals"):
        profile["goals"]["progress"] = {key: 0 for key in profile["goals"].get("targets", {})}
        profile["goals"]["date"] = today_iso()

    # Check if we need to reset weekly XP (Monday = 0 in Python's weekday())
    now = datetime.now(UTC)
    if now.weekday() == 0:  # Monday
        profile["user"]["weeklyXp"] = 0

    # Check if we need to reset monthly XP (first day of month)
    if now.day == 1:
        profile["user"]["monthlyXp"] = 0


def ensure_daily_state(store: dict[str, Any]) -> None:
    """
    Ensure the store reflects the current day:
    - Reset quests/challenge/XP if it's a new day
    - Refresh daily content (history, law, news, opportunities)
    - Update todayStatus in attendance
    """
    profile = store["profile"]
    # Supports profiles created before the Goals feature was introduced.
    profile.setdefault("goals", None)
    profile.setdefault("notifications", [])
    profile.setdefault("user", {}).setdefault("avatar", {"shirt": "#ff6b00", "skin": "#bd7a58", "hair": "classic"})
    today = today_iso()
    cached = store.get("dailyContent", {})
    last_date = cached.get("date", "")

    # Detect day change → reset daily state
    if last_date != today:
        reset_daily_state(profile)

    # Update todayStatus
    records = profile["attendance"].get("records", [])
    today_record = next((r for r in records if r["date"] == today), None)
    profile["attendance"]["todayStatus"] = today_record["status"] if today_record else None

    # Refresh daily content if needed
    if last_date != today or not (cached.get("history") or cached.get("law") or cached.get("news")):
        refresh_daily_content(store, today)

    # Always sync profile fields from dailyContent
    dc = store.get("dailyContent", {})
    profile["history"] = dc.get("history")
    profile["law"] = dc.get("law")
    profile["news"] = dc.get("news", [])
    profile["opportunities"] = dc.get("opportunities", [])

    # Keep milestone/achievement state in sync
    reconcile_gamification(profile)


RE_INLINE_HTML = re.compile(r'<[^>]+>')


def refresh_daily_content(store: dict[str, Any], today: str) -> None:
    """
    Generate and cache daily content using free/public sources:
    - History: Wikipedia "On this day" (no key), falls back to curated.
    - Law: local Constitution of India dataset (free), falls back to curated.
    - News: NewsAPI free tier if a key is set, otherwise curated.
    - Opportunities: curated, data-driven list (edit CURATED_OPPORTUNITIES).
    """
    constitution = load_constitution()
    day_index = datetime.now(UTC).timetuple().tm_yday

    history = wikipedia_onthisday_history()
    if not history:
        history = CURATED_HISTORY[day_index % len(CURATED_HISTORY)]

    law = constitution_law(constitution)
    if not law:
        law = CURATED_LAW[day_index % len(CURATED_LAW)]

    news = filtered_news_articles() or CURATED_NEWS[:3]

    store["dailyContent"] = {
        "date": today,
        "history": history,
        "law": law,
        "news": news,
        "opportunities": list(CURATED_OPPORTUNITIES),
    }


# ---------------------------------------------------------------------------
# Content sources
# ---------------------------------------------------------------------------
def load_constitution() -> list[dict[str, str]]:
    """Load constitution entries from the JSON file."""
    if not CONSTITUTION_FILE.exists():
        return []
    try:
        entries = json.loads(CONSTITUTION_FILE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return []
    return [entry for entry in entries if isinstance(entry, dict) and entry.get("article") and entry.get("text")]


def constitution_law(entries: list[dict[str, str]]) -> dict[str, str] | None:
    """Pick a constitution entry deterministically based on the day of year."""
    if not entries:
        return None
    selected = entries[datetime.now(UTC).timetuple().tm_yday % len(entries)]
    return {
        "article": str(selected["article"]),
        "title": str(selected.get("title", "Constitutional provision")),
        "whatItMeans": str(selected["text"]),
        "whyItMatters": "Understanding the Constitution helps students know how democratic rights and institutions work.",
        "example": str(selected.get("example", "Read the provision and connect it to a real civic situation.")),
        "qualification": str(selected.get("qualification", "Educational explanation, not legal advice.")),
        "source": str(selected.get("source", "Constitution of India")),
    }


def filtered_news_articles() -> list[dict[str, str]]:
    """Fetch and filter news articles from NewsAPI."""
    api_key = os.getenv("NEWS_API_KEY", "").strip()
    api_url = os.getenv("NEWS_API_URL", "https://newsapi.org/v2/everything").strip()
    if not api_key:
        return []
    query = " OR ".join(STUDENT_NEWS_TERMS)
    url = f"{api_url}?{urlencode({'q': query, 'language': 'en', 'pageSize': 40, 'sortBy': 'publishedAt', 'apiKey': api_key})}"
    try:
        payload = request_json(url)
    except Exception:
        return []

    articles: list[dict[str, str]] = []
    for article in payload.get("articles", []):
        text = f"{article.get('title', '')} {article.get('description', '')}".lower()
        if not article.get("url") or not article.get("publishedAt"):
            continue
        if not any(term in text for term in STUDENT_NEWS_TERMS) or any(term in text for term in BLOCKED_NEWS_TERMS):
            continue
        articles.append({
            "headline": str(article.get("title", "")).strip(),
            "summary": str(article.get("description", "")).strip(),
            "source": str(article.get("source", {}).get("name", "")).strip(),
            "date": str(article.get("publishedAt", ""))[:10],
            "category": "News",
        })
    return articles[:12]


def wikipedia_onthisday_history() -> dict[str, Any] | None:
    """
    Fetch today's history story from Wikipedia's free "On this day" feed.

    Uses the no-key REST endpoint and only depends on an internet connection.
    Returns None on any failure so callers can fall back to curated content
    (e.g. when offline or the endpoint is unreachable). The endpoint can be
    overridden via the HISTORY_API_URL environment variable.
    """
    template = os.getenv(
        "HISTORY_API_URL",
        "https://en.wikipedia.org/api/rest_v1/feed/onthisday/all/{month:02d}/{day:02d}",
    ).strip()
    now = datetime.now(UTC)
    url = template.format(month=now.month, day=now.day)
    try:
        payload = request_json(
            url,
            headers={"User-Agent": "CookedStudentCompanion/1.0 (educational project; local-development)"},
        )
    except Exception:
        return None

    events = list(payload.get("selected") or []) or list(payload.get("events") or [])
    for event in events:
        pages = event.get("pages") or []
        body = str(event.get("text") or "").strip()
        if not body and pages:
            body = str(pages[0].get("extract") or "").strip()
        if not body:
            continue
        # Strip any stray HTML so internet content renders as plain text.
        body = RE_INLINE_HTML.sub(" ", body)
        if not body.strip():
            continue
        page = pages[0] if pages else {}
        titles_obj = page.get("titles") or {}
        title = (
            titles_obj.get("normalized")
            or titles_obj.get("display")
            or page.get("displaytitle")
            or body[:80]
        )
        title = RE_INLINE_HTML.sub("", str(title)).strip() or body[:80]
        year = event.get("year")
        period = f"{now.strftime('%B %d')}, {year}" if year else now.strftime("%B %d")
        return {
            "category": "History of the Day",
            "title": str(title).strip(),
            "period": period,
            "body": " ".join(body.split()),
            "source": "Wikipedia — On this day",
        }
    return None


# ---------------------------------------------------------------------------
# Gamification: stats, milestones, achievements
# ---------------------------------------------------------------------------
def reconcile_gamification(profile: dict[str, Any]) -> None:
    """Migrate old profiles, refresh milestone progress, and award achievements."""
    # Backfill profiles created before milestone/stat tracking existed.
    raw_milestones = profile.get("milestones")
    if not isinstance(raw_milestones, dict) or any(
        isinstance(m, str) for group in raw_milestones.values() for m in group
    ):
        profile["milestones"] = {
            group: [dict(m) for m in entries]
            for group, entries in DEFAULT_MILESTONES.items()
        }

    stats = profile.setdefault("stats", {})
    stats.setdefault("quests", {})

    compute_milestones(profile)
    update_achievements(profile)


def _metric_values(profile: dict[str, Any]) -> dict[str, int]:
    """Compute the values used by milestones/achievements from the profile."""
    user = profile["user"]
    quests = profile.get("stats", {}).get("quests", {})
    normal = [q for q in profile["quests"] if q["id"] != "surprise"]
    return {
        "streak": int(user.get("streak", 0)),
        "level": int(user.get("level", 1)),
        "xp": int(user.get("xp", 0)),
        "achievements": len(user.get("achievements", []) or []),
        "attendance": int(quests.get("attendance", 0)),
        "history": int(quests.get("history", 0)),
        "law": int(quests.get("law", 0)),
        "opportunities": int(quests.get("opportunities", 0)),
        "dailyBrief": int(quests.get("dailyBrief", 0)),
        "questsTotal": sum(int(v) for v in quests.values()),
        "allQuestsToday": 1 if normal and all(q.get("status") == "completed" for q in normal) else 0,
    }


def compute_milestones(profile: dict[str, Any]) -> None:
    """Annotate each milestone with live progress + earned state."""
    values = _metric_values(profile)
    for group in profile.get("milestones", {}).values():
        for milestone in group:
            value = values.get(milestone.get("metric", ""), 0)
            target = max(1, int(milestone.get("target", 1) or 1))
            milestone["progress"] = f"{value}/{target}"
            milestone["earned"] = bool(value >= target)


def update_achievements(profile: dict[str, Any]) -> None:
    """Award achievements that have been earned but not yet recorded."""
    values = _metric_values(profile)
    awarded = {a.get("id") for a in profile["user"].get("achievements", [])}
    for achievement in DEFAULT_ACHIEVEMENTS:
        if achievement["id"] in awarded:
            continue
        if values.get(achievement["metric"], 0) >= int(achievement["target"]):
            profile["user"].setdefault("achievements", []).append({
                "id": achievement["id"],
                "label": achievement["label"],
                "earnedAt": datetime.now(UTC).isoformat(),
            })


# ---------------------------------------------------------------------------
# HTTP request handler
# ---------------------------------------------------------------------------
class CookedRequestHandler(BaseHTTPRequestHandler):
    """HTTP request handler for the COOKED? API."""

    # ------------------------------------------------------------------
    # CORS & static file helpers
    # ------------------------------------------------------------------
    def _set_cors_headers(self) -> None:
        """Send permissive CORS headers for development."""
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-User-Id")

    def _serve_static_file(self, filepath: Path, content_type: str) -> None:
        """Serve a static file from disk."""
        if not filepath.exists():
            self.send_json(HTTPStatus.NOT_FOUND, {"error": "File not found."})
            return
        content = filepath.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(content)))
        self._set_cors_headers()
        self.end_headers()
        self.wfile.write(content)

    # ------------------------------------------------------------------
    # Routing
    # ------------------------------------------------------------------
    def do_OPTIONS(self) -> None:
        """Handle CORS preflight requests."""
        self.send_response(HTTPStatus.NO_CONTENT)
        self._set_cors_headers()
        self.end_headers()

    def do_GET(self) -> None:
        """Route GET requests."""
        # API routes
        if self.path == "/api/bootstrap":
            self.handle_bootstrap()
            return
        if self.path == "/api/notifications":
            self.handle_notifications()
            return
        if self.path == "/api/health":
            self.send_json(HTTPStatus.OK, {"ok": True})
            return

        # Static file serving for SPA (production mode)
        if self.path == "/" or self.path == "":
            self._serve_static_file(DIST_DIRECTORY / "index.html", "text/html; charset=utf-8")
            return

        # Serve files from dist/
        file_path = DIST_DIRECTORY / self.path.lstrip("/")
        if file_path.exists() and file_path.is_file():
            content_type = self._guess_mime_type(file_path)
            self._serve_static_file(file_path, content_type)
            return

        # SPA fallback: serve index.html for any unmatched route
        self._serve_static_file(DIST_DIRECTORY / "index.html", "text/html; charset=utf-8")

    def do_PUT(self) -> None:
        """Route PUT requests."""
        if self.path == "/api/attendance/today":
            self.handle_attendance()
            return
        if self.path == "/api/attendance":
            self.handle_attendance()
            return
        if self.path == "/api/goals":
            self.handle_save_goals()
            return
        if self.path == "/api/profile":
            self.handle_save_profile()
            return
        if self.path == "/api/profile/avatar":
            self.handle_save_avatar()
            return
        self.send_json(HTTPStatus.NOT_FOUND, {"error": "Endpoint not found."})

    def do_POST(self) -> None:
        """Route POST requests."""
        if self.path.startswith("/api/quests/") and self.path.endswith("/complete"):
            quest_id = self.path.split("/")[3]
            self.handle_complete_quest(quest_id)
            return
        if self.path == "/api/daily-challenge/claim":
            self.handle_claim_daily_challenge()
            return
        if self.path == "/api/feedback":
            self.handle_feedback()
            return
        if self.path == "/api/goals/progress":
            self.handle_goal_progress()
            return
        if self.path == "/api/support":
            self.handle_support()
            return
        self.send_json(HTTPStatus.NOT_FOUND, {"error": "Endpoint not found."})

    # ------------------------------------------------------------------
    # API handlers
    # ------------------------------------------------------------------
    def handle_bootstrap(self) -> None:
        """GET /api/bootstrap — Return the full hydrated profile."""
        with STORE_LOCK:
            store = load_store()
            ensure_daily_state(store)
            save_store(store)
            self.send_json(HTTPStatus.OK, store["profile"])

    def handle_attendance(self) -> None:
        """PUT /api/attendance — Mark attendance for a selected date."""
        payload = self.read_json()
        status = payload.get("status")
        selected_date = str(payload.get("date") or today_iso())
        if status not in {"present", "absent"}:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Invalid attendance status. Use 'present' or 'absent'."})
            return
        try:
            datetime.strptime(selected_date, "%Y-%m-%d")
        except ValueError:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Date must use YYYY-MM-DD format."})
            return

        with STORE_LOCK:
            store = load_store()
            ensure_daily_state(store)
            profile = store["profile"]
            today = today_iso()
            user = profile["user"]

            # Replace the selected date without creating duplicate records.
            records: list[dict[str, str]] = profile["attendance"]["records"]
            records = [r for r in records if r["date"] != selected_date]
            records.append({"date": selected_date, "status": status})
            profile["attendance"]["records"] = records
            profile["attendance"]["todayStatus"] = status if selected_date == today else next(
                (record["status"] for record in records if record["date"] == today), None
            )
            profile.setdefault("notifications", []).insert(0, {
                "title": "Attendance updated",
                "message": f"{selected_date}: marked {status}.",
                "createdAt": datetime.now(UTC).isoformat(timespec="seconds"),
            })
            profile["notifications"] = profile["notifications"][:50]

            # --- Streak logic ---
            if selected_date == today and status == "present":
                # Calculate consecutive present days ending at today
                present_dates = sorted(
                    {r["date"] for r in records if r["status"] == "present"},
                    reverse=True,
                )
                streak = 0
                expected = datetime.strptime(today, "%Y-%m-%d").date()
                for d in present_dates:
                    d_date = datetime.strptime(d, "%Y-%m-%d").date()
                    if d_date == expected:
                        streak += 1
                        expected -= timedelta(days=1)
                    elif d_date < expected:
                        break
                user["streak"] = streak
                if streak > user["longestStreak"]:
                    user["longestStreak"] = streak

                # Auto-complete the attendance quest if not already completed
                attendance_quest = next(
                    (q for q in profile["quests"] if q["id"] == "attendance"), None
                )
                if attendance_quest and attendance_quest["status"] != "completed":
                    attendance_quest["status"] = "completed"
                    add_xp(profile, QUEST_REWARDS.get("attendance", 10))
                    profile.setdefault("stats", {}).setdefault("quests", {})["attendance"] = (
                        profile["stats"]["quests"].get("attendance", 0) + 1
                    )
            elif selected_date == today:
                # Absent → reset streak
                user["streak"] = 0

            reconcile_gamification(profile)
            save_store(store)
            self.send_json(HTTPStatus.OK, profile)

    def handle_notifications(self) -> None:
        """GET /api/notifications — Return stored in-app notifications."""
        with STORE_LOCK:
            store = load_store()
            ensure_daily_state(store)
            notifications = store["profile"].setdefault("notifications", [])
            self.send_json(HTTPStatus.OK, {"notifications": notifications})

    def handle_complete_quest(self, quest_id: str) -> None:
        """POST /api/quests/:id/complete — Mark a quest as completed and award XP."""
        with STORE_LOCK:
            store = load_store()
            ensure_daily_state(store)
            profile = store["profile"]

            quest = next((q for q in profile["quests"] if q["id"] == quest_id), None)
            reward = QUEST_REWARDS.get(quest_id)

            if quest is None or reward is None:
                self.send_json(HTTPStatus.NOT_FOUND, {"error": "Quest not found."})
                return
            if quest["status"] == "locked":
                self.send_json(HTTPStatus.FORBIDDEN, {"error": "Quest is locked."})
                return
            if quest["status"] == "completed":
                # Already completed — return current state (idempotent)
                self.send_json(HTTPStatus.OK, profile)
                return

            quest["status"] = "completed"
            add_xp(profile, reward)
            profile.setdefault("stats", {}).setdefault("quests", {})[quest_id] = (
                profile["stats"]["quests"].get(quest_id, 0) + 1
            )
            reconcile_gamification(profile)

            # Bonus: completing every normal daily quest unlocks the surprise quest
            normal = [q for q in profile["quests"] if q["id"] != "surprise"]
            if normal and all(q["status"] == "completed" for q in normal):
                surprise = next((q for q in profile["quests"] if q["id"] == "surprise"), None)
                if surprise and surprise["status"] == "locked":
                    surprise["status"] = "active"
                    surprise["reward"] = SURPRISE_REWARD

            save_store(store)
            self.send_json(HTTPStatus.OK, profile)

    def handle_claim_daily_challenge(self) -> None:
        """POST /api/daily-challenge/claim — Claim the daily challenge reward."""
        with STORE_LOCK:
            store = load_store()
            ensure_daily_state(store)
            profile = store["profile"]
            challenge = profile["dailyChallenge"]

            completed_count = sum(1 for q in profile["quests"] if q["status"] == "completed")

            if challenge["claimed"]:
                self.send_json(HTTPStatus.CONFLICT, {"error": "Daily challenge already claimed."})
                return
            if completed_count < challenge["goal"]:
                self.send_json(
                    HTTPStatus.CONFLICT,
                    {"error": f"Complete {challenge['goal']} quests first. You have {completed_count}."},
                )
                return

            challenge["claimed"] = True
            add_xp(profile, challenge["reward"])
            save_store(store)
            self.send_json(HTTPStatus.OK, profile)

    def handle_feedback(self) -> None:
        """POST /api/feedback — Save user feedback."""
        payload = self.read_json()
        message = str(payload.get("message", "")).strip()
        if not message:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Message is required."})
            return
        with STORE_LOCK:
            store = load_store()
            store.setdefault("feedback", []).append({
                "message": message,
                "createdAt": datetime.now(UTC).isoformat(),
            })
            save_store(store)
        self.send_json(HTTPStatus.CREATED, {"ok": True})

    def handle_save_goals(self) -> None:
        """PUT /api/goals — Save optional question targets and an optional note."""
        payload = self.read_json()
        exam = payload.get("exam") or "JEE"
        targets = payload.get("targets", {})
        note = str(payload.get("note", "")).strip()[:2000]
        allowed_subjects = {"JEE": {"physics", "chemistry", "maths"}, "NEET": {"physics", "chemistry", "biology"}}
        if exam not in allowed_subjects or not isinstance(targets, dict):
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Choose JEE or NEET and valid targets."})
            return
        clean_targets: dict[str, int] = {}
        try:
            for subject in allowed_subjects[exam]:
                value = int(targets.get(subject, 0))
                clean_targets[subject] = min(1000, max(0, value))
        except (TypeError, ValueError):
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Question targets must be whole numbers."})
            return
        if not any(clean_targets.values()) and not note:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Add a target or write a note."})
            return
        with STORE_LOCK:
            store = load_store()
            ensure_daily_state(store)
            store["profile"]["goals"] = {
                "exam": exam,
                "targets": clean_targets,
                "progress": {subject: 0 for subject in clean_targets},
                "date": today_iso(),
                "note": note,
            }
            save_store(store)
            self.send_json(HTTPStatus.OK, store["profile"])

    def handle_goal_progress(self) -> None:
        """POST /api/goals/progress — Persist today's completed question counts."""
        payload = self.read_json()
        progress = payload.get("progress", {})
        if not isinstance(progress, dict):
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Progress must be an object."})
            return
        with STORE_LOCK:
            store = load_store()
            ensure_daily_state(store)
            goals = store["profile"].get("goals")
            if not goals:
                self.send_json(HTTPStatus.CONFLICT, {"error": "Set daily goals first."})
                return
            clean_progress: dict[str, int] = {}
            try:
                for subject, target in goals["targets"].items():
                    clean_progress[subject] = min(target, max(0, int(progress.get(subject, 0))))
            except (TypeError, ValueError):
                self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Progress must be whole numbers."})
                return
            goals["progress"] = clean_progress
            goals["date"] = today_iso()
            save_store(store)
            self.send_json(HTTPStatus.OK, store["profile"])

    def handle_save_profile(self) -> None:
        """PUT /api/profile — Update the student's display name."""
        payload = self.read_json()
        name = str(payload.get("name", "")).strip()
        if not name:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Name is required."})
            return
        if len(name) > 60:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Name is too long (max 60 characters)."})
            return
        with STORE_LOCK:
            store = load_store()
            ensure_daily_state(store)
            store["profile"]["user"]["name"] = name
            save_store(store)
            self.send_json(HTTPStatus.OK, store["profile"])

    def handle_save_avatar(self) -> None:
        """PUT /api/profile/avatar — Save the student's avatar customization."""
        payload = self.read_json()
        avatar = payload.get("avatar", {})
        allowed_hair = {"classic", "wave", "curly", "buzz"}
        allowed_skin = {"#f6d3bd", "#dfa07c", "#bd7a58", "#8d573f", "#603829"}
        shirt = avatar.get("shirt") if isinstance(avatar, dict) else None
        skin = avatar.get("skin") if isinstance(avatar, dict) else None
        hair = avatar.get("hair") if isinstance(avatar, dict) else None
        if not isinstance(shirt, str) or not re.fullmatch(r"#[0-9a-fA-F]{6}", shirt):
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Choose a valid shirt color."})
            return
        if skin not in allowed_skin or hair not in allowed_hair:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Choose a valid skin tone and hairstyle."})
            return
        with STORE_LOCK:
            store = load_store()
            ensure_daily_state(store)
            store["profile"]["user"]["avatar"] = {"shirt": shirt.lower(), "skin": skin, "hair": hair}
            save_store(store)
            self.send_json(HTTPStatus.OK, store["profile"])

    def handle_support(self) -> None:
        """POST /api/support — Save a help/support request."""
        payload = self.read_json()
        subject = str(payload.get("subject", "")).strip() or "General"
        message = str(payload.get("message", "")).strip()
        if not message:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Message is required."})
            return
        with STORE_LOCK:
            store = load_store()
            store.setdefault("support", []).append({
                "subject": subject[:120],
                "message": message[:2000],
                "createdAt": datetime.now(UTC).isoformat(),
            })
            save_store(store)
        self.send_json(HTTPStatus.CREATED, {"ok": True})

    # ------------------------------------------------------------------
    # Utility methods
    # ------------------------------------------------------------------
    def read_json(self) -> dict[str, Any]:
        """Read and parse JSON from the request body."""
        length = int(self.headers.get("Content-Length", 0))
        if length == 0:
            return {}
        try:
            return json.loads(self.rfile.read(length) or b"{}")
        except json.JSONDecodeError:
            return {}

    def send_json(self, status: HTTPStatus, payload: dict[str, Any]) -> None:
        """Send a JSON response with CORS headers."""
        encoded = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self._set_cors_headers()
        self.end_headers()
        self.wfile.write(encoded)

    @staticmethod
    def _guess_mime_type(filepath: Path) -> str:
        """Guess MIME type from file extension."""
        ext = filepath.suffix.lower()
        return {
            ".html": "text/html; charset=utf-8",
            ".css": "text/css; charset=utf-8",
            ".js": "application/javascript; charset=utf-8",
            ".json": "application/json; charset=utf-8",
            ".svg": "image/svg+xml",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".gif": "image/gif",
            ".ico": "image/x-icon",
            ".woff": "font/woff",
            ".woff2": "font/woff2",
        }.get(ext, "application/octet-stream")

    def log_message(self, _format: str, *_args: object) -> None:
        """Suppress default HTTP request logging."""
        return


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    port = int(os.getenv("PORT", "3000"))
    host = os.getenv("HOST", "127.0.0.1")
    server = ThreadingHTTPServer((host, port), CookedRequestHandler)
    print(f"🍳 COOKED? API listening on http://{host}:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Server stopped.")
        server.shutdown()
