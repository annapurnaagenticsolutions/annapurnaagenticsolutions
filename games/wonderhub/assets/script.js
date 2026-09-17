const fallbackSites = [
  {
    "title": "STEM Concepts Lab",
    "category": "Study",
    "subCategory": "STEM Concept Learning",
    "ageRange": "Class 1–10",
    "status": "Live",
    "url": "https://annapurnaagenticsolutions.github.io/stem-lab-unified/",
    "description": "A unified learning suite for Math, Physics, Chemistry, Biology, and Life Concepts with visual explanations and guided concept flow.",
    "missionNote": "Make formal concepts easier to understand through structure, visuals, practice, and real-life connection.",
    "bestFor": [
      "Students",
      "Parents",
      "Teachers"
    ],
    "tags": [
      "STEM",
      "Class 1–10",
      "Concepts",
      "Visual Learning"
    ],
    "icon": "∑",
    "featured": true
  },
  {
    "title": "Jigyasu Learning",
    "category": "Activities",
    "subCategory": "Curiosity & Visual Learning",
    "ageRange": "Children, adults, lifelong learners",
    "status": "Live",
    "url": "https://jigyasu.ddnsgeek.com/",
    "description": "A visual, curiosity-led learning platform built around wonder, accessibility, multilingual learning, and understanding instead of memorization.",
    "missionNote": "Keep the learner's why alive by making ideas visual, patient, joyful, and accessible.",
    "bestFor": [
      "Students",
      "Parents",
      "Schools",
      "Lifelong Learners"
    ],
    "tags": [
      "Wonder",
      "Visual STEM",
      "Free-first",
      "Learning by Doing"
    ],
    "icon": "🦚",
    "featured": true
  },
  {
    "title": "Kids Story World",
    "category": "Stories",
    "subCategory": "Reading & Imagination",
    "ageRange": "Class 1–6",
    "status": "Coming Soon",
    "url": "#",
    "description": "Illustrated stories for imagination, values, nature, science, animals, and everyday learning.",
    "missionNote": "Use story as a gentle doorway into curiosity, values, language, and concept understanding.",
    "bestFor": [
      "Children",
      "Parents"
    ],
    "tags": [
      "Stories",
      "Reading",
      "Imagination",
      "Values"
    ],
    "icon": "📖",
    "featured": false
  },
  {
    "title": "Color & Create Studio",
    "category": "Creativity",
    "subCategory": "Coloring & Art",
    "ageRange": "Class 1–5",
    "status": "Coming Soon",
    "url": "#",
    "description": "A playful gateway for coloring, drawing prompts, pattern art, and creative expression.",
    "missionNote": "Treat creativity as a valid form of learning, observation, confidence, and self-expression.",
    "bestFor": [
      "Children",
      "Parents"
    ],
    "tags": [
      "Coloring",
      "Art",
      "Creativity",
      "Fun"
    ],
    "icon": "🎨",
    "featured": false
  },
  {
    "title": "Learning Games Arena",
    "category": "Play",
    "subCategory": "Games & Puzzles",
    "ageRange": "Class 1–8",
    "status": "Coming Soon",
    "url": "#",
    "description": "Puzzle, memory, logic, language, math, and science game links collected in one child-friendly space.",
    "missionNote": "Use play to strengthen attention, reasoning, recall, pattern sense, and problem solving.",
    "bestFor": [
      "Students",
      "Parents"
    ],
    "tags": [
      "Games",
      "Puzzles",
      "Logic",
      "Play"
    ],
    "icon": "🎮",
    "featured": false
  },
  {
    "title": "Activity Explorer",
    "category": "Activities",
    "subCategory": "Home & Nature Activities",
    "ageRange": "Class 1–8",
    "status": "Coming Soon",
    "url": "#",
    "description": "Safe home, kitchen, nature, observation, and weekend activity websites can be indexed here.",
    "missionNote": "Help learners see science, math, nature, and life skills in the world around them.",
    "bestFor": [
      "Children",
      "Parents",
      "Teachers"
    ],
    "tags": [
      "Activities",
      "Home",
      "Nature",
      "DIY"
    ],
    "icon": "🧭",
    "featured": false
  },
  {
    "title": "Robotics & IoT Lab",
    "category": "Future Skills",
    "subCategory": "Smart Systems",
    "ageRange": "Class 6–10",
    "status": "Coming Soon",
    "url": "#",
    "description": "A future link hub for robotics, sensors, circuits, IoT, smart devices, and beginner engineering projects.",
    "missionNote": "Make future technology approachable through projects, components, systems thinking, and safe experimentation.",
    "bestFor": [
      "Students",
      "Teachers",
      "Schools"
    ],
    "tags": [
      "Robotics",
      "IoT",
      "Engineering",
      "Future Skills"
    ],
    "icon": "🤖",
    "featured": false
  },
  {
    "title": "AI Concepts Learning",
    "category": "Future Skills",
    "subCategory": "AI Literacy",
    "ageRange": "Class 6–10",
    "status": "Coming Soon",
    "url": "#",
    "description": "A future platform index entry for artificial intelligence, agents, prompts, responsible AI, and modern technology literacy.",
    "missionNote": "Explain modern AI in a responsible, visual, practical, and non-intimidating way.",
    "bestFor": [
      "Students",
      "Teachers",
      "Parents"
    ],
    "tags": [
      "AI",
      "Agents",
      "Technology",
      "Future Skills"
    ],
    "icon": "🧠",
    "featured": false
  },
  {
    "title": "Life Skills Corner",
    "category": "Life Skills",
    "subCategory": "Real-world Learning",
    "ageRange": "Class 1–10",
    "status": "Coming Soon",
    "url": "#",
    "description": "A future reference area for money basics, safety, communication, habits, environment, health, and daily-life understanding.",
    "missionNote": "Connect learning to daily decisions, safety, health, communication, environment, and practical living.",
    "bestFor": [
      "Students",
      "Parents",
      "Teachers"
    ],
    "tags": [
      "Life Skills",
      "Safety",
      "Habits",
      "Real Life"
    ],
    "icon": "🌱",
    "featured": false
  }
];

const state = {
  sites: [],
  activeCategory: "All",
  search: ""
};

const el = {
  stats: document.querySelector("#stats"),
  filters: document.querySelector("#categoryFilters"),
  search: document.querySelector("#searchInput"),
  featuredGrid: document.querySelector("#featuredGrid"),
  futureGrid: document.querySelector("#futureGrid"),
  liveCount: document.querySelector("#liveCount"),
  futureCount: document.querySelector("#futureCount"),
  emptyState: document.querySelector("#emptyState")
};

async function loadSites() {
  try {
    const response = await fetch("data/sites.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Unable to load data/sites.json");
    state.sites = await response.json();
  } catch (error) {
    console.warn("Using fallback site data.", error);
    state.sites = fallbackSites;
  }

  renderFilters();
  renderSites();
}

function normalize(value) {
  return String(value || "").toLowerCase().trim();
}

function getCategories() {
  const categories = new Set(state.sites.map(site => site.category).filter(Boolean));
  return ["All", ...Array.from(categories).sort()];
}

function renderFilters() {
  el.filters.innerHTML = getCategories()
    .map(category => `
      <button class="filter-chip ${category === state.activeCategory ? "active" : ""}" data-category="${escapeHtml(category)}" type="button">
        ${escapeHtml(category)}
      </button>
    `)
    .join("");

  el.filters.querySelectorAll("button").forEach(button => {
    button.addEventListener("click", () => {
      state.activeCategory = button.dataset.category;
      renderFilters();
      renderSites();
    });
  });
}

function getFilteredSites() {
  const query = normalize(state.search);

  return state.sites.filter(site => {
    const categoryMatch = state.activeCategory === "All" || site.category === state.activeCategory;
    const text = normalize([
      site.title,
      site.category,
      site.subCategory,
      site.ageRange,
      site.status,
      site.description,
      site.missionNote,
      ...(site.bestFor || []),
      ...(site.tags || [])
    ].join(" "));
    return categoryMatch && (!query || text.includes(query));
  });
}

function renderSites() {
  const filtered = getFilteredSites();
  const liveSites = filtered.filter(site => normalize(site.status) === "live");
  const futureSites = filtered.filter(site => normalize(site.status) !== "live");

  el.featuredGrid.innerHTML = liveSites.map(renderCard).join("");
  el.futureGrid.innerHTML = futureSites.map(renderCard).join("");

  el.liveCount.textContent = `${liveSites.length} available`;
  el.futureCount.textContent = `${futureSites.length} planned`;
  el.emptyState.hidden = filtered.length > 0;

  updateStats();
}

function updateStats() {
  const live = state.sites.filter(site => normalize(site.status) === "live").length;
  const future = state.sites.length - live;
  const categories = new Set(state.sites.map(site => site.category).filter(Boolean)).size;

  el.stats.innerHTML = `
    <div><strong>${live}</strong><span>Live</span></div>
    <div><strong>${future}</strong><span>Coming soon</span></div>
    <div><strong>${categories}</strong><span>Categories</span></div>
  `;
}

function renderCard(site) {
  const isLive = normalize(site.status) === "live";
  const statusClass = isLive ? "live" : "coming-soon";
  const bestFor = Array.isArray(site.bestFor) ? site.bestFor.join(", ") : "Learners";
  const tags = Array.isArray(site.tags) ? site.tags.slice(0, 5) : [];
  const href = isLive ? site.url : "#";
  const target = isLive ? ' target="_blank" rel="noopener noreferrer"' : "";
  const linkClass = isLive ? "card-link" : "card-link disabled";
  const linkText = isLive ? "Open website →" : "Planned slot";
  const missionNote = site.missionNote ? `
    <div class="mission-note">
      <span>Mission fit</span>
      <p>${escapeHtml(site.missionNote)}</p>
    </div>
  ` : "";

  return `
    <article class="site-card">
      <div class="card-top">
        <div class="card-identity">
          <span class="card-icon" aria-hidden="true">${escapeHtml(site.icon || "✦")}</span>
          <div>
            <small>${escapeHtml(site.subCategory || site.category || "Learning")}</small>
            <h3>${escapeHtml(site.title)}</h3>
          </div>
        </div>
        <span class="status ${statusClass}">${escapeHtml(site.status || "Planned")}</span>
      </div>

      <div class="card-body">
        <p>${escapeHtml(site.description)}</p>
        ${missionNote}
        <div class="meta-row">
          <div>
            <span>For</span>
            <strong>${escapeHtml(site.ageRange || "All learners")}</strong>
          </div>
          <div>
            <span>Best for</span>
            <strong>${escapeHtml(bestFor)}</strong>
          </div>
        </div>
      </div>

      <div class="card-tags">
        ${tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join("")}
      </div>

      <div class="card-action">
        <a class="${linkClass}" href="${escapeAttr(href)}"${target}>${linkText}</a>
      </div>
    </article>
  `;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

el.search.addEventListener("input", event => {
  state.search = event.target.value;
  renderSites();
});

loadSites();
