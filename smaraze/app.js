/* ==========================================================================
   Avyaan Class 1–10 STEM Platform — Application Logic
   Includes 5-Step Learning Ladder, Interactive Visual Transformation Engine,
   Step 2 Detailed Formula Breakdown Engine (Variable Cards + Magic Triangles + Live Sandbox),
   KaTeX Math Typesetting, Confetti Celebrations, Daily Streak Engine,
   Phase 3 Diagnostic Coaching, & Phase 4 Progressive Reveal + Scratchpad
   ========================================================================== */

let currentUser = null;
let selectedClass = 'all';
let selectedSubject = 'all';
let selectedDifficulty = 'all';
let currentActiveTopic = null;
let currentActiveStep = 1;
let currentManipulatorValue = 5;
let currentQuizIndex = 0;
let currentRevealedStep = 1;
let isScratchpadActive = false;
let isDrawing = false;
let quizCorrectCount = 0;
let quizAnsweredCount = 0;
let quizSessionDone = false;
let quizSession = null; // { topicId, correct, wrong, ts } — one record per quiz run
let quizSessionQuestions = null; // { topicId, sessionId, questions, expiresAt }
let explanationLevel = 'standard'; // 'simple', 'standard', 'deep'
let userPrediction = ''; // student's prediction before seeing the manipulator
let hasPredicted = false; // whether student has submitted a prediction for current topic

function safeStorageJSON(key, fallback) {
  try { const raw = avyaanStorage.getItem(key); return raw == null ? fallback : JSON.parse(raw); } catch (e) { return fallback; }
}

// Gamification State (XP, Badges, SmartScore, Review Queue, Daily Challenge)
let userXP = parseInt(avyaanStorage.getItem('avyaan_xp') || '0');
let earnedBadges = new Set(safeStorageJSON('avyaan_badges', []));
let smartScores = safeStorageJSON('avyaan_smart_scores', {});
let reviewQueue = safeStorageJSON('avyaan_review_queue', []);
let dailyChallengeData = safeStorageJSON('avyaan_daily_challenge', {});
// The landing page is intentionally curated; the full catalogue lives on
// library.html. Keeping this state page-aware prevents a search/filter
// control from accidentally turning the public home page into a catalogue.
let browseMode = window.AVYAAN_LIBRARY_PAGE ? 'all' : 'curated';
// Keep the catalogue calm and scannable. Reveal a second small page on
// demand, but never render the complete catalogue in one long document.
let topicDisplayLimit = 12;

// A deliberately small set of starter lessons is available without an
// account. The public bundle contains metadata only for protected topics;
// lesson bodies are still fetched through the authenticated entitlement API.
const FREE_PREVIEW_TOPIC_IDS = new Set([
  'math_c1-counting-1-to-10',
  'math_c1-numbers-11-to-20',
  'math_c1-before-after-between',
  'math_c1-bigger-and-smaller',
  'math_c1-addition-with-objects',
  'math_c1-subtraction-with-objects'
]);
let currentPathSubject = null; // subject+class selected in the Curriculum Path modal
let currentPathClass = null;
let estimationData = safeStorageJSON('avyaan_estimations', {}); // topicId -> {guess, timestamp}
let assignment = null; // { topics: [id], due: 'YYYY-MM-DD' } — from ?assign=...&due=...
let assignmentDismissed = false;

// Operational Model State Variables
let subTotal = 5, subTakeaway = 3;
let addA = 4, addB = 2, isMerged = false;
let multRows = 3, multCols = 4;
let divTotal = 12, divBuckets = 3;
let fracNum = 3, fracDen = 4;

// Science Simulation State Variables
let physForce = 20, physMass = 5;
let circVolts = 6, circResist = 10;
let chemTemp = 40, chemStir = false;
let bioLight = 60, bioCo2 = 50;

// Formula Breakdown State Variables
let selectedFormulaTargetVar = 'primary';
let sandboxVal1 = 12, sandboxVal2 = 4;
let lightAngle = 45, lightAngleTopic = '';
let soundFreq = 30, soundAmp = 40, soundTopic = '';
let audioCtx = null;
let soundInstrument = 'flute';

// Musical scale: map the frequency slider (10-60) onto a C-major pentatonic
// across ~2 octaves so the tone lands on in-tune notes instead of arbitrary
// frequencies — a big part of sounding musical rather than like an alarm.
const SOUND_SCALE = [261.63, 293.66, 329.63, 392.00, 440.00,
                     523.25, 587.33, 659.25, 783.99, 880.00];
const SOUND_NOTE = ['C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5', 'G5', 'A5'];

function soundNoteForSlider(v) {
  const i = Math.max(0, Math.min(SOUND_SCALE.length - 1,
    Math.round(((v || 30) / 60) * (SOUND_SCALE.length - 1))));
  return { freq: SOUND_SCALE[i], name: SOUND_NOTE[i] };
}

// Additive synthesis with instrument presets, ADSR envelopes and vibrato —
// a flute (mostly fundamental, gentle vibrato, soft attack) and a plucked
// string (8 harmonics, higher ones quieter and decaying faster). This is a
// real timbre, not a beep.
function playSoundTone() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;
    const { freq } = soundNoteForSlider(soundFreq);
    const master = audioCtx.createGain();
    master.connect(audioCtx.destination);
    const peak = 0.15;

    if (soundInstrument === 'flute') {
      master.gain.setValueAtTime(0.0001, now);
      master.gain.linearRampToValueAtTime(peak, now + 0.09);   // soft attack
      master.gain.setValueAtTime(peak, now + 0.85);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 1.15);
      const lfo = audioCtx.createOscillator();
      const lfoGain = audioCtx.createGain();
      lfo.frequency.value = 5;                                  // ~5 Hz vibrato
      lfoGain.gain.value = freq * 0.004;                        // ~0.4% depth
      const o = audioCtx.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq;
      lfo.connect(lfoGain).connect(o.frequency);
      o.connect(master);
      o.start(now); o.stop(now + 1.2);
      lfo.start(now); lfo.stop(now + 1.2);
    } else {
      // plucked string: fast attack, 8 harmonics, higher partials quieter
      // and decaying faster (1/n^1.5 decay) — the classic pluck behaviour
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(peak, now + 0.005);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
      for (let n = 1; n <= 8; n++) {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.type = n % 2 ? 'sawtooth' : 'triangle';
        o.frequency.value = freq * n;
        g.gain.setValueAtTime(1 / n, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 1.6 / Math.sqrt(n));
        o.connect(g).connect(master);
        o.start(now);
        o.stop(now + 1.7);
      }
    }
    master.gain.onended = () => { try { master.disconnect(); } catch (e) { /* noop */ } };
  } catch (e) { /* audio unavailable — visual tool still works */ }
}

// Completed topic tracking in localStorage
let completedTopicIds = new Set(JSON.parse(avyaanStorage.getItem('avyaan_completed_topics') || '[]'));

// Retrieval-gated mastery: a topic is "Solidified" (memory-proven) only after
// a SUCCESSFUL spaced-recall review — answering correctly when it came due.
// First-pass quiz success earns "Mastered"; the spaced recall earns the
// deeper tier. Tracked separately so existing Mastered topics aren't demoted.
let solidifiedTopicIds = new Set(JSON.parse(avyaanStorage.getItem('avyaan_solidified_topics') || '[]'));

function markSolidified(topicId) {
  if (solidifiedTopicIds.has(topicId)) return;
  solidifiedTopicIds.add(topicId);
  avyaanStorage.setItem('avyaan_solidified_topics', JSON.stringify(Array.from(solidifiedTopicIds)));
  logActivity(topicId, 'solidified');
  awardXP(30, 'Memory proven (successful recall)');
}

function isSolidified(topicId) {
  return solidifiedTopicIds.has(topicId);
}

// ---- Safe rendering helpers ----
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>\"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[ch]));
}

// ---- English-only content ----
function topicTitle(t) { return escapeHtml(t.title); }
function topicSummary(t) { return escapeHtml(t.summary); }

// ---- LAZY DATASET SPLITS ------------------------------------------------
// reviews + boards live in separate files so the boot bundle stays lighter.
// They are fetched only when the learner opens those features and cached by
// the service worker after a successful request.
let reviewsLoaded = !!(AVYAAN_DATA && AVYAAN_DATA.reviews);
let boardsLoaded = !!(AVYAAN_DATA && AVYAAN_DATA.boards);

function loadLazy(kind, cb) {
  const isLoaded = kind === 'reviews' ? reviewsLoaded : boardsLoaded;
  if (isLoaded) { if (cb) cb(); return; }
  const file = kind === 'reviews' ? 'stem_data_reviews.js' : 'stem_data_boards.js';
  const build = window.AVYAAN_CONTENT_VERSION ? window.AVYAAN_CONTENT_VERSION.split('.').pop() : '';
  const s = document.createElement('script');
  s.src = build ? file + '?v=' + build : file;
  s.onload = () => {
    if (kind === 'reviews') reviewsLoaded = true; else boardsLoaded = true;
    if (cb) cb();
  };
  s.onerror = () => { if (cb) cb(); };
  document.head.appendChild(s);
}

// Initialize app on load
document.addEventListener('DOMContentLoaded', () => {
  loadStoredUser();
  refreshAuthenticatedUser();
  parseAssignmentFromUrl();
  joinClassFromLink();
  updateDynamicStats();
  updateShadowDemo(45);
  updateMasteryScorecard();
  updateXPDisplay();
  renderGrid();
  enhanceInteractiveSemantics();
  checkBadges();
  handleHashNavigation();
  openPasswordResetFromUrl();
  maybeShowOnboarding();
  fetchContentVersion();
});

// Content version: read /api/version for cache/diagnostic purposes.  The
// release identifier is intentionally not shown in the public footer.
function fetchContentVersion() {
  fetch('/api/version', { cache: 'no-store' })
    .then(r => r.json())
    .then(data => {
      window.AVYAAN_CONTENT_VERSION = data.version;
      console.info('[Avyaan] content version', data.version, '·', data.topicCount, 'topics');
    })
    .catch(() => { window.AVYAAN_CONTENT_VERSION = null; });
}

// ---- TEACHER ASSIGNMENTS: shareable link pins topics with a due date ----
// Format:  index.html?assign=math_c1-money,physics_c6-...&due=2026-08-20
function parseAssignmentFromUrl() {
  try {
    const p = new URLSearchParams(location.search);
    const ids = (p.get('assign') || '').split(',').map(s => s.trim()).filter(Boolean);
    const due = p.get('due') || '';
    if (ids.length === 0) return;
    const valid = ids.filter(id => AVYAAN_DATA.topics.some(t => t.id === id));
    if (valid.length === 0) return;
    assignment = { topics: valid, due };
    avyaanStorage.setItem('avyaan_assignment', JSON.stringify(assignment));
  } catch (e) { /* ignore malformed links */ }
}

function getStoredAssignment() {
  if (assignment) return assignment;
  try { return JSON.parse(avyaanStorage.getItem('avyaan_assignment') || 'null'); } catch (e) { return null; }
}

function renderAssignmentBanner() {
  const a = getStoredAssignment();
  if (!a || assignmentDismissed) return '';
  const topics = a.topics.map(id => AVYAAN_DATA.topics.find(t => t.id === id)).filter(Boolean);
  if (topics.length === 0) return '';
  const done = topics.filter(t => completedTopicIds.has(t.id)).length;
  const dueText = a.due ? ` · due ${escapeHtml(a.due)}` : '';
  let dueWarn = '';
  if (a.due) {
    const days = Math.round((new Date(a.due) - new Date()) / 86400000);
    dueWarn = days < 0 ? ' <span class="assign-due-late">OVERDUE</span>' : days <= 2 ? ` <span class="assign-due-soon">${days === 0 ? 'due TODAY' : days + ' days left'}</span>` : '';
  }
  return `
    <div class="assignment-banner">
      <div class="assign-left">
        <div class="assign-label">📋 Teacher Assignment${dueText}${dueWarn}</div>
        <div class="assign-text">${done}/${topics.length} completed · ${topics.map(t => escapeHtml(t.emoji + ' ' + t.title)).join(' · ')}</div>
      </div>
      <div style="display:flex; gap:0.5rem; flex-shrink:0;">
        <button class="btn btn-primary" style="font-size:0.75rem; padding:0.35rem 0.8rem;" onclick="goToFirstAssigned()">Start →</button>
        <button class="btn" style="font-size:0.75rem; padding:0.35rem 0.8rem;" onclick="dismissAssignment()">✕</button>
      </div>
    </div>
  `;
}

function goToFirstAssigned() {
  const a = getStoredAssignment();
  if (!a) return;
  const first = a.topics.find(id => !completedTopicIds.has(id)) || a.topics[0];
  if (first) openTopicDetail(first);
}

function dismissAssignment() {
  assignmentDismissed = true;
  renderGrid();
}

function copyAssignmentLink() {
  // Build from the path currently shown in the modal (subject + class).
  const subject = currentPathSubject || 'Mathematics';
  const classLevel = currentPathClass || 1;
  const path = getPathFor(subject, classLevel);
  const ids = path.map(t => t.id).join(',');
  // Ask for a due date, defaulting to 7 days from now (blank = no due date).
  const defaultDue = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const due = prompt('Due date (YYYY-MM-DD), or leave blank for no deadline:', defaultDue) || '';
  const dueParam = /^\d{4}-\d{2}-\d{2}$/.test(due) ? '&due=' + due : '';
  const url = location.origin + location.pathname + '?assign=' + ids + dueParam;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => { toast('📋 Assignment link copied — share it with your students'); });
  } else {
    prompt('Copy this assignment link:', url);
  }
}

function isAssigned(id) {
  const a = getStoredAssignment();
  return !!(a && a.topics.includes(id));
}

// Lightweight toast for transient confirmations (no dependency on badge system)
function toast(message) {
  let el = document.getElementById('avyaan-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'avyaan-toast';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), 2600);
}

// ==========================================================================
// FIRST-VISIT ONBOARDING — pick a class so content matches the visitor
// ==========================================================================
function maybeShowOnboarding() {
  if (avyaanStorage.getItem('avyaan_onboarded')) return;
  // Returning real (non-guest) students don't need the picker
  if (currentUser && !currentUser.isGuest) {
    avyaanStorage.setItem('avyaan_onboarded', '1');
    return;
  }
  setTimeout(() => openModal('onboardingModal'), 500);
}

function chooseOnboardingGrade(grade) {
  if (currentUser) {
    currentUser.grade = grade;
    avyaanStorage.setItem('avyaan_user', JSON.stringify(currentUser));
    updateNavbarUserUI();
  }
  avyaanStorage.setItem('avyaan_onboarded', '1');
  closeModal('onboardingModal');
  renderGrid();
  updateMasteryScorecard();
  const chips = document.querySelectorAll('#classChips .chip');
  if (chips && chips[grade]) chips[grade].click();
}

function skipOnboarding() {
  avyaanStorage.setItem('avyaan_onboarded', '1');
  closeModal('onboardingModal');
}

// Create a guest profile — no fake auto-login as a demo student
function createGuestUser() {
  return {
    id: 'guest',
    name: 'Guest',
    email: '',
    role: 'Guest',
    grade: 1,
    tier: 'free',
    avatar: '👋',
    isGuest: true
  };
}

// Load user from localStorage, otherwise browse as a guest. A non-guest
// profile is accepted only when a backend bearer or cookie session exists.
function refreshLearnerRuntimeState() {
  userXP = parseInt(avyaanStorage.getItem('avyaan_xp') || '0', 10) || 0;
  earnedBadges = new Set(safeStorageJSON('avyaan_badges', []));
  smartScores = safeStorageJSON('avyaan_smart_scores', {});
  reviewQueue = safeStorageJSON('avyaan_review_queue', []);
  dailyChallengeData = safeStorageJSON('avyaan_daily_challenge', {});
  estimationData = safeStorageJSON('avyaan_estimations', {});
  completedTopicIds = new Set(safeStorageJSON('avyaan_completed_topics', []));
  solidifiedTopicIds = new Set(safeStorageJSON('avyaan_solidified_topics', []));
  if (typeof vocabKnown !== 'undefined') {
    vocabKnown = new Set(safeStorageJSON('avyaan_vocab_known', []));
  }
}

function activateLearnerContext(user) {
  // A student identity is its own child namespace. Parent accounts stay in
  // the account/default namespace until they explicitly start a learner session.
  if (window.avyaanStorage && typeof avyaanStorage.setActiveLearner === 'function') {
    const role = String(user?.role || '').toLowerCase();
    avyaanStorage.setActiveLearner(role === 'student' ? (user.child_id || user.id) : null);
    refreshLearnerRuntimeState();
  }
}

function loadStoredUser() {
  const stored = avyaanStorage.getItem('avyaan_user');
  const hasToken = typeof AvyaanAPI !== 'undefined' && !!AvyaanAPI.getToken();
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.id === 'guest') {
        currentUser = createGuestUser();
        currentUser.grade = parsed.grade || 1;
      } else if (parsed && hasToken) {
        currentUser = parsed;
      } else {
        currentUser = createGuestUser();
      }
    } catch (e) {
      currentUser = createGuestUser();
    }
  } else {
    currentUser = createGuestUser();
  }
  updateNavbarUserUI();
  applyAgeAdaptiveUI();
}

async function refreshAuthenticatedUser() {
  if (typeof AvyaanAPI === 'undefined') return;
  const hadSessionHint = !!AvyaanAPI.getToken();
  const apiUser = await AvyaanAPI.getMe();
  if (!apiUser) {
    if (hadSessionHint) {
      AvyaanAPI.logout();
      currentUser = createGuestUser();
      activateLearnerContext(currentUser);
      updateNavbarUserUI();
      renderGrid();
    }
    return;
  }
  // sessionStorage is cleared on a full page reload, but a production
  // HttpOnly session cookie survives it.  Recreate the non-secret local
  // session hint after the server validates that cookie so all authenticated
  // UI actions continue to use cookie credentials.
  if (!AvyaanAPI.getToken()) {
    // The API may use an HttpOnly Worker cookie without a readable CSRF cookie.
    // A non-secret sentinel keeps dashboard guards enabled after reload.
    AvyaanAPI.setToken(null, 'cookie');
  }
  const stored = JSON.parse(avyaanStorage.getItem('avyaan_user') || '{}');
  currentUser = localUserFromApi(
    apiUser,
    stored.grade || 1,
    stored.name || apiUser.name
  );
  avyaanStorage.setItem('avyaan_user', JSON.stringify(currentUser));
  activateLearnerContext(currentUser);
  updateNavbarUserUI();
  renderGrid();
  updateMasteryScorecard();
}
// Age-adaptive UI: younger kids get friendlier wording and bigger type.
function applyAgeAdaptiveUI() {
  const input = document.getElementById('searchInput');
  const young = currentUser && currentUser.grade <= 5;
  if (input) {
    input.placeholder = young
      ? 'Search for a topic…'
      : 'Search topics, formulas, concepts…';
  }
  document.body.classList.toggle('kid-mode', !!young);
}

// Small, self-contained landing-page demonstration. It intentionally uses a
// generic concept rather than protected lesson data or answer keys.
function updateShadowDemo(value) {
  const sunAngle = Math.max(15, Math.min(75, Number(value) || 45));
  const shadow = document.getElementById('shadowDemoShadow');
  const sun = document.querySelector('.shadow-demo-sun');
  const reading = document.getElementById('shadowDemoReading');
  const output = document.getElementById('shadowDemoValue');
  const length = Math.round(24 + (75 - sunAngle) * 1.05);
  const tilt = Math.round((sunAngle - 45) * 0.82);
  if (shadow) {
    shadow.style.setProperty('--shadow-length', `${length}%`);
    shadow.style.setProperty('--shadow-angle', `${tilt}deg`);
  }
  if (sun) {
    sun.style.left = `${20 + ((sunAngle - 15) / 60) * 58}%`;
    sun.style.top = `${16 + ((75 - sunAngle) / 60) * 25}%`;
  }
  if (output) output.value = `${sunAngle}°`;
  if (reading) reading.textContent = sunAngle < 35 ? 'Long shadow' : sunAngle > 58 ? 'Short shadow' : 'Medium shadow';
}

// Fill dynamic stats (topic/subject counts) so hardcoded numbers never drift
function updateDynamicStats() {
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  const authoredTopics = AVYAAN_DATA.topics;
  const learnerTopics = authoredTopics.filter(isPublicTopicForLearner);
  const subjects = new Set(authoredTopics.map(t => t.subject)).size;
  const classes = new Set(AVYAAN_DATA.topics.map(t => t.class_level)).size;
  set('statTopics', learnerTopics.length);
  set('statSubjects', subjects);
  set('statClasses', classes);
  set('statTools', '20+');
  set('heroLessonCount', learnerTopics.length);
  set('heroAuthoredLessonCount', authoredTopics.length);
  set('footerTopicCount', learnerTopics.length);
  set('footerSubjectCount', subjects);
  set('footerClassCount', classes);
  set('aboutLessonCount', authoredTopics.length);
  set('aboutSubjectCount', subjects);
  syncThemeToggle();
}

// Deep-link hash navigation (used by About page footer/nav links)
function handleHashNavigation() {
  const h = (location.hash || '').toLowerCase();
  if (!h) return;
  if (h === '#login') { openLoginModal(); return; }
  if (h === '#achievements') { openModal('achievementsModal'); return; }
  if (h === '#knowledge-map') { if (typeof toast === 'function') toast('Knowledge Map is coming soon.'); return; }
  if (h === '#progress') { openDashboard(); return; }
  if (h === '#daily-challenge') { startDailyChallenge(); return; }
  const classMatch = h.match(/^#class-(\d+)$/);
  if (classMatch) {
    const n = parseInt(classMatch[1], 10);
    const chips = document.querySelectorAll('#classChips .chip');
    if (n >= 1 && n <= 10 && chips[n]) chips[n].click();
    return;
  }
  const subjectMatch = h.match(/^#subject-(.+)$/);
  if (subjectMatch) {
    const slug = decodeURIComponent(subjectMatch[1]).toLowerCase();
    const slugMap = {
      'mathematics': 'Mathematics',
      'math': 'Mathematics',
      'physics': 'Physics',
      'chemistry': 'Chemistry',
      'biology': 'Biology',
      'science': 'Science',
      'computer-science-and-ai': 'Computer Science & AI',
      'cs-and-ai': 'Computer Science & AI',
      'earth-and-space': 'Earth & Space'
    };
    const name = slugMap[slug];
    if (name) {
      const chips = document.querySelectorAll('#subjectChips .chip');
      for (let i = 1; i < chips.length; i++) {
        const chipName = chips[i].textContent.trim();
        if (chipName === name || (chipName === 'CS & AI' && name === 'Computer Science & AI')) {
          chips[i].click();
          break;
        }
      }
    }
  }
}

function updateNavbarUserUI() {
  applyAgeAdaptiveUI(); // re-adapt when the user or grade changes
  renderSubjectChips(); // grade-aware subject chips
  const avatarEl = document.getElementById('userAvatar');
  const nameEl = document.getElementById('userName');
  const tierLabelEl = document.getElementById('userTierLabel');
  const pillEl = document.getElementById('tierPill');
  const gradeSelectEl = document.getElementById('userGradeSelect');
  const loginNavBtn = document.getElementById('loginNavBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const userMenuTrigger = document.getElementById('userMenuTrigger');
  const loginMobileBtn = document.getElementById('loginMobileBtn');
  const logoutMobileBtn = document.getElementById('logoutMobileBtn');
  const streakCountEl = document.getElementById('streakCount');
  const streakCountMobileEl = document.getElementById('streakCountMobile');
  const xpDisplayMobileEl = document.getElementById('xpDisplayMobile');
  const levelDisplayMobileEl = document.getElementById('levelDisplayMobile');

  // Load daily streak count
  const streakData = JSON.parse(avyaanStorage.getItem('avyaan_streak_data') || '{}');
  const streakVal = streakData.count || avyaanStorage.getItem('avyaan_streak') || '0';
  if (streakCountEl) streakCountEl.textContent = streakVal;
  if (streakCountMobileEl) streakCountMobileEl.textContent = streakVal;

  const isLoggedIn = currentUser && !currentUser.isGuest;

  if (isLoggedIn) {
    if (avatarEl) avatarEl.textContent = (currentUser.name || 'S').charAt(0).toUpperCase();
    if (nameEl) nameEl.textContent = currentUser.name;
    if (tierLabelEl) tierLabelEl.textContent = `Class ${currentUser.grade}`;

    if (gradeSelectEl) {
      gradeSelectEl.style.display = 'block';
      gradeSelectEl.value = currentUser.grade;
      if (currentUser.role === 'Student' || !currentUser.role) {
        gradeSelectEl.disabled = true;
        gradeSelectEl.title = 'Your account is locked to Class ' + currentUser.grade;
      } else {
        gradeSelectEl.disabled = false;
        gradeSelectEl.title = 'Select Class';
      }
    }
    const adminNavBtn = document.getElementById('adminNavBtn');
    if (adminNavBtn) {
      adminNavBtn.style.display = (currentUser.role === 'Admin') ? 'flex' : 'none';
    }

    if (pillEl) {
      if (currentUser.grade <= 5) {
        pillEl.textContent = 'Primary';
      } else if (currentUser.grade <= 8) {
        pillEl.textContent = 'Pro';
      } else {
        pillEl.textContent = 'Master';
      }
    }

    // Show avatar dropdown, hide login button
    if (userMenuTrigger) userMenuTrigger.style.display = 'block';
    if (loginNavBtn) loginNavBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'flex';
    if (loginMobileBtn) loginMobileBtn.style.display = 'none';
    if (logoutMobileBtn) logoutMobileBtn.style.display = 'flex';
  } else {
    if (avatarEl) avatarEl.textContent = 'G';
    if (nameEl) nameEl.textContent = 'Guest';
    if (tierLabelEl) tierLabelEl.textContent = currentUser && currentUser.grade ? `Class ${currentUser.grade} (free preview)` : 'Not enrolled';
    if (pillEl) pillEl.textContent = 'Free';

    if (gradeSelectEl) {
      gradeSelectEl.style.display = 'none';
      gradeSelectEl.disabled = false;
    }
    const adminNavBtn = document.getElementById('adminNavBtn');
    if (adminNavBtn) adminNavBtn.style.display = 'none';

    // Show login button, hide avatar dropdown
    if (userMenuTrigger) userMenuTrigger.style.display = 'none';
    if (loginNavBtn) loginNavBtn.style.display = 'inline-flex';
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (loginMobileBtn) loginMobileBtn.style.display = 'flex';
    if (logoutMobileBtn) logoutMobileBtn.style.display = 'none';
  }

  // Sync XP/level to mobile
  const xpEl = document.getElementById('xpDisplay');
  const levelEl = document.getElementById('levelDisplay');
  if (xpDisplayMobileEl && xpEl) xpDisplayMobileEl.textContent = xpEl.textContent;
  if (levelDisplayMobileEl && levelEl) levelDisplayMobileEl.textContent = levelEl.textContent;
}

// Update Grade Mastery Scorecard Progress Bar
function updateMasteryScorecard() {
  const countLabel = document.getElementById('masteryPercentLabel');
  const progressBar = document.getElementById('masteryProgressBar');

  const learnerTopicIds = new Set(AVYAAN_DATA.topics.filter(isPublicTopicForLearner).map(t => t.id));
  const total = learnerTopicIds.size;
  const count = [...completedTopicIds].filter(id => learnerTopicIds.has(id)).length;
  const percent = Math.min(100, Math.round((count / total) * 100));

  if (countLabel) countLabel.textContent = `${count} of ${total} Learner Topics Mastered (${percent}%)`;
  if (progressBar) progressBar.style.width = `${Math.max(4, percent)}%`;
}

// Daily Streak Engine — increments on first completion of the day, resets if a day is missed
function updateStreak() {
  const today = new Date().toDateString();
  const streakData = JSON.parse(avyaanStorage.getItem('avyaan_streak_data') || '{}');
  const streakEl = document.getElementById('streakCount');

  if (streakData.lastActiveDate === today) {
    // Already counted today — no change
    if (streakEl) streakEl.textContent = streakData.count;
    return;
  }

  // Check if yesterday was the last active day (streak continues)
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (streakData.lastActiveDate === yesterday) {
    streakData.count = (streakData.count || 0) + 1;
  } else {
    // Streak broken or first ever
    streakData.count = 1;
  }
  streakData.lastActiveDate = today;
  avyaanStorage.setItem('avyaan_streak_data', JSON.stringify(streakData));
  avyaanStorage.setItem('avyaan_streak', String(streakData.count));
  if (streakEl) streakEl.textContent = streakData.count;
}

// ==========================================================================
// GAMIFICATION ENGINE — XP, Levels, Badges, SmartScore, Review Queue
// ==========================================================================

// XP awarding + level calculation
const XP_LEVELS = [
  { name: 'Explorer', minXP: 0, icon: '🧭' },
  { name: 'Seeker', minXP: 100, icon: '🔍' },
  { name: 'Scholar', minXP: 300, icon: '📖' },
  { name: 'Thinker', minXP: 600, icon: '💡' },
  { name: 'Sage', minXP: 1000, icon: '🧙' },
  { name: 'Master', minXP: 2000, icon: '👑' }
];

function getUserLevel() {
  let level = XP_LEVELS[0];
  for (const l of XP_LEVELS) {
    if (userXP >= l.minXP) level = l;
  }
  return level;
}

function getNextLevel() {
  const current = getUserLevel();
  const idx = XP_LEVELS.indexOf(current);
  return idx < XP_LEVELS.length - 1 ? XP_LEVELS[idx + 1] : null;
}

// Level for an arbitrary XP value (used by the parent dashboard for saved
// child profiles that aren't the live learner).
function getUserLevelForXP(xp) {
  let level = XP_LEVELS[0];
  for (const l of XP_LEVELS) {
    if (xp >= l.minXP) level = l;
  }
  return level;
}

function awardXP(amount, reason) {
  const oldLevel = getUserLevel();
  userXP += amount;
  avyaanStorage.setItem('avyaan_xp', String(userXP));
  const newLevel = getUserLevel();
  updateXPDisplay();
  if (newLevel.name !== oldLevel.name) {
    showBadgeNotification('🎉 Level Up!', `You are now a ${newLevel.icon} ${newLevel.name}!`, '#7c3aed');
    checkBadges();
  }
  scheduleCloudSync();
}

function updateXPDisplay() {
  const xpEl = document.getElementById('xpDisplay');
  const levelEl = document.getElementById('levelDisplay');
  if (xpEl) xpEl.textContent = `${userXP} XP`;
  const level = getUserLevel();
  if (levelEl) levelEl.textContent = `${level.icon} ${level.name}`;
}

// Badge definitions
const BADGE_DEFINITIONS = [
  { id: 'first_topic', name: 'First Steps', icon: '🌱', desc: 'Master your first topic', condition: () => completedTopicIds.size >= 1 },
  { id: 'five_topics', name: 'Getting Warmed Up', icon: '🔥', desc: 'Master 5 topics', condition: () => completedTopicIds.size >= 5 },
  { id: 'ten_topics', name: 'Double Digits', icon: '🎯', desc: 'Master 10 topics', condition: () => completedTopicIds.size >= 10 },
  { id: 'twentyfive_topics', name: 'Quarter Century', icon: '🌟', desc: 'Master 25 topics', condition: () => completedTopicIds.size >= 25 },
  { id: 'fifty_topics', name: 'Half Century', icon: '🏆', desc: 'Master 50 topics', condition: () => completedTopicIds.size >= 50 },
  { id: 'hundred_topics', name: 'Centurion', icon: '💯', desc: 'Master 100 topics', condition: () => completedTopicIds.size >= 100 },
  { id: 'first_solidified', name: 'Memory Proof', icon: '🧠', desc: 'Prove mastery with your first successful spaced recall', condition: () => solidifiedTopicIds.size >= 1 },
  { id: 'ten_solidified', name: 'Steel Trap', icon: '🛡️', desc: 'Solidify 10 topics through successful recalls', condition: () => solidifiedTopicIds.size >= 10 },
  { id: 'perfect_quiz', name: 'Flawless', icon: '✨', desc: 'Get a perfect quiz score', condition: () => quizCorrectCount > 0 && quizSessionDone && quizCorrectCount === quizAnsweredCount },
  { id: 'streak_3', name: 'On a Roll', icon: '🔥', desc: '3-day learning streak', condition: () => { const s = JSON.parse(avyaanStorage.getItem('avyaan_streak_data') || '{}'); return (s.count || 0) >= 3; } },
  { id: 'streak_7', name: 'Week Warrior', icon: '⚔️', desc: '7-day learning streak', condition: () => { const s = JSON.parse(avyaanStorage.getItem('avyaan_streak_data') || '{}'); return (s.count || 0) >= 7; } },
  { id: 'streak_30', name: 'Unstoppable', icon: '🚀', desc: '30-day learning streak', condition: () => { const s = JSON.parse(avyaanStorage.getItem('avyaan_streak_data') || '{}'); return (s.count || 0) >= 30; } },
  { id: 'all_subjects', name: 'Renaissance', icon: '🎨', desc: 'Master topics in all 6 subjects', condition: () => {
    const subjects = new Set();
    completedTopicIds.forEach(id => {
      const t = AVYAAN_DATA.topics.find(t => t.id === id);
      if (t) subjects.add(t.subject);
    });
    return subjects.size >= 6;
  }},
  { id: 'first_prediction', name: 'Crystal Ball', icon: '🔮', desc: 'Make your first prediction', condition: () => hasPredicted },
  { id: 'daily_challenge', name: 'Daily Hero', icon: '⭐', desc: 'Complete a Daily Challenge', condition: () => dailyChallengeData.completed === true },
  { id: 'session_3', name: 'Habit Builder', icon: '📅', desc: 'Complete 3 daily sessions', condition: () => getSessionStreakCount() >= 3 },
  { id: 'session_7', name: 'Perfect Week', icon: '🏆', desc: 'Complete 7 daily sessions in a row', condition: () => getSessionStreakCount() >= 7 },
  { id: 'session_freeze', name: 'Phoenix', icon: '🔥', desc: 'Have a freeze token save your session streak', condition: () => (getSessionStreakData().freezeUsed || 0) >= 1 },
  { id: 'level_seeker', name: 'Seeker', icon: '🔍', desc: 'Reach Seeker level (100 XP)', condition: () => userXP >= 100 },
  { id: 'level_scholar', name: 'Scholar', icon: '📖', desc: 'Reach Scholar level (300 XP)', condition: () => userXP >= 300 },
  { id: 'level_thinker', name: 'Thinker', icon: '💡', desc: 'Reach Thinker level (600 XP)', condition: () => userXP >= 600 },
  { id: 'level_sage', name: 'Sage', icon: '🧙', desc: 'Reach Sage level (1000 XP)', condition: () => userXP >= 1000 },
];

function checkBadges() {
  BADGE_DEFINITIONS.forEach(badge => {
    if (!earnedBadges.has(badge.id) && badge.condition()) {
      earnedBadges.add(badge.id);
      avyaanStorage.setItem('avyaan_badges', JSON.stringify(Array.from(earnedBadges)));
      showBadgeNotification(`${badge.icon} ${badge.name}`, badge.desc, '#059669');
      // Badge XP is intentionally NOT activity-logged: it is a meta-achievement with
      // no single topic, already surfaced via the badge toast + dashboard grid.
      // (Allowed exemption in tools/ci_check.py check_xp_logging — keep in sync.)
      awardXP(50, `Badge: ${badge.name}`);
    }
  });
}

function showBadgeNotification(title, desc, color) {
  const notif = document.createElement('div');
  const safeColor = /^#[0-9a-f]{3,8}$/i.test(String(color || '')) ? color : '#2563eb';
  notif.style.cssText = `position: fixed; top: 80px; right: 20px; background: var(--bg-card); border: 2px solid ${safeColor}; border-radius: 12px; padding: 0.8rem 1.2rem; box-shadow: 0 4px 20px rgba(0,0,0,0.15); z-index: 9999; max-width: 300px; animation: slideIn 0.3s ease;`;
  notif.innerHTML = `<div style="font-weight: 800; font-size: 0.9rem; color: ${safeColor};">${escapeHtml(title)}</div><div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem;">${escapeHtml(desc)}</div>`;
  document.body.appendChild(notif);
  setTimeout(() => { notif.style.opacity = '0'; notif.style.transition = 'opacity 0.5s'; }, 4000);
  setTimeout(() => notif.remove(), 5000);
}

// SmartScore — 0-100 per topic, adapts based on quiz performance
function getSmartScore(topicId) {
  return smartScores[topicId] || 0;
}

function updateSmartScore(topicId, isCorrect, totalQuestions) {
  const current = getSmartScore(topicId);
  // SmartScore algorithm: correct answers boost, wrong answers reduce but less harsh early on
  const gain = isCorrect ? Math.ceil((100 - current) * 0.15) + 5 : -Math.ceil(current * 0.1) - 2;
  const newScore = Math.max(0, Math.min(100, current + gain));
  smartScores[topicId] = newScore;
  avyaanStorage.setItem('avyaan_smart_scores', JSON.stringify(smartScores));
  return newScore;
}

// Spaced Review / Memory Pulse — SM-2 scheduling with ease factor + repetition count.
// The scheduling math lives in the testable core (sm2Next); this function is only
// the localStorage/queue wrapper around it.
const SM2_DAY_MS = 86400000;

function getReviewEntry(topicId) {
  return reviewQueue.find(r => r.topicId === topicId) || null;
}

function scheduleReview(topicId, correct) {
  const next = sm2Next(getReviewEntry(topicId), correct);
  reviewQueue = reviewQueue.filter(r => r.topicId !== topicId);
  reviewQueue.push({ topicId, dueDate: Date.now() + SM2_DAY_MS * next.intervalDays, intervalDays: next.intervalDays, reps: next.reps, ease: next.ease, correct: correct !== false });
  avyaanStorage.setItem('avyaan_review_queue', JSON.stringify(reviewQueue));
}

function getTopicsDueForReview() {
  const now = Date.now();
  return reviewQueue.filter(r => r.dueDate <= now).map(r => r.topicId);
}

// Lightweight activity log for the parent/teacher dashboard
function logActivity(topicId, type) {
  const topic = AVYAAN_DATA.topics.find(t => t.id === topicId);
  if (!topic) return;
  let log = [];
  try { log = JSON.parse(avyaanStorage.getItem('avyaan_activity_log') || '[]'); } catch (e) { log = []; }
  log.push({ topicId, title: topic.title, emoji: topic.emoji, subject: topic.subject, classLevel: topic.class_level, type, ts: Date.now() });
  if (log.length > 200) log = log.slice(-200);
  avyaanStorage.setItem('avyaan_activity_log', JSON.stringify(log));
}

function getActivityLog() {
  try { return JSON.parse(avyaanStorage.getItem('avyaan_activity_log') || '[]'); } catch (e) { return []; }
}

// Misconception tracking — every wrong answer that triggers myth/fact coaching
// is logged so recurring misunderstandings surface in the parent report.
function logMisconception(topicId, myth) {
  const topic = AVYAAN_DATA.topics.find(t => t.id === topicId);
  if (!topic || !myth) return;
  let log = [];
  try { log = JSON.parse(avyaanStorage.getItem('avyaan_misconceptions') || '[]'); } catch (e) { log = []; }
  log.push({ topicId, title: topic.title, emoji: topic.emoji, myth: myth.slice(0, 200), ts: Date.now() });
  if (log.length > 300) log = log.slice(-300);
  avyaanStorage.setItem('avyaan_misconceptions', JSON.stringify(log));
}

function getMisconceptionLog() {
  try { return JSON.parse(avyaanStorage.getItem('avyaan_misconceptions') || '[]'); } catch (e) { return []; }
}

function timeAgo(ts) {
  const secs = Math.floor((Date.now() - ts) / 1000);
  if (secs < 60) return 'just now';
  if (secs < 3600) return Math.floor(secs / 60) + 'm ago';
  if (secs < 86400) return Math.floor(secs / 3600) + 'h ago';
  return Math.floor(secs / 86400) + 'd ago';
}

function getReviewCount() {
  return getTopicsDueForReview().length;
}

// ---- Topic of the Week: a deterministic, curated-feel pick that rotates ----
// through the grade-appropriate pool each week, seeded by ISO week + year.
// The daily challenge prefers it on Mondays so the weekly hero stays in front.
function getWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}

function getTopicOfTheWeek() {
  const grade = (currentUser && currentUser.grade) || 1;
  let pool = AVYAAN_DATA.topics.filter(t => isTopicUnlocked(t));
  // Never fall back to another class: the selected/enrolled class is the product boundary for both free sampling and paid access.
  if (pool.length === 0) pool = AVYAAN_DATA.topics.filter(t => t.class_level === grade);
  if (pool.length === 0) pool = AVYAAN_DATA.topics.filter(t => t.class_level === 1);

  const week = getWeekNumber(new Date());
  const year = new Date().getFullYear();
  // Deterministic index so the topic stays fixed for the whole week.
  const idx = ((year * 53 + week) * 31) % pool.length;
  return pool[idx];
}

// Daily Challenge — one random unlocked topic quiz per day
function getDailyChallenge() {
  const today = new Date().toDateString();
  const grade = (currentUser && currentUser.grade) || 1;
  const pool = AVYAAN_DATA.topics.filter(t => isTopicUnlocked(t));
  const safePool = pool.length > 0 ? pool : AVYAAN_DATA.topics.filter(t => t.class_level === grade);

  // Always pick from topics the current user can actually open
  const storedTopic = dailyChallengeData.topicId ? AVYAAN_DATA.topics.find(t => t.id === dailyChallengeData.topicId) : null;
  const storedStillValid = storedTopic && safePool.some(t => t.id === storedTopic.id);

  if (dailyChallengeData.date !== today || !storedStillValid) {
    // Mondays anchor on the topic of the week; other days random from the pool.
    // For middle/high school, weight the pick toward medium/hard stretch lessons.
    let pickPool = safePool;
    if (grade >= 6) {
      const harder = safePool.filter(t => t.difficulty === 'hard' || t.difficulty === 'medium');
      if (harder.length >= 3 && Math.random() < 0.7) pickPool = harder;
    }
    const chosen = new Date().getDay() === 1 ? getTopicOfTheWeek() : pickPool[Math.floor(Math.random() * pickPool.length)];
    dailyChallengeData = { date: today, topicId: chosen.id, completed: false };
    avyaanStorage.setItem('avyaan_daily_challenge', JSON.stringify(dailyChallengeData));
  }
  return dailyChallengeData;
}

function completeDailyChallenge() {
  dailyChallengeData.completed = true;
  avyaanStorage.setItem('avyaan_daily_challenge', JSON.stringify(dailyChallengeData));
  if (dailyChallengeData.topicId) logActivity(dailyChallengeData.topicId, 'daily-challenge');
  awardXP(100, 'Daily Challenge completed');
  checkBadges();
  updateDailyChallengeUI();
}

function startDailyChallenge() {
  const dc = getDailyChallenge();
  if (dc.completed) return;
  openTopicDetail(dc.topicId);
}

// ==========================================================================
// ACHIEVEMENT PANEL — visual grid of earned/locked badges
// ==========================================================================
function renderAchievementPanel() {
  const container = document.getElementById('achievementPanelContent');
  if (!container) return;

  const level = getUserLevel();
  const nextLevel = getNextLevel();
  const xpToNext = nextLevel ? nextLevel.minXP - userXP : 0;
  const levelProgress = nextLevel ? Math.min(100, ((userXP - level.minXP) / (nextLevel.minXP - level.minXP)) * 100) : 100;

  const badgesHtml = BADGE_DEFINITIONS.map(badge => {
    const earned = earnedBadges.has(badge.id);
    return `
      <div style="background: ${earned ? '#f0fdf4' : '#f8fafc'}; border: 2px solid ${earned ? '#6ee7b7' : '#e2e8f0'}; border-radius: 12px; padding: 0.8rem; text-align: center; ${earned ? '' : 'opacity: 0.5;'}">
        <div style="font-size: 2rem; ${earned ? '' : 'filter: grayscale(1);'}">${badge.icon}</div>
        <div style="font-size: 0.78rem; font-weight: 800; color: ${earned ? '#059669' : '#64748b'}; margin-top: 0.3rem;">${badge.name}</div>
        <div style="font-size: 0.68rem; color: var(--text-dim); margin-top: 0.1rem;">${badge.desc}</div>
        ${earned ? '<div style="font-size: 0.6rem; font-weight: 800; color: #059669; margin-top: 0.2rem;">✓ EARNED</div>' : '<div style="font-size: 0.6rem; color: var(--text-dim); margin-top: 0.2rem;">🔒 Locked</div>'}
      </div>
    `;
  }).join('');

  const reviewCount = getReviewCount();

  container.innerHTML = `
    <!-- LEVEL & XP -->
    <div style="background: linear-gradient(135deg, #f5f3ff, #ede9fe); border: 2px solid #c4b5fd; border-radius: 12px; padding: 1.2rem; margin-bottom: 1rem; text-align: center;">
      <div style="font-size: 3rem;">${level.icon}</div>
      <div style="font-size: 1.3rem; font-weight: 900; color: #5b21b6;">${level.name}</div>
      <div style="font-size: 0.85rem; color: #7c3aed; margin-top: 0.2rem;">${userXP} XP total</div>
      ${nextLevel ? `
        <div style="margin-top: 0.6rem;">
          <div style="font-size: 0.72rem; color: #7c3aed; margin-bottom: 0.2rem;">${xpToNext} XP to ${nextLevel.icon} ${nextLevel.name}</div>
          <div style="background: #ddd6fe; height: 8px; border-radius: 4px; overflow: hidden;">
            <div style="width: ${levelProgress}%; height: 100%; background: #7c3aed; transition: width 0.4s;"></div>
          </div>
        </div>
      ` : '<div style="font-size: 0.72rem; color: #7c3aed; margin-top: 0.3rem;">👑 Maximum level reached!</div>'}
    </div>

    <!-- QUICK STATS -->
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; margin-bottom: 1rem;">
      <div style="background: var(--accent-primary-light); border-radius: 8px; padding: 0.6rem; text-align: center;">
        <div style="font-size: 1.3rem; font-weight: 900; color: #2563eb;">${completedTopicIds.size}</div>
        <div style="font-size: 0.65rem; color: #1e40af; font-weight: 700;">MASTERED</div>
      </div>
      <div style="background: #fef3c7; border-radius: 8px; padding: 0.6rem; text-align: center;">
        <div style="font-size: 1.3rem; font-weight: 900; color: #d97706;">${earnedBadges.size}</div>
        <div style="font-size: 0.65rem; color: #92400e; font-weight: 700;">BADGES</div>
      </div>
      <div style="background: #ecfdf5; border-radius: 8px; padding: 0.6rem; text-align: center; cursor: pointer;" onclick="startReviewSession()">
        <div style="font-size: 1.3rem; font-weight: 900; color: #059669;">${reviewCount}</div>
        <div style="font-size: 0.65rem; color: #065f46; font-weight: 700;">DUE REVIEW</div>
      </div>
    </div>

    <!-- BADGES GRID -->
    <h3 style="font-size: 1rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.6rem;">🎖️ Achievements (${earnedBadges.size}/${BADGE_DEFINITIONS.length})</h3>
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 0.6rem;">
      ${badgesHtml}
    </div>
  `;
}

// Start a spaced review session
function startReviewSession() {
  if (typeof toast === 'function') toast('Spaced Review is coming soon while we finish the secure review flow.');
}

// ==========================================================================
// GUIDED DAILY SESSION — a curated learning flow for one sitting:
//   1. due spaced-review topics (they're at the edge of forgetting)
//   2. fresh topics from the student's path (new learning)
//   3. the Daily Challenge (one exam-style question) as the closer
// A session dock in the topic modal shows progress and lets the child
// advance; closing a session topic auto-advances to the next one.
// ==========================================================================
let dailySession = null; // { queue: [{id, kind}], idx, xpStart, masteredStart, startedAt }

function buildDailySessionQueue() {
  const grade = (currentUser && currentUser.grade) || 1;
  const queue = [];
  const seen = new Set();
  const push = (id, kind) => { if (id && !seen.has(id)) { seen.add(id); queue.push({ id: id, kind: kind }); } };

  // 1. Due reviews — up to 4, soonest first
  getTopicsDueForReview().slice(0, 4).forEach(id => push(id, 'review'));

  // 2. Fresh topics: current path topic per visible subject, then any unmastered
  const fresh = [];
  visibleSubjects().forEach(subj => {
    const cur = getCurrentPathTopic(subj, grade);
    if (cur && !completedTopicIds.has(cur.id)) fresh.push(cur.id);
  });
  // Top up with unmastered, unlocked topics if we still have room
  AVYAAN_DATA.topics.forEach(t => {
    if (fresh.length >= 3) return;
    if (t.class_level <= grade && !completedTopicIds.has(t.id) && isTopicUnlocked(t)) fresh.push(t.id);
  });
  fresh.forEach(id => push(id, 'fresh'));

  // 3. Daily challenge closer
  const dc = getDailyChallenge();
  if (dc && !dc.completed) push(dc.topicId, 'challenge');

  return queue;
}

// Daily-session streak: a separate, stronger habit loop from the learning
// streak. Completing a session advances it; a freeze token (earned every
// 3-day milestone) saves it on a missed day; a perfect 7-day week awards a
// bonus and is tracked for the parent report.
function getSessionStreakData() {
  try { return JSON.parse(avyaanStorage.getItem('avyaan_session_streak') || '{}'); } catch (e) { return {}; }
}

function recordSessionStreak() {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const s = getSessionStreakData();
  if (s.lastDate === today) return s; // already recorded today

  if (s.lastDate === yesterday) {
    s.count = (s.count || 0) + 1;
  } else if (s.lastDate && s.count > 0) {
    // Missed a day — try a freeze token before breaking the streak
    if ((s.tokens || 0) > 0) {
      s.tokens -= 1;
      s.count = (s.count || 0) + 1;
      s.freezeUsed = (s.freezeUsed || 0) + 1;
    } else {
      s.count = 1;
    }
  } else {
    s.count = 1;
  }
  s.lastDate = today;

  // Freeze token every 3-day milestone, capped at 3
  if (s.count > 0 && s.count % 3 === 0 && (s.tokens || 0) < 3) s.tokens = (s.tokens || 0) + 1;

  // Perfect week: 7 distinct days within the rolling 7-day window
  const week = (s.week || []).filter(d => (Date.now() - new Date(d).getTime()) < 7 * 86400000);
  if (!week.includes(today)) week.push(today);
  s.week = week;
  const perfectWeek = week.length >= 7;
  s.perfectWeek = perfectWeek || s.perfectWeek;
  if (perfectWeek && !s.perfectWeekAwarded) {
    s.perfectWeekAwarded = true;
    awardXP(50, 'Perfect learning week');
  }

  avyaanStorage.setItem('avyaan_session_streak', JSON.stringify(s));
  checkBadges();
  return s;
}

function getSessionStreakCount() {
  return getSessionStreakData().count || 0;
}

function startDailySession() {
  const queue = buildDailySessionQueue();
  if (queue.length === 0) {
    alert('🎉 Nothing left to learn today — every topic is mastered and nothing is due for review. Amazing work!');
    return;
  }
  dailySession = { queue: queue, idx: 0, xpStart: userXP, masteredStart: completedTopicIds.size, startedAt: Date.now() };
  openDailySessionTopic();
}

function openDailySessionTopic() {
  if (!dailySession) return;
  const item = dailySession.queue[dailySession.idx];
  if (!item) { finishDailySession(); return; }
  openTopicDetail(item.id);
}

function advanceDailySession() {
  if (!dailySession) return;
  dailySession.idx += 1;
  openDailySessionTopic();
}

function endDailySession() {
  if (!dailySession) return;
  const s = dailySession;
  dailySession = null; // stop auto-advance before the close triggers it
  closeModal('detailModal');
  finishDailySession(s);
}

function finishDailySession(session) {
  const s = session || dailySession;
  dailySession = null;
  if (!s) return;
  const xpGained = userXP - s.xpStart;
  const mastered = completedTopicIds.size - s.masteredStart;
  const studied = s.queue.length;
  const sStreak = recordSessionStreak();
  const sCount = sStreak.count || 0;
  const freezeNote = sStreak.freezeUsed ? ' 🔥 (a freeze token saved it!)' : '';
  const perfectNote = sStreak.perfectWeek && sStreak.perfectWeekAwarded ? ' · 🏆 Perfect week bonus!' : '';
  const secs = Math.max(1, Math.round((Date.now() - s.startedAt) / 1000));
  const mins = Math.floor(secs / 60);
  const timeStr = mins > 0 ? mins + ' min' : secs + ' sec';
  const summary = `      <div style="text-align:center; padding: 0.5rem 0;">
      <div style="font-size:3rem;">🎯</div>
      <h3 style="margin:0.5rem 0 0.2rem; font-weight:900; color:var(--text-main);">Session complete!</h3>
      <p style="font-size:0.9rem; color:var(--text-muted); margin:0 0 0.2rem;">You spent <b>${timeStr}</b> learning today.</p>
      <p style="font-size:0.95rem; font-weight:800; color:${sCount >= 7 ? '#059669' : '#b45309'}; margin:0 0 1rem;">🔥 Session streak: ${sCount} day${sCount === 1 ? '' : 's'}${freezeNote}${perfectNote}</p>
      <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:0.5rem; margin-bottom:1rem;">
        <div style="background:var(--accent-primary-light); border-radius:10px; padding:0.8rem;">
          <div style="font-size:1.4rem; font-weight:900; color:#2563eb;">${studied}</div>
          <div style="font-size:0.68rem; font-weight:700; color:#1e40af;">TOPICS<br>STUDIED</div>
        </div>
        <div style="background:#fef3c7; border-radius:10px; padding:0.8rem;">
          <div style="font-size:1.4rem; font-weight:900; color:#d97706;">+${xpGained}</div>
          <div style="font-size:0.68rem; font-weight:700; color:#92400e;">XP<br>EARNED</div>
        </div>
        <div style="background:#ecfdf5; border-radius:10px; padding:0.8rem;">
          <div style="font-size:1.4rem; font-weight:900; color:#059669;">${mastered}</div>
          <div style="font-size:0.68rem; font-weight:700; color:#065f46;">NEWLY<br>MASTERED</div>
        </div>
      </div>
      <button class="btn btn-primary" onclick="closeModal('sessionSummaryModal'); renderGrid();" style="width:100%;">Done — back to home</button>
    </div>`;
  const holder = document.getElementById('sessionSummaryContent');
  if (holder) holder.innerHTML = summary;
  openModal('sessionSummaryModal');
  updateMasteryScorecard();
  renderGrid();
}

// Session dock rendered inside the topic modal when a daily session is active
function renderSessionDock() {
  if (!dailySession) return '';
  const total = dailySession.queue.length;
  const pos = dailySession.idx + 1;
  const cur = dailySession.queue[dailySession.idx];
  const kindLabel = cur && cur.kind === 'review' ? '🔁 Review' : cur && cur.kind === 'challenge' ? '⭐ Challenge' : '📖 New';
  const isLast = dailySession.idx >= total - 1;
  const nextLabel = isLast ? 'Finish' : 'Next →';
  return `
    <div style="display:flex; align-items:center; justify-content:space-between; gap:0.5rem; background:linear-gradient(90deg,#eff6ff,#f5f3ff); border:1px solid #c7d2fe; border-radius:10px; padding:0.55rem 0.8rem; margin-bottom:0.8rem; flex-wrap:wrap;">
      <div style="font-size:0.78rem; font-weight:800; color:#3730a3;">🎯 Daily Session · ${pos}/${total} <span style="font-weight:700; color:#6366f1;">(${kindLabel})</span></div>
      <div style="display:flex; gap:0.4rem;">
        <button class="btn" style="font-size:0.72rem; padding:0.35rem 0.8rem; background:#eef2ff; border-color:#c7d2fe; color:#4338ca; font-weight:800;" onclick="advanceDailySession()">${nextLabel}</button>
        <button class="btn" style="font-size:0.72rem; padding:0.35rem 0.7rem; background:#f8fafc; border-color:#e2e8f0; color:#64748b; font-weight:700;" onclick="endDailySession()">End</button>
      </div>
    </div>`;
}

// ==========================================================================
// KNOWLEDGE MAP — SVG showing subjects → classes → topics with mastery
// ==========================================================================
function renderKnowledgeMap() {
  const container = document.getElementById('knowledgeMapContent');
  if (!container) return;

  const subjects = [...new Set(AVYAAN_DATA.topics.map(t => topicDisplaySubject(t)))];
  const subjectKeys = subjects.map(subjectColorKey);

  let html = '<div style="display: flex; flex-direction: column; gap: 1rem;">';

  subjects.forEach((subject, si) => {
    const subjKey = subjectKeys[si];
    const subjTopics = AVYAAN_DATA.topics.filter(t => topicDisplaySubject(t) === subject);
    const masteredCount = subjTopics.filter(t => completedTopicIds.has(t.id)).length;
    const masteryPct = Math.round((masteredCount / subjTopics.length) * 100);
    const score = subjTopics.reduce((sum, t) => sum + getSmartScore(t.id), 0);
    const avgScore = Math.round(score / subjTopics.length);

    // Class breakdown
    const classes = [...new Set(subjTopics.map(t => t.class_level))].sort((a, b) => a - b);
    const classBars = classes.map(cls => {
      const clsTopics = subjTopics.filter(t => t.class_level === cls);
      const clsMastered = clsTopics.filter(t => completedTopicIds.has(t.id)).length;
      const pct = Math.round((clsMastered / clsTopics.length) * 100);
      return `
        <div style="display: flex; align-items: center; gap: 0.4rem; margin: 0.15rem 0;">
          <span style="font-size: 0.7rem; font-weight: 700; color: var(--text-muted); min-width: 50px;">C${cls}</span>
          <div style="flex: 1; background: #e2e8f0; height: 12px; border-radius: 6px; overflow: hidden;">
            <div style="width: ${Math.max(2, pct)}%; height: 100%; background: var(--accent-primary); transition: width 0.4s;"></div>
          </div>
          <span style="font-size: 0.65rem; color: var(--text-dim); min-width: 35px; text-align: right;">${clsMastered}/${clsTopics.length}</span>
        </div>
      `;
    }).join('');

    html += `
      <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-left: 4px solid var(--accent-primary); border-radius: 0 12px 12px 0; padding: 1rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <div>
            <span class="subject-tag subject-color-${subjKey}" style="font-weight: 800;">${subject}</span>
            <span style="font-size: 0.75rem; color: var(--text-muted); margin-left: 0.4rem;">${subjTopics.length} topics</span>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.8rem; font-weight: 800; color: var(--accent-primary);">${masteryPct}% mastered</div>
            <div style="font-size: 0.68rem; color: var(--text-muted);">Avg SmartScore: ${avgScore}</div>
          </div>
        </div>
        ${classBars.join('')}
        <div style="margin-top: 0.6rem; padding-top: 0.5rem; border-top: 1px dashed var(--border-color); font-size: 0.68rem; color: var(--text-muted);">
          📖 ${new Set(subjTopics.map(t => t.chapter).filter(Boolean)).size} chapters across ${subjTopics.length} topics
        </div>
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;
}

// CLASS × SUBJECT COVERAGE MAP — how many topics exist for every (class, subject)
// Cell shading shows density; ⚠️ flags thin coverage (1–2 topics) worth expanding.
const COVERAGE_SUBJECTS = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science & AI', 'Earth & Space'];
const COVERAGE_CLASSES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const COVERAGE_SUBJ_COLOR = {
  'Mathematics': '#2563eb',
  'Physics': '#d97706',
  'Chemistry': '#059669',
  'Biology': '#9d174d',
  'Computer Science & AI': '#5b21b6',
  'Earth & Space': '#9a3412'
};

// ==========================================================================
// CURRICULUM ALIGNMENT — multi-board chapter & learning-outcome map
// ==========================================================================
let boardFilter = { board: 'NCERT / CBSE', class: 'all', subject: 'all' };
const BOARD_ORDER = ['NCERT / CBSE', 'ICSE', 'State Boards'];
const BOARD_EMOJI = { 'NCERT / CBSE': '🏛️', 'ICSE': '🎓', 'State Boards': '🗺️' };

function openBoardModal() {
  loadLazy('boards', renderBoardModal);
  openModal('boardModal');
}

function setBoardFilter(patch) {
  boardFilter = Object.assign({}, boardFilter, patch);
  renderBoardModal();
}

function renderBoardModal() {
  const container = document.getElementById('boardContent');
  if (!container) return;
  if (!boardsLoaded) {
    container.innerHTML = '<p style="color:var(--text-muted);">Loading curriculum data…</p>';
    loadLazy('boards', renderBoardModal);
    return;
  }
  const boards = AVYAAN_DATA.boards;
  if (!boards || !boards.boards) {
    container.innerHTML = '<p style="color:var(--text-muted);">Curriculum alignment data is not available yet.</p>';
    return;
  }
  const short = s => s === 'Mathematics' ? 'Math' : s === 'Computer Science & AI' ? 'CS & AI' : s;
  const { board, class: cls, subject } = boardFilter;
  const b = boards.boards[board];
  const disclaimerHtml = `<div style="background:#fffbeb; border:1px solid #fde68a; border-radius:10px; padding:0.7rem 0.9rem; font-size:0.78rem; color:#92400e; margin-bottom:0.9rem; line-height:1.45;">⚠️ ${boards.disclaimer}</div>`;

  const boardChips = BOARD_ORDER.map(bn => `
    <button class="chip ${board === bn ? 'active' : ''}" onclick="setBoardFilter({board:'${bn.replace(/'/g, "\\'")}'})">${BOARD_EMOJI[bn] || '📘'} ${bn}</button>
  `).join('');

  // Classes and subjects that have data for this board
  const classes = b.kind === 'chapters'
    ? Object.keys(b.classes || {}).map(Number).sort((a, b2) => a - b2)
    : Array.from(new Set((b.notes || []).map(n => n.class_level))).sort((a, b2) => a - b2);
  const availCls = (cls === 'all' || classes.includes(parseInt(cls, 10))) ? cls : 'all';
  const classChips = `<button class="chip ${availCls === 'all' ? 'active' : ''}" onclick="setBoardFilter({class:'all'})">All Classes</button>`
    + classes.map(c => `<button class="chip ${availCls === c ? 'active' : ''}" onclick="setBoardFilter({class:${c}})">Class ${c}</button>`).join('');

  let subjects = [];
  if (b.kind === 'chapters') {
    subjects = availCls === 'all'
      ? Array.from(new Set(classes.flatMap(c => Object.keys((b.classes || {})[String(c)] || {}))))
      : Object.keys((b.classes || {})[String(availCls)] || {});
  } else {
    const notes = b.notes || [];
    subjects = availCls === 'all'
      ? Array.from(new Set(notes.map(n => n.subject)))
      : Array.from(new Set(notes.filter(n => n.class_level === availCls).map(n => n.subject)));
  }
  subjects = COVERAGE_SUBJECTS.filter(s => subjects.includes(s));
  const availSubj = (subject === 'all' || subjects.includes(subject)) ? subject : 'all';
  const subjectChips = `<button class="chip ${availSubj === 'all' ? 'active' : ''}" onclick="setBoardFilter({subject:'all'})">All Subjects</button>`
    + subjects.map(s => `<button class="chip ${availSubj === s ? 'active' : ''}" onclick="setBoardFilter({subject:'${s.replace(/'/g, "\\'")}'})">${short(s)}</button>`).join('');

  // Rows
  let rowsHtml = '';
  if (b.kind === 'chapters') {
    const clKeys = availCls === 'all' ? classes : [parseInt(availCls, 10)];
    const cells = [];
    clKeys.forEach(c => {
      const subs = availSubj === 'all'
        ? Object.keys((b.classes || {})[String(c)] || {})
        : [availSubj];
      subs.filter(s => (b.classes || {})[String(c)] && (b.classes || {})[String(c)][s]).forEach(s => {
        cells.push({ c, s, rows: b.classes[String(c)][s] });
      });
    });
    const isNcert = board === 'NCERT / CBSE';
    rowsHtml = cells.map(({ c, s, rows }) => {
      const tableRows = rows.map(r => isNcert
        ? `<tr>
            <td style="font-weight:700;">${r.boardChapter}</td>
            <td style="text-align:center;">${r.lessons} lesson${r.lessons !== 1 ? 's' : ''}</td>
            <td>${(r.outcomes || []).map(o => `<li style="margin-left:1rem;">${o}</li>`).join('') || '<span style="color:#94a3b8;">—</span>'}</td>
          </tr>`
        : `<tr>
            <td style="font-weight:700;">${r.ourChapter}</td>
            <td>${r.boardArea}</td>
            <td style="font-size:0.85rem; color:#475569;">${r.note}</td>
          </tr>`).join('');
      const head = isNcert
        ? '<tr><th>NCERT chapter (matches ours)</th><th>Lessons</th><th>Learning outcomes</th></tr>'
        : '<tr><th>Our chapter</th><th>ICSE syllabus area</th><th>Note</th></tr>';
      return `
        <h4 style="font-size:0.9rem; font-weight:800; color:#0f172a; margin:0.9rem 0 0.3rem;">${short(s)} · Class ${c}</h4>
        <table style="width:100%; border-collapse:collapse; font-size:0.85rem;">
          <thead>${head}</thead>
          <tbody>${tableRows}</tbody>
        </table>`;
    }).join('');
  } else {
    const notes = (b.notes || []).filter(n =>
      (availCls === 'all' || n.class_level === availCls) &&
      (availSubj === 'all' || n.subject === availSubj));
    rowsHtml = notes.map(n => `
      <div style="background:#f8fafc; border:1px solid var(--border-color); border-radius:10px; padding:0.7rem 0.9rem; margin-bottom:0.5rem;">
        <div style="font-size:0.85rem; font-weight:800; color:#0f172a;">Class ${n.class_level} · ${n.subject}</div>
        <div style="font-size:0.82rem; color:#475569; margin-top:0.2rem; line-height:1.45;">${n.note}</div>
      </div>`).join('');
  }

  container.innerHTML = `
    <div style="margin-bottom:0.8rem;">
      <div style="display:flex; align-items:center; gap:0.6rem;">
        <span style="font-size:1.8rem;">📚</span>
        <div>
          <h2 style="font-size:1.25rem; font-weight:800; color:#0f172a; margin:0;">Curriculum Alignment</h2>
          <p style="font-size:0.82rem; color:var(--text-muted); margin:0.15rem 0 0;">How Avyaan's ${AVYAAN_DATA.topics.length} lessons map to different exam boards · updated ${boards.updated}</p>
        </div>
      </div>
    </div>
    ${disclaimerHtml}
    <div class="chips-row" style="margin-bottom:0.5rem;">${boardChips}</div>
    <div class="chips-row" style="margin-bottom:0.5rem;">${classChips}</div>
    <div class="chips-row" style="margin-bottom:0.8rem;">${subjectChips}</div>
    <div style="max-height:50vh; overflow-y:auto; padding-right:0.3rem;">
      ${rowsHtml || '<p style="color:var(--text-muted);">Nothing to show for these filters.</p>'}
    </div>
  `;
}

function renderCoverage() {
  const container = document.getElementById('coverageContent');
  if (!container) return;

  const topics = AVYAAN_DATA.topics;
  const cov = AVYAAN_DATA.coverage || [];
  const byCell = {};
  for (const c of cov) byCell[c.class_level + '/' + c.subject] = c;

  const shortName = s => s === 'Mathematics' ? 'Math' : s === 'Computer Science & AI' ? 'CS & AI' : s;
  const subjTotal = s => topics.filter(t => t.subject === s).length;
  const classTotal = c => topics.filter(t => t.class_level === c).length;

  const cellHtml = (cls, subj) => {
    const cell = byCell[cls + '/' + subj];
    if (!cell) {
      return `<td class="coverage-cell is-empty" title="${subj} · Class ${cls} — no curriculum table" style="background: var(--bg-secondary);"><span class="coverage-count">—</span></td>`;
    }
    const pct = Math.round((cell.covered / cell.chapters) * 100);
    const gaps = cell.gaps || [];
    const thin = cell.thin || [];
    const tipLines = [
      `${subj} · Class ${cls}`, `📖 Chapters: ${cell.covered} / ${cell.chapters} covered (${pct}%)`, `📚 Topics: ${cell.topics}`
    ];
    if (gaps.length) tipLines.push('❌ Missing: ' + gaps.join(', '));
    if (thin.length) tipLines.push('⚠️ Thin (1 topic): ' + thin.join(', '));
    tipLines.push('Click to explore.');
    const alpha = pct === 100 ? 0.82 : 0.12 + 0.6 * (pct / 100);
    const flag = gaps.length ? '❌' : thin.length ? '⚠️' : '✅';
    return `<td class="coverage-cell${gaps.length ? ' has-gaps' : ''}" title="${tipLines.join('\n')}" onclick="coverageFilter(${cls}, '${subj.replace(/'/g, "\\'")}')" style="background: ${pct === 0 ? '#f8fafc' : `rgba(37, 99, 235, ${alpha.toFixed(2)})`};">
      <span class="coverage-count">${cell.covered}/${cell.chapters}</span> <span class="coverage-gap" style="font-size: 0.68rem;">${flag}</span>
    </td>`;
  };

  const allGaps = cov.flatMap(c => (c.gaps || []).map(g => ({ cl: c.class_level, subj: c.subject, chap: g })));
  const allThin = cov.flatMap(c => (c.thin || []).map(g => ({ cl: c.class_level, subj: c.subject, chap: g })));

  let html = `
    <div style="margin-bottom: 0.9rem;">
      <div style="display: flex; align-items: center; gap: 0.6rem;">
        <span style="font-size: 1.6rem;">🗺️</span>
        <div>
          <h2 style="font-size: 1.25rem; font-weight: 800; color: var(--text-main); margin: 0;">Class × Subject Coverage</h2>
          <p style="font-size: 0.82rem; color: var(--text-muted); margin: 0.15rem 0 0;">Chapter-level curriculum coverage — every cell shows chapters covered out of the target curriculum set. Hover for the gap list, click to explore.</p>
        </div>
      </div>
    </div>
    <div class="coverage-wrap">
      <table class="coverage-table">
        <thead>
          <tr>
            <th class="coverage-corner"></th>
            ${COVERAGE_SUBJECTS.map(s => `<th class="coverage-subj" style="color: ${COVERAGE_SUBJ_COLOR[s]}; border-top: 3px solid ${COVERAGE_SUBJ_COLOR[s]};">${shortName(s)}</th>`).join('')}
            <th class="coverage-total">Topics</th>
          </tr>
        </thead>
        <tbody>
          ${COVERAGE_CLASSES.map(c => `
            <tr>
              <td class="coverage-class" onclick="coverageFilter(${c}, null)" title="All subjects · Class ${c} — ${classTotal(c)} topics. Click to explore.">Class ${c}</td>
              ${COVERAGE_SUBJECTS.map(s => cellHtml(c, s)).join('')}
              <td class="coverage-total" onclick="coverageFilter(${c}, null)" title="Class ${c} total — ${classTotal(c)} topics. Click to explore.">${classTotal(c)}</td>
            </tr>
          `).join('')}
          <tr>
            <td class="coverage-class" onclick="coverageFilter(null, null)" title="All ${topics.length} topics. Click to explore.">All</td>
            ${COVERAGE_SUBJECTS.map(s => `<td class="coverage-total" onclick="coverageFilter(null, '${s.replace(/'/g, "\\'")}')" title="${s} across all classes — ${subjTotal(s)} topics. Click to explore.">${subjTotal(s)}</td>`).join('')}
            <td class="coverage-total" style="cursor: default;">${topics.length}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="coverage-legend">
      <span>Cell = chapters covered / target chapters</span>
      <span>✅ = full chapter coverage</span>
      <span>⚠️ = thin chapter (1 topic)</span>
      <span>❌ = missing chapter(s) — hover for the list</span>
      ${allGaps.length ? `<strong style="color: #b91c1c;"> ${allGaps.length} chapter gap${allGaps.length === 1 ? '' : 's'} across the curriculum.</strong>` : `<strong style="color: #047857;"> All ${cov.reduce((s, c) => s + c.chapters, 0)} target chapters across every class × subject are covered. 🎉</strong>`}
      ${allThin.length ? `<span style="color: #b45309;"> ${allThin.length} thin chapter${allThin.length === 1 ? '' : 's'}.</span>` : `<span style="color: #047857;"> No thin chapters.</span>`}
    </div>
  `;
  container.innerHTML = html;
}

// Jump from the coverage map straight into the filtered topic grid.
function coverageFilter(cls, subj) {
  closeModal('coverageModal');
  browseMode = 'all';
  selectedClass = cls || 'all';
  selectedSubject = subj || 'all';
  setHeroSubject(selectedSubject === 'all' ? null : subjectColorKey(selectedSubject));

  document.querySelectorAll('#classChips .chip').forEach((c, i) => {
    c.classList.toggle('active', cls ? c.textContent.trim() === 'Class ' + cls : i === 0);
    c.setAttribute('aria-pressed', String(c.classList.contains('active')));
  });
  const subjIdx = selectedSubject === 'all' ? 0 : COVERAGE_SUBJECTS.indexOf(selectedSubject) + 1;
  document.querySelectorAll('#subjectChips .chip').forEach((c, i) => {
    c.classList.toggle('active', i === subjIdx);
    c.setAttribute('aria-pressed', String(c.classList.contains('active')));
  });

  renderGrid();
  const grid = document.getElementById('cardsGrid');
  if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// User changes adopted grade directly from header dropdown
function changeAdoptedGrade(newGradeStr) {
  let newGrade = parseInt(newGradeStr);
  if (currentUser && !currentUser.isGuest && String(currentUser.role || '').toLowerCase() === 'student') {
    newGrade = Number(currentUser.enrolled_class || currentUser.grade || 1);
  }
  if (!currentUser) {
    currentUser = {
      id: "user_custom",
      name: `Student (Class ${newGrade})`,
      email: `student.class${newGrade}@avyaan.edu`,
      role: "Student",
      grade: newGrade,
      avatar: "🎒"
    };
  } else {
    currentUser.grade = newGrade;
  }

  avyaanStorage.setItem('avyaan_user', JSON.stringify(currentUser));
  activateLearnerContext(currentUser);
  updateNavbarUserUI();
  renderGrid();
}

// Switch between the login and register panels in the auth modal
function showAuthTab(tab) {
  const loginPanel = document.getElementById('loginFormPanel');
  const registerPanel = document.getElementById('registerFormPanel');
  const forgotPanel = document.getElementById('forgotPasswordPanel');
  const resetPanel = document.getElementById('resetPasswordPanel');
  const tabList = document.querySelector('#loginModal [role="tablist"]');
  const loginTab = document.getElementById('authTabLogin');
  const registerTab = document.getElementById('authTabRegister');
  const isLogin = tab === 'login';
  const isRegister = tab === 'register';
  if (loginPanel) loginPanel.style.display = isLogin ? 'block' : 'none';
  if (registerPanel) registerPanel.style.display = isRegister ? 'block' : 'none';
  if (forgotPanel) forgotPanel.style.display = tab === 'forgot' ? 'block' : 'none';
  if (resetPanel) resetPanel.style.display = tab === 'reset' ? 'block' : 'none';
  if (tabList) tabList.style.display = isLogin || isRegister ? 'flex' : 'none';
  if (loginTab) {
    loginTab.style.background = isLogin ? '#ffffff' : 'transparent';
    loginTab.style.borderColor = isLogin ? '#cbd5e1' : 'transparent';
    loginTab.setAttribute('aria-selected', String(isLogin));
  }
  if (registerTab) {
    registerTab.style.background = isRegister ? '#ffffff' : 'transparent';
    registerTab.style.borderColor = isRegister ? '#cbd5e1' : 'transparent';
    registerTab.setAttribute('aria-selected', String(isRegister));
  }
  if (tab === 'forgot') {
    const email = document.getElementById('forgotPasswordEmail');
    const loginEmail = document.getElementById('loginUsername');
    if (email && loginEmail && !email.value) email.value = loginEmail.value.trim();
    const notice = document.getElementById('forgotPasswordNotice');
    if (notice) { notice.textContent = ''; notice.className = 'auth-notice'; }
  }
}

function showForgotPassword() {
  showAuthTab('forgot');
  const email = document.getElementById('forgotPasswordEmail');
  if (email) setTimeout(() => email.focus(), 0);
}

function setAuthNotice(id, message, kind = 'info') {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = message;
  el.className = `auth-notice ${kind}`;
  el.style.display = 'block';
}

async function handleForgotPassword(e) {
  e.preventDefault();
  const email = (document.getElementById('forgotPasswordEmail')?.value || '').trim().toLowerCase();
  if (!email) { setAuthNotice('forgotPasswordNotice', 'Enter the email used for the account.', 'error'); return; }
  setAuthNotice('forgotPasswordNotice', 'Requesting recovery instructions…', 'info');
  const data = await AvyaanAPI.forgotPassword(email);
  if (!data || data.status !== 'accepted') {
    setAuthNotice('forgotPasswordNotice', data?.detail || 'We could not start recovery. Please try again.', 'error');
    return;
  }
  setAuthNotice('forgotPasswordNotice', 'If an account exists for this email address, password recovery instructions will be sent.', 'success');
}

async function handleResetPassword(e) {
  e.preventDefault();
  const password = document.getElementById('resetPassword')?.value || '';
  const confirm = document.getElementById('resetPasswordConfirm')?.value || '';
  const token = window._resetToken || new URLSearchParams(location.search).get('reset') || '';
  if (new TextEncoder().encode(password).byteLength > 72) {
    setAuthNotice('resetPasswordNotice', 'Password must be at most 72 UTF-8 bytes.', 'error'); return;
  }
  if (password.length < 8) { setAuthNotice('resetPasswordNotice', 'Password must be at least 8 characters.', 'error'); return; }
  if (password !== confirm) { setAuthNotice('resetPasswordNotice', 'Passwords do not match.', 'error'); return; }
  if (!token) { setAuthNotice('resetPasswordNotice', 'This recovery link is missing or invalid. Request a new one.', 'error'); return; }
  setAuthNotice('resetPasswordNotice', 'Updating your password…', 'info');
  const data = await AvyaanAPI.resetPassword(token, password);
  if (!data || data.status !== 'success') {
    setAuthNotice('resetPasswordNotice', data?.detail || 'This recovery link is invalid or expired. Request a new one.', 'error');
    return;
  }
  window._resetToken = null;
  try { history.replaceState({}, document.title, `${location.pathname}${location.hash || ''}`); } catch (_) {}
  setAuthNotice('resetPasswordNotice', 'Password updated. You can now sign in with the new password.', 'success');
}

function openPasswordResetFromUrl() {
  const token = new URLSearchParams(location.search).get('reset');
  if (!token) return;
  window._resetToken = token;
  openLoginModal();
  showAuthTab('reset');
  setTimeout(() => document.getElementById('resetPassword')?.focus(), 0);
}
function setAuthError(id, message) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = message;
  el.style.display = 'block';
}

function localUserFromApi(apiUser, grade, displayName) {
  const finalGrade = apiUser.enrolled_class || grade || 1;
  return {
    ...apiUser,
    name: displayName || apiUser.name,
    grade: finalGrade,
    enrolled_class: finalGrade,
    role: apiUser.role || 'Student',
    isGuest: false
  };
}

// Account registration is backend-authoritative. No password is written to
// localStorage; the API client stores only the session token and safe profile.
async function handleFormRegister(e) {
  e.preventDefault();
  const name = document.getElementById('registerName').value.trim();
  const email = (document.getElementById('registerEmail').value || '').trim().toLowerCase();
  const password = document.getElementById('registerPassword').value;
  const confirmPassword = document.getElementById('registerConfirmPassword').value;
  const grade = parseInt(document.getElementById('registerGradeSelect').value, 10);
  const errorEl = document.getElementById('registerError');
  if (errorEl) errorEl.style.display = 'none';

  if (!name || !email || !password) {
    setAuthError('registerError', 'Please fill in all fields.');
    return;
  }
  if (password.length < 8) {
    setAuthError('registerError', 'Password must be at least 8 characters.');
    return;
  }
  if (password !== confirmPassword) {
    setAuthError('registerError', 'Passwords do not match.');
    return;
  }

  const parentMode = !!(
    document.getElementById('registerParentMode') &&
    document.getElementById('registerParentMode').checked
  );
  const childName = parentMode
    ? (document.getElementById('registerChildName').value || '').trim()
    : name;
  const childGrade = parentMode
    ? parseInt(document.getElementById('registerChildGrade').value, 10)
    : grade;

  if (parentMode && !childName) {
    setAuthError('registerError', 'Please enter your child\'s name.');
    return;
  }

  const userRole = parentMode ? 'Parent' : 'Student';
  const enrolledClass = parentMode ? childGrade : grade;
  const data = await AvyaanAPI.register(name, email, password, enrolledClass, userRole);
  if (!data || data.status !== 'success' || !data.user) {
    setAuthError(
      'registerError',
      data && data.detail
        ? data.detail
        : 'Account service is unavailable. Please try again shortly.'
    );
    return;
  }

  currentUser = localUserFromApi(data.user, childGrade, childName);
  avyaanStorage.setItem('avyaan_user', JSON.stringify(currentUser));
  activateLearnerContext(currentUser);
  if (parentMode) {
    avyaanStorage.setItem(
      'avyaan_parent_profile',
      JSON.stringify({ name: name, email: email, role: 'Parent' })
    );
    saveFamilyProfileSlot(childName, childGrade);
    // Parent registration is the first step of the authoritative learner
    // journey. Persist the child on the server before offering enrollment so
    // payment, consent and reports all reference the same child subject.
    const childResult = await AvyaanAPI.createChild(childName, childGrade);
    if (!childResult || childResult.status !== 'success') {
      closeModal('loginModal');
      if (typeof toast === 'function') toast('Parent account created. Finish setting up the learner profile from Parent View.');
      openParentDashboard();
      return;
    }
    window._activeParentChildId = childResult.child && childResult.child.id ? childResult.child.id : null;
  }
  updateNavbarUserUI();
  closeModal('loginModal');
  renderGrid();
  showAuthTab('login');
  // Parents should never have to guess where enrollment happens. Once the
  // account and child profile exist, show the live plan quote immediately.
  if (window.AvyaanPayments && typeof AvyaanPayments.renderPaywall === 'function') {
    setTimeout(() => AvyaanPayments.renderPaywall(null), 250);
  }
}

// Toggle the parent-mode fields in the register form
function toggleRegisterParentMode(checked) {
  const fields = document.getElementById('registerChildFields');
  if (fields) fields.style.display = checked ? 'block' : 'none';
  const gradeLabel = document.getElementById('registerGradeSelect');
  if (gradeLabel && checked) gradeLabel.value = '1';
}

async function handleFormLogin(e) {
  e.preventDefault();
  const usernameInput = document.getElementById('loginUsername').value.trim().toLowerCase();
  const passwordInput = document.getElementById('loginPassword').value;
  const selectedGradeVal = parseInt(document.getElementById('loginGradeSelect').value, 10);
  const errorEl = document.getElementById('loginError');
  if (errorEl) errorEl.style.display = 'none';

  if (!usernameInput || !passwordInput) {
    setAuthError('loginError', 'Please enter both email and password.');
    return;
  }

  const data = await AvyaanAPI.login(usernameInput, passwordInput);
  if (!data || data.status !== 'success' || !data.user) {
    setAuthError(
      'loginError',
      data && data.detail
        ? data.detail
        : 'Account service is unavailable. Please try again shortly.'
    );
    return;
  }

  const stored = JSON.parse(avyaanStorage.getItem('avyaan_user') || '{}');
  currentUser = localUserFromApi(
    data.user,
    stored.grade || selectedGradeVal || 1,
    stored.name || data.user.name
  );
  avyaanStorage.setItem('avyaan_user', JSON.stringify(currentUser));
  activateLearnerContext(currentUser);
  updateNavbarUserUI();
  closeModal('loginModal');
  renderGrid();

  restoreFromCloud().then(restored => {
    if (restored) location.reload();
  });
}

async function fillAndLogin(email, pass, defaultGrade) {
  if (new URLSearchParams(location.search).get('demo') !== '1') {
    toast('Demo accounts are disabled on the public site. Create a real account instead.');
    return;
  }
  const data = await AvyaanAPI.login(email, pass);
  if (!data || data.status !== 'success' || !data.user) {
    toast('Development demo account is unavailable.');
    return;
  }
  currentUser = localUserFromApi(data.user, defaultGrade, data.user.name);
  avyaanStorage.setItem('avyaan_user', JSON.stringify(currentUser));
  updateNavbarUserUI();
  closeModal('loginModal');
  renderGrid();
}
function logoutUser() {
  // Remove the active learner's local state before dropping the identity.
  // Namespaced data for other accounts/children remains isolated.
  if (window.avyaanStorage) avyaanStorage.clearLearnerScope();
  if (typeof AvyaanAPI !== 'undefined') AvyaanAPI.logout();
  const userDropdown = document.getElementById('userDropdown');
  const userMenuTrigger = document.getElementById('userMenuTrigger');
  if (userDropdown) {
    userDropdown.classList.remove('active');
    userDropdown.setAttribute('aria-hidden', 'true');
  }
  if (userMenuTrigger) userMenuTrigger.setAttribute('aria-expanded', 'false');
  currentUser = createGuestUser();
  completedTopicIds = new Set();
  solidifiedTopicIds = new Set();
  avyaanStorage.removeItem('avyaan_user');
  avyaanStorage.removeItem('avyaan_token');
  avyaanStorage.removeItem('avyaan_cookie_session');
  activateLearnerContext(currentUser);
  updateNavbarUserUI();
  closeModal('loginModal');
  renderGrid();
}

const QUARANTINED_TOPIC_IDS = new Set([
  'museum_physics_kinematics',
  'museum_algebra_and_linear_equations',
  'museum_solar_microgrid_architecture_-_photovoltaic_generation_and_bess',
  'museum_earthquake_early_warning_system_-_p-wave_detection_and_telemetry',
  'museum_amla', 'museum_ginger', 'museum_thermometer_and_fever_check'
]);
function isPublicTopicForLearner(topic) {
  return !!topic && (!QUARANTINED_TOPIC_IDS.has(topic.id) || String(currentUser?.role || '').toLowerCase() === 'admin');
}

// Canonical learner-facing catalogue. Safety-quarantined records remain in the
// authored registry for audit/admin use, but must not inflate learner counts or
// appear in discovery, progress denominators, or public search results.
function learnerTopics() {
  return AVYAAN_DATA.topics.filter(isPublicTopicForLearner);
}

function isTopicUnlocked(topic) {
  if (!currentUser || !isPublicTopicForLearner(topic)) return false;
  if (String(currentUser.role || '').toLowerCase() === 'admin') return true;
  // The browser mirrors the server decision for honest affordances; the API
  // remains authoritative for full lesson delivery.
  if (currentUser.isGuest || currentUser.tier === 'free' || currentUser.is_active_subscription === false) return false;
  if (topic.subject === 'Computer Science & AI' || topic.subject === 'Earth & Space') {
    if (!currentUser.is_active_subscription && !currentUser.subscription_expires_at) return false;
  }
  const tierMaxGrade = { primary_paid: 4, pro_paid: 7, master_paid: 10, tier_1_4: 4, tier_5_7: 7, tier_8_10: 10 };
  const maxGrade = Number(currentUser.subscription_max_grade || tierMaxGrade[currentUser.tier] || 0);
  return topic.class_level === currentUser.grade && topic.class_level <= maxGrade;
}
function isTopicPreviewable(topic) {
  if (!topic || !FREE_PREVIEW_TOPIC_IDS.has(topic.id)) return false;
  // Guests and free accounts may open the deliberately curated starter
  // preview. Paid accounts should use the entitlement-checked lesson path.
  const guestOrFree = !currentUser
    || currentUser.isGuest
    || currentUser.tier === 'free'
    || currentUser.is_active_subscription === false;
  if (!guestOrFree) return false;
  // A guest has no selected learner class yet, so the starter set is
  // intentionally available without sign-in. A free account is limited to
  // the class it selected during onboarding.
  return !currentUser
    || currentUser.isGuest
    || !currentUser.grade
    || Number(topic.class_level) === Number(currentUser.grade);
}

// Path helpers use the same entitlement check as the topic grid.
function canAccessTopic(topic) {
  return isTopicUnlocked(topic);
}

// Filter Handlers
function setHeroSubject(subjKey) {
  const hero = document.getElementById('heroSection');
  if (!hero) return;
  ['math', 'physics', 'chemistry', 'biology', 'cs', 'earth'].forEach(k => hero.classList.remove('hero-subject-' + k));
  if (subjKey) hero.classList.add('hero-subject-' + subjKey);
}

function selectClassFilter(classVal, btnEl) {
  if (currentUser && !currentUser.isGuest && (currentUser.role === 'Student' || !currentUser.role)) {
    const userG = String(currentUser.grade || 1);
    if (classVal !== 'all' && classVal !== userG) {
      if (typeof toast === 'function') {
        toast('Your account is enrolled in Class ' + userG + '. Your curriculum is locked to your class.');
      } else {
        alert('Your account is enrolled in Class ' + userG + '.');
      }
      return;
    }
  }
  selectedClass = classVal;
  browseMode = 'all';
  topicDisplayLimit = 12;
  setHeroSubject(null);
  // Resolve the target inside the class-chip group by its label. Older
  // callers pass a positional chip index, but the age-adaptive subject row
  // changes that global index; relying on it silently selected the wrong
  // class (for example, Class 1 opened Class 3 for younger learners).
  const targetLabel = classVal === 'all' ? 'All Classes' : 'Class ' + classVal;
  const targetBtn = [...document.querySelectorAll('#classChips .chip')]
    .find(c => c.textContent.trim() === targetLabel);
  document.querySelectorAll('#classChips .chip').forEach(c => c.classList.remove('active'));
  (targetBtn || btnEl)?.classList.add('active');
  document.querySelectorAll('#classChips .chip').forEach(c => {
    c.setAttribute('aria-pressed', String(c.classList.contains('active')));
  });
  renderGrid();
}

function selectSubjectFilter(subjVal, btnEl) {
  selectedSubject = subjVal;
  browseMode = 'all';
  topicDisplayLimit = 12;
  setHeroSubject(subjectColorKey(subjVal));
  renderSubjectChips();
  renderGrid();
}

// Grade-aware subject chips: young classes (≤ 6) see one "Science" chip
// instead of Physics / Chemistry / Biology.
function renderSubjectChips() {
  const row = document.getElementById('subjectChips');
  if (!row) return;
  const subs = visibleSubjects();
  const chips = ['all', ...subs].map(s => {
    const label = s === 'all' ? 'All Subjects' : (s === 'Computer Science & AI' ? 'CS & AI' : s);
    const active = selectedSubject === s ? 'active' : '';
    return `<button class="chip ${active}" aria-pressed="${active ? 'true' : 'false'}" onclick="selectSubjectFilter('${s.replace(/'/g, "\\'")}', this)">${label}</button>`;
  }).join('');
  row.innerHTML = chips;
  setHeroSubject(selectedSubject === 'all' ? null : subjectColorKey(selectedSubject));
}

// Render Content Cards Grid
// Render curated landing page with sections instead of dumping all topics
function renderCuratedLanding(grid) {
  const userGrade = currentUser?.grade || 7;
  const allTopics = learnerTopics();
  const isPublicLanding = currentUser?.isGuest || currentUser?.tier === 'free';

  // Section 1: Continue Learning (topics with progress but not mastered)
  const inProgress = allTopics.filter(t => {
    const progress = JSON.parse(avyaanStorage.getItem('avyaan_progress_' + t.id) || 'null');
    return progress && !completedTopicIds.has(t.id) && isTopicUnlocked(t);
  }).slice(0, 4);

  // Section 2: Recommended for your grade (unlocked, not mastered, matching grade)
  const recommended = allTopics.filter(t =>
    t.class_level === userGrade && !completedTopicIds.has(t.id) && (isTopicUnlocked(t) || isTopicPreviewable(t))
  ).slice(0, 6);

  // Section 3: Recently mastered
  const mastered = allTopics.filter(t => completedTopicIds.has(t.id)).slice(0, 4);

  // Section 4: Popular by subject (one topic per display subject, unlocked)
  const subjects = visibleSubjects();
  const popularBySubject = subjects.map(subj => {
    return allTopics.find(t => topicDisplaySubject(t) === subj && isTopicUnlocked(t));
  }).filter(Boolean);

  // Section 5: Daily challenge topic
  const dc = getDailyChallenge();
  const dcTopic = allTopics.find(t => t.id === dc.topicId);

  let html = '<div class="curated-wrapper">';

  // Teacher assignment banner (from a shared ?assign=...&due=... link)
  html += renderAssignmentBanner();

  // Topic of the Week hero
  const weeklyTopic = isPublicLanding
    ? allTopics.find(t => FREE_PREVIEW_TOPIC_IDS.has(t.id))
    : getTopicOfTheWeek();
  if (weeklyTopic) {
    html += `
      <div class="weekly-topic-hero" onclick="openTopicDetail('${weeklyTopic.id}')">
        <div class="wt-hero-left">
          <div class="wt-hero-label">🗓️ Topic of the Week</div>
          <div class="wt-hero-title">${weeklyTopic.emoji} ${weeklyTopic.title}</div>
          <div class="wt-hero-meta">${topicDisplaySubject(weeklyTopic)} · Class ${weeklyTopic.class_level}${weeklyTopic.chapter ? ' · 📖 ' + weeklyTopic.chapter.replace(/^Chapter\s*\d+\s*—\s*/, '') : ''}</div>
        </div>
        <div class="wt-hero-cta">Explore →</div>
      </div>
    `;
  }

  // One primary morning action: Today's Learning Session. It already ends
  // with the Daily Challenge as its closer, so the challenge banner is folded
  // in as a single line instead of competing for the child's attention.
  const sStreak = getSessionStreakCount();
  const challengeNote = dcTopic && !dc.completed
    ? `Ends with today's Daily Challenge · ${dcTopic.title} · +100 XP`
    : 'Due reviews → fresh topics → one guided sitting';
  if (!isPublicLanding) html += `
    <div class="daily-session-banner" onclick="startDailySession()">
      <div class="ds-banner-left">
        <div class="ds-banner-label">🎯 Today's Learning Session${sStreak > 0 ? ` · 🔥 ${sStreak}-day streak` : ''}</div>
        <div class="ds-banner-title">Reviews first, then something new</div>
        <div class="ds-banner-meta">${challengeNote}</div>
      </div>
      <div class="ds-banner-cta">Start →</div>
    </div>
  `;

  // Exam countdown card (only when a plan exists)
  if (!isPublicLanding) html += examPlanCard();

  // Continue Learning section
  if (inProgress.length > 0) {
    html += renderCuratedSection('Continue Learning', 'Pick up where you left off', inProgress);
  }

  // Recommended for your grade
  if (recommended.length > 0) {
    html += renderCuratedSection(`Recommended for Class ${userGrade}`, 'Topics matched to your grade level', recommended);
  }

  // Your Class Path — structured per-subject progression for the student's grade
  if (!isPublicLanding) html += renderClassPathSection(userGrade);

  // Recently mastered
  if (mastered.length > 0) {
    html += renderCuratedSection('Recently Mastered', 'Topics you have completed', mastered);
  }

  // Subject navigation and the complete catalogue live on library.html. Keep
  // the public landing page focused on a small, welcoming set of next steps.
  if (!isPublicLanding) html += `
    <div class="explore-subjects-section">
      <div class="explore-subjects-header">
        <h2>Explore by Subject</h2>
        <p>Dive into a specific discipline</p>
      </div>
      <div class="explore-subjects-grid">
        ${subjects.map(subj => {
          const subjTopics = allTopics.filter(t => topicDisplaySubject(t) === subj);
          const subjMastered = subjTopics.filter(t => completedTopicIds.has(t.id)).length;
          const subjKey = subjectColorKey(subj);
          return `
            <div class="subject-explore-card subject-color-${subjKey}" onclick="selectSubjectFilter('${subj.replace(/'/g, "\\'")}', null); browseMode='all'; renderGrid();">
              <div class="subject-explore-name">${SUBJECT_EMOJI[subj] || '📘'} ${subj}</div>
              <div class="subject-explore-meta">${subjTopics.length} topics · ${subjMastered} mastered</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  // Browse All button — always a separate page, never an in-place catalogue.
  html += `
    <div class="browse-all-section">
      <a class="hero-cta-primary" href="library.html">
        Explore the full STEM library →
      </a>
      <p class="browse-all-hint">Browse subjects, classes and difficulty in the dedicated library.</p>
    </div>
  `;

  html += '</div>';
  grid.innerHTML = html;
  enhanceInteractiveSemantics(grid);
}
function renderCuratedSection(title, subtitle, topics) {
  const cardsHtml = topics.map(topic => {
    const isMastered = completedTopicIds.has(topic.id);
    const subjKey = subjectColorKey(topic.subject);
    const score = getSmartScore(topic.id);
    return `
      <div class="card mini-card" onclick="openTopicDetail('${topic.id}')">
        <div class="card-subject-accent subject-accent-${subjKey}"></div>
        <div>
          <div class="card-header">
            <span class="card-emoji">${topic.emoji}</span>
            <div class="card-tags">
              <span class="class-tag">${topic.class_band}</span>
              ${isMastered ? '<span class="mini-mastered">Mastered</span>' : score > 0 ? `<span class="mini-score">${score}</span>` : ''}
            </div>
          </div>
          <div class="card-body">
            <h3 class="mini-title">${topicTitle(topic)}</h3>
            <p class="mini-summary">${topicSummary(topic)}</p>
          </div>
        </div>
        <div class="card-footer mini-footer">
          <span class="mini-subject">${topicDisplaySubject(topic)}</span>
          <span class="mini-open">${isTopicPreviewable(topic) ? 'Preview' : 'Open'}</span>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="curated-section">
      <div class="curated-section-header">
        <h2>${title}</h2>
        <p>${subtitle}</p>
      </div>
      <div class="curated-cards-scroll">
        ${cardsHtml}
      </div>
    </div>
  `;
}

// Class Path section — per-subject progress at the student's grade
function renderClassPathSection(grade) {
  const subjects = subjectsForGrade(grade);
  const rows = subjects.map(subj => {
    const path = getPathFor(subj, grade);
    if (!path.length) return '';
    const mastered = path.filter(t => completedTopicIds.has(t.id)).length;
    const percent = Math.round((mastered / path.length) * 100);
    const current = getCurrentPathTopic(subj, grade);
    const subjKey = subjectColorKey(subj);
    return `
      <div class="path-card" onclick="openPathModal('${subj.replace(/'/g, "\\'")}', ${grade})">
        <div class="path-card-top">
          <span class="subject-badge subject-${subjKey}">${subj}</span>
          <span class="path-card-count">${mastered}/${path.length}</span>
        </div>
        <div class="path-progress-bar"><div class="path-progress-fill subject-${subjKey}" style="width:${percent}%"></div></div>
        <div class="path-card-next">${current ? `${current.emoji} ${current.title}` : 'Done 🎉'}</div>
      </div>
    `;
  }).join('');

  return `
    <div class="curated-section">
      <div class="curated-section-header">
        <h2>🗺️ Your Class ${grade} Learning Path</h2>
        <p>Follow each subject's path in order — tap a card to see the full journey</p>
      </div>
      <div class="path-cards-grid">${rows}</div>
    </div>
  `;
}

// Switch back to curated view
function backToCurated() {
  browseMode = 'curated';
  topicDisplayLimit = 12;
  selectedClass = 'all';
  selectedSubject = 'all';
  selectedDifficulty = 'all';
  const df = document.getElementById('difficultyFilter');
  if (df) df.value = 'all';
  setHeroSubject(null);
  const search = document.getElementById('searchInput');
  if (search) search.value = '';
  // Reset chip active states
  document.querySelectorAll('.chip').forEach((c, i) => {
    c.classList.remove('active');
    if (i === 0 || i === 7) c.classList.add('active');
  });
  renderGrid();
}

// Typo-tolerant search logic (editDistance / SEARCH_ALIASES / scoreTopicSearch)
// lives in js/app_core.js — shared with the node unit tests.

function renderGrid() {
  const grid = document.getElementById('cardsGrid');
  if (!grid) return;
  const searchQuery = (document.getElementById('searchInput')?.value || '').trim().toLowerCase();

  // Browsing is public. If boot timing has not created the guest profile
  // yet, create it here rather than replacing the catalogue with a login wall.
  // Only protected lesson bodies require authentication.
  if (!currentUser) {
    currentUser = createGuestUser();
    updateNavbarUserUI();
  }

  // If user is searching or filtering, always show full grid
  const isFiltering = searchQuery || selectedClass !== 'all' || selectedSubject !== 'all';

  if (!isFiltering && browseMode === 'curated') {
    renderCuratedLanding(grid);
    return;
  }

  // Full grid mode (searching, filtering, or "Browse All")
  let topics = learnerTopics();

  // Filter by class
  if (selectedClass !== 'all') {
    topics = topics.filter(t => t.class_level === parseInt(selectedClass));
  }

  // Filter by subject (display-aware: "Science" matches Physics/Chemistry/Biology ≤ 6)
  if (selectedSubject !== 'all') {
    topics = topics.filter(t => topicDisplaySubject(t) === selectedSubject);
  }

  // Filter by difficulty (or the 🧠 Solidified status shortcut)
  if (selectedDifficulty === 'solidified') {
    topics = topics.filter(t => isSolidified(t.id));
  } else if (selectedDifficulty !== 'all') {
    topics = topics.filter(t => (t.difficulty || 'medium') === selectedDifficulty);
  }

  // Filter by search query (searches title, summary, subject, formula, flashcards,
  // experiment) with typo tolerance: fuzzy matches rank below exact matches.
  searchHighlightIdx = -1;
  if (searchQuery) {
    const scored = [];
    for (const t of topics) {
      const haystack = [
        t.title,
        t.summary,
        t.subject,
        t.schoolForm?.expression || '',
        t.schoolForm?.text || '',
        t.whyItWorks?.text || '',
        t.whyItWorks?.reason || '',
        ...(t.flashcards || []).flatMap(fc => [fc.myth, fc.fact]),
        ...(t.mcqs || []).map(mcq => mcq.question),
        t.outcome || '',
        t.chapter || '',
        t.experiment?.title || '',
        ...(t.experiment?.steps || [])
      ].join(' ').toLowerCase();
      const s = scoreTopicSearch(t, searchQuery, haystack);
      if (s > 0) scored.push({ t, s });
    }
    scored.sort((a, b) => b.s - a.s || a.t.title.localeCompare(b.t.title));
    topics = scored.map(x => x.t);
  }

  if (topics.length === 0) {
    // Did-you-mean: closest fuzzy title matches (up to 3 edits per token)
    const suggestions = buildDidYouMean(searchQuery);
    const suggHtml = suggestions.length
      ? `<div style="margin: 1rem auto 0; max-width: 520px; text-align: left;">
           <div style="font-size: 0.78rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.4rem;">Did you mean:</div>
           <div style="display: flex; flex-wrap: wrap; gap: 0.4rem; justify-content: center;">
             ${suggestions.map(t => `<button class="btn" style="font-size:0.78rem; padding:0.3rem 0.7rem;" onclick="document.getElementById('searchInput').value='${t.title.replace(/'/g, "\\'")}'; browseMode='all'; renderGrid()">${t.emoji} ${t.title}</button>`).join('')}
           </div>
         </div>`
      : '';
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🔍</div>
        <h3 style="color: var(--text-main);">No matching STEM topics found</h3>
        <p>Try adjusting your search query or filters.</p>
        ${suggHtml}
      </div>
    `;
    enhanceInteractiveSemantics(grid);
    return;
  }

  // Keep the first view compact, including the default All Subjects +
  // All Classes selection. A second page is available through the control
  // below, capped at 20 cards.
  const visibleTopics = topics.slice(0, Math.min(topicDisplayLimit, 20));

  // Show "Back to curated" button when browsing all
  const backBtn = (isFiltering || browseMode === 'all') ? `
    <div style="grid-column: 1 / -1; margin-bottom: 0.5rem;">
      <button class="btn" style="font-size: 0.82rem;" onclick="backToCurated()">← Back to Home</button>
      <span style="font-size: 0.82rem; color: var(--text-dim); margin-left: 0.5rem;">Showing ${visibleTopics.length} of ${topics.length} topics</span>
    </div>
  ` : '';

  const expansion = topics.length > visibleTopics.length
    ? '<div class="catalogue-expand" style="grid-column:1 / -1;"><p>Showing a focused selection keeps browsing quick. Use search or a class/subject filter to narrow further.</p><button class="btn btn-primary" type="button" onclick="expandTopicResults()">Show ' + (Math.min(20, topics.length) - visibleTopics.length) + ' more topics</button></div>'
    : (topics.length > 12 ? '<div class="catalogue-expand catalogue-expand-end" style="grid-column:1 / -1;"><p>That is the maximum preview window. Search or choose a filter to explore another set of topics.</p></div>' : '');

  grid.innerHTML = backBtn + visibleTopics.map(topic => {
    const unlocked = isTopicUnlocked(topic);
    const previewable = isTopicPreviewable(topic);
    const isMastered = completedTopicIds.has(topic.id);
    const subjKey = subjectColorKey(topic.subject);

    return `
      <div class="card ${unlocked ? '' : 'locked'}">
        <div class="card-subject-accent subject-accent-${subjKey}"></div>
        <div>
          <div class="card-header">
            <span class="card-emoji">${topic.emoji}</span>
            <div class="card-tags">
              <span class="class-tag">${topic.class_band}</span>
              <span class="subject-tag subject-color-${subjKey}">${topicDisplaySubject(topic)}</span>
              ${isMastered ? '<span style="font-size: 0.68rem; font-weight: 800; background: #ecfdf5; color: #059669; border: 1px solid #6ee7b7; padding: 0.1rem 0.4rem; border-radius: 8px;">★ MASTERED</span>' : ''}
              ${isSolidified(topic.id) ? '<span style="font-size: 0.68rem; font-weight: 800; background: #eef2ff; color: #4338ca; border: 1px solid #c7d2fe; padding: 0.1rem 0.4rem; border-radius: 8px;" title="Memory proven by a successful spaced review">🧠 SOLIDIFIED</span>' : ''}
              ${renderRecallScore(topic)}
              ${!isMastered && getSmartScore(topic.id) > 0 ? `<span style="font-size: 0.68rem; font-weight: 800; background: ${getSmartScore(topic.id) >= 80 ? '#ecfdf5' : getSmartScore(topic.id) >= 50 ? '#fef3c7' : '#fef2f2'}; color: ${getSmartScore(topic.id) >= 80 ? '#059669' : getSmartScore(topic.id) >= 50 ? '#92400e' : '#991b1b'}; border: 1px solid ${getSmartScore(topic.id) >= 80 ? '#6ee7b7' : getSmartScore(topic.id) >= 50 ? '#fde68a' : '#fecaca'}; padding: 0.1rem 0.4rem; border-radius: 8px;">📊 ${getSmartScore(topic.id)}</span>` : ''}
            </div>
          </div>

          <div class="card-body">
            <h3>${topicTitle(topic)}</h3>
            <p>${topicSummary(topic)}</p>
          </div>
        </div>

        <div class="card-footer">
          ${unlocked ? `
            <span style="font-size: 0.75rem; color: var(--accent-emerald); font-weight: 700;">✓ ${topic.class_band} Unlocked</span>
            <button class="btn btn-primary" onclick="openTopicDetail('${topic.id}')">View Lesson →</button>
          ` : previewable ? `
            <span class="lock-badge" style="background:#eff6ff;color:#1d4ed8;border-color:#bfdbfe;">👀 Preview</span>
            <button class="btn" onclick="openTopicDetail('${topic.id}')">Preview →</button>
          ` : `
            <span class="lock-badge">🔒 Class ${topic.class_level}+</span>
            <button class="btn" onclick="triggerPaywall('${topic.id}')">Upgrade →</button>
          `}
        </div>
      </div>
    `;
  }).join('') + expansion;
  enhanceInteractiveSemantics(grid);
}

// Open Topic Detail Modal — 5-step learning ladder
async function openTopicDetail(topicId) {
  const topic = AVYAAN_DATA.topics.find(t => t.id === topicId);
  if (!topic || !isPublicTopicForLearner(topic)) {
    if (typeof toast === 'function') toast('This lesson is temporarily unavailable while educators complete an age-and-safety review.');
    return;
  }
  stopReading();
  if (isTopicPreviewable(topic)) {
    renderTopicPreview(topic);
    openModal('detailModal');
    return;
  }
  if (!isTopicUnlocked(topic)) {
    triggerPaywall(topicId);
    return;
  }

  // Paid lesson bodies are fetched only after server authorization.
  // The API returns {content: ...}; older clients incorrectly required
  // {topic: ...}, which made every authorized lesson look unavailable.
  if (!topic.workedExample && typeof AvyaanAPI !== 'undefined' && AvyaanAPI.getTopicContent) {
    const secure = await AvyaanAPI.getTopicContent(topicId);
    if (!secure) {
      if (typeof toast === 'function') toast('This lesson is not available in the protected content store yet. Please try again later.');
      return;
    }
    if (secure.__error) {
      const authFailure = secure.status === 401 || secure.status === 403;
      if (typeof toast === 'function') toast(authFailure
        ? 'Your learner session has expired. Please sign in again.'
        : 'This lesson is not available in the protected content store yet. Please try again later.');
      return;
    }
    const payload = secure.content || secure.topic || {};
    const metadata = secure.topic?.metadata || payload.metadata || {};
    if (metadata && typeof metadata === 'object') {
      Object.assign(topic, metadata);
      topic.metadata = metadata;
    }
    // Accept either a body object or a response whose topic itself is the
    // body. Do not put answer keys in public previews; this branch is only
    // reached after entitlement authorization.
    const body = payload.body || payload.lesson || payload;
    if (body && typeof body === 'object') Object.assign(topic, body);
    if (!topic.workedExample && !topic.seeIt && !topic.whyItWorks && !topic.tryIt) {
      if (typeof toast === 'function') toast('This lesson is not available in the protected content store yet. Please try again later.');
      return;
    }
  }
  currentActiveTopic = topic;
  isScratchpadActive = false;
  quizCorrectCount = 0;
  quizAnsweredCount = 0;
  quizSessionDone = false;
  quizSession = null;
  quizSessionQuestions = null;
  userPrediction = '';
  hasPredicted = false;

  // Restore saved progress for this topic
  const savedProgress = JSON.parse(avyaanStorage.getItem('avyaan_progress_' + topicId) || 'null');
  currentActiveStep = savedProgress?.step || 1;
  currentRevealedStep = savedProgress?.revealedStep || 1;
  currentQuizIndex = savedProgress?.quizIndex || 0;

  renderTopicModal();
  openModal('detailModal');

  // Authenticated learners receive a short-lived server-bound question set.
  // Render the modal once in a loading state, then replace it with the
  // answer-key-free question payload returned by the API.
  await loadSecureQuizSession(topic.id);
}

function expandTopicResults() {
  topicDisplayLimit = Math.min(20, topicDisplayLimit + 8);
  renderGrid();
}

function renderTopicPreview(topic) {
  const container = document.getElementById('detailModalContent');
  if (!container) return;
  container.innerHTML = `
    <div class="topic-preview-panel">
      <div class="topic-preview-icon">${topic.emoji || '📘'}</div>
      <span class="kicker-small">Starter preview · Class ${topic.class_level}</span>
      <h2>${topicTitle(topic)}</h2>
      <p>${topicSummary(topic)}</p>
      ${topic.outcome ? `<div class="lesson-outcome-box">🎯 <strong>In the full lesson you will…</strong> ${escapeHtml(topic.outcome.replace(/^You can\s+/i, ''))}</div>` : ''}
      <div class="library-access-note"><span aria-hidden="true">🔐</span><span>Sign in with a learner or parent account to open the visual explanation, activity and server-recorded quiz.</span></div>
      <button class="btn btn-primary" onclick="closeModal('detailModal');openLoginModal()">Sign in to continue →</button>
    </div>
  `;
}

async function loadSecureQuizSession(topicId) {
  const accountSession = typeof AvyaanAPI !== 'undefined' && AvyaanAPI.getToken() && currentUser && !currentUser.isGuest;
  if (!accountSession || typeof AvyaanAPI.createQuizSession !== 'function') return null;
  const session = await AvyaanAPI.createQuizSession(topicId);
  if (currentActiveTopic?.id !== topicId) return session;
  if (session && session.status === 'success' && Array.isArray(session.questions) && session.questions.length) {
    quizSessionQuestions = {
      topicId,
      sessionId: session.session_id,
      questions: session.questions,
      expiresAt: session.expires_at,
    };
    renderTopicModal();
  } else {
    const quizNotice = document.getElementById('quizSecureNotice');
    if (quizNotice) quizNotice.textContent = session?.detail || 'Secure quiz service is unavailable. Please retry this lesson.';
  }
  return session;
}

// Save current learning progress for a topic
function saveTopicProgress() {
  if (!currentActiveTopic) return;
  avyaanStorage.setItem('avyaan_progress_' + currentActiveTopic.id, JSON.stringify({
    step: currentActiveStep,
    revealedStep: currentRevealedStep,
    quizIndex: currentQuizIndex,
    timestamp: Date.now()
  }));
}

// Mark topic as mastered from the detail modal
async function markTopicMasteredFromModal(topicId) {
  const requiresServer = typeof AvyaanAPI !== 'undefined' && AvyaanAPI.getToken() && currentUser && !currentUser.isGuest;
  if (requiresServer) {
    const result = await AvyaanAPI.markMastered(topicId, quizSession?.id);
    if (!result || result.status !== 'success') {
      if (typeof toast === 'function') toast(result?.detail || 'Complete the server quiz before recording mastery.');
      return false;
    }
  }
  const wasAlreadyMastered = completedTopicIds.has(topicId);
  const topic = AVYAAN_DATA.topics.find(t => t.id === topicId);
  completedTopicIds.add(topicId);
  avyaanStorage.setItem('avyaan_completed_topics', JSON.stringify(Array.from(completedTopicIds)));
  if (topic) {
    advancePathPosition(topic.subject, topic.class_level, topicId);
    logActivity(topicId, 'mastered');
  }
  updateMasteryScorecard();
  updateStreak();
  if (!wasAlreadyMastered) {
    awardXP(50, 'Topic mastered (manual)');
    scheduleReview(topicId);
    checkBadges();
  }
  renderGrid();
  renderTopicModal();
  maybeCelebrate({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
  return true;
}

function submitPrediction() {
  const input = document.getElementById('predictionInput');
  if (input) {
    userPrediction = input.value.trim();
  }
  if (!userPrediction) {
    userPrediction = '(No prediction written)';
  }
  hasPredicted = true;
  awardXP(10, 'Made a prediction');
  if (currentActiveTopic) logActivity(currentActiveTopic.id, 'prediction');
  checkBadges();
  saveTopicProgress();
  renderTopicModal();
}

function switchLessonStep(stepNum) {
  currentActiveStep = stepNum;
  currentRevealedStep = 1;
  saveTopicProgress();
  renderTopicModal();
}

function revealNextWorkedStep() {
  currentRevealedStep++;
  saveTopicProgress();
  renderTopicModal();
}

function nextQuizQuestion() {
  currentQuizIndex++;
  saveTopicProgress();
  renderTopicModal();
}

// Toggle Scratchpad Drawing Overlay
function toggleScratchpad() {
  isScratchpadActive = !isScratchpadActive;
  const overlay = document.getElementById('scratchpadOverlay');
  if (overlay) {
    overlay.style.display = isScratchpadActive ? 'flex' : 'none';
    if (isScratchpadActive) {
      initScratchpadCanvas();
    }
  }
}

function initScratchpadCanvas() {
  const canvas = document.getElementById('scratchpadCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;

  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  canvas.onmousedown = (e) => { isDrawing = true; const pos = getPos(e); ctx.beginPath(); ctx.moveTo(pos.x, pos.y); };
  canvas.onmousemove = (e) => { if (!isDrawing) return; const pos = getPos(e); ctx.lineTo(pos.x, pos.y); ctx.stroke(); };
  canvas.onmouseup = () => { isDrawing = false; };
  
  canvas.ontouchstart = (e) => { isDrawing = true; const pos = getPos(e); ctx.beginPath(); ctx.moveTo(pos.x, pos.y); };
  canvas.ontouchmove = (e) => { if (!isDrawing) return; const pos = getPos(e); ctx.lineTo(pos.x, pos.y); ctx.stroke(); };
  canvas.ontouchend = () => { isDrawing = false; };
}

function clearScratchpad() {
  const canvas = document.getElementById('scratchpadCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// KaTeX Helper Function — KaTeX is loaded lazily, only when a formula is first shown (Step 2)
let katexPromise = null;
function ensureKatex() {
  if (window.katex && typeof katex.renderToString === 'function') return Promise.resolve();
  if (!katexPromise) {
    katexPromise = new Promise((resolve) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css';
      document.head.appendChild(link);
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => resolve();
      document.head.appendChild(script);
    });
  }
  return katexPromise;
}

function formatMathExpression(expr) {
  if (window.katex && typeof katex.renderToString === 'function') {
    try {
      // KaTeX has no glyph for the rupee sign — render it as "Rs." instead.
      return katex.renderToString(expr.replace(/\*/g, '\\cdot ').replace(/₹/g, 'Rs.'), { throwOnError: false });
    } catch (e) {
      return expr;
    }
  }
  // KaTeX not loaded yet — start the load and re-render once it arrives
  ensureKatex().then(() => {
    if (window.katex && currentActiveTopic && document.getElementById('detailModalContent')) {
      renderTopicModal();
    }
  });
  return expr;
}

// ==========================================================================
// DYNAMIC VISUAL TRANSFORMATION ENGINE DISPATCHER (STEP 1 "SEE IT")
// ==========================================================================
function renderDynamicManipulator(topic) {
  const titleLower = (topic.title || '').toLowerCase();
  const idLower = (topic.id || '').toLowerCase();
  const emoji = topic.visual?.emoji || topic.emoji || '🍌';
  const label = topic.visual?.label || 'items';

  // Data-driven mode: every topic now carries visual.type, so the engine must
  // trust the data and NOT guess from title keywords. 'ratio' is a substring
  // of 'duration' and 'operation' — keyword guessing silently picks the wrong
  // tool. kwTitle is the visual type when present (matching the block's own
  // vtype check), or the raw title otherwise (legacy fallback).
  const visualType = topic.visual?.type;
  const kwTitle = visualType ? visualType : titleLower;
  const kwId = visualType ? '' : idLower;

  // 1. SUBTRACTION ENGINE
  if (kwTitle.includes('subtraction') || kwTitle.includes('take away') || kwId.includes('sub')) {
    subTakeaway = Math.min(subTakeaway, subTotal);
    const remaining = Math.max(0, subTotal - subTakeaway);

    let itemsHtml = '';
    for (let i = 0; i < subTotal; i++) {
      const isSubtracted = i >= remaining;
      itemsHtml += `
        <div class="manip-item ${isSubtracted ? 'subtracted' : 'active'}">
          <span style="font-size: 2.2rem;">${emoji}</span>
          ${isSubtracted ? '<span class="strike-cross">✕</span>' : `<span class="item-num">Item ${i + 1}</span>`}
        </div>
      `;
    }

    return `
      <div class="visual-engine-box">
        <div style="font-size: 0.85rem; font-weight: 800; color: #991b1b; text-transform: uppercase; margin-bottom: 0.6rem;">
          ✂️ Subtraction Take-Away Visual Transformation
        </div>
        
        <div class="engine-controls">
          <div>
            <label>Start Total: <strong>${subTotal}</strong></label>
            <input type="range" min="1" max="10" value="${subTotal}" oninput="subTotal=parseInt(this.value); subTakeaway=Math.min(subTakeaway, subTotal); renderTopicModal();">
          </div>
          <div>
            <label>Take Away: <strong style="color: #dc2626;">-${subTakeaway}</strong></label>
            <input type="range" min="0" max="${subTotal}" value="${subTakeaway}" oninput="subTakeaway=parseInt(this.value); renderTopicModal();">
          </div>
        </div>

        <div class="items-stage">${itemsHtml}</div>

        <div class="math-equation-badge red-theme">
          <span>Start: ${subTotal} ${label}</span> − <span style="color:#dc2626;">Take Away: ${subTakeaway} ${label}</span> = <strong style="color:#059669; font-size:1.25rem;">Remaining: ${remaining} ${label}</strong>
        </div>
      </div>
    `;
  }

  // 2. ADDITION MERGE ENGINE
  if (kwTitle.includes('addition') || kwTitle.includes('plus') || kwTitle.includes('sum')) {
    let itemsAHtml = Array(addA).fill(0).map((_, i) => `<div class="manip-item active"><span style="font-size:2rem;">${emoji}</span><span class="item-num">A${i+1}</span></div>`).join('');
    let itemsBHtml = Array(addB).fill(0).map((_, i) => `<div class="manip-item active"><span style="font-size:2rem;">${emoji}</span><span class="item-num">B${i+1}</span></div>`).join('');

    return `
      <div class="visual-engine-box">
        <div style="font-size: 0.85rem; font-weight: 800; color: #1e40af; text-transform: uppercase; margin-bottom: 0.6rem;">
          ✨ Addition Group Merge Transformation
        </div>
        
        <div class="engine-controls">
          <div>
            <label>Group A: <strong>${addA}</strong></label>
            <input type="range" min="1" max="8" value="${addA}" oninput="addA=parseInt(this.value); isMerged=false; renderTopicModal();">
          </div>
          <div>
            <label>Group B: <strong>${addB}</strong></label>
            <input type="range" min="1" max="8" value="${addB}" oninput="addB=parseInt(this.value); isMerged=false; renderTopicModal();">
          </div>
          <button class="btn btn-primary" onclick="isMerged=!isMerged; renderTopicModal();">${isMerged ? '🔄 Separate Groups' : '✨ Merge Groups!'}</button>
        </div>

        <div class="addition-stage">
          <div class="group-box group-a-box">
            <div style="font-size:0.75rem; font-weight:800; color:#1e40af; margin-bottom:0.4rem;">Group A (${addA})</div>
            <div class="items-stage">${itemsAHtml}</div>
          </div>
          <div class="plus-sign-divider">${isMerged ? '➔' : '+'}</div>
          <div class="group-box group-b-box">
            <div style="font-size:0.75rem; font-weight:800; color:#c2410c; margin-bottom:0.4rem;">Group B (${addB})</div>
            <div class="items-stage">${itemsBHtml}</div>
          </div>
        </div>

        <div class="math-equation-badge blue-theme">
          ${addA} ${label} + ${addB} ${label} = <strong style="font-size:1.25rem; color:#2563eb;">${addA + addB} total ${label}</strong>
        </div>
      </div>
    `;
  }

  // 3. MULTIPLICATION ARRAY GRID ENGINE
  if (kwTitle.includes('multiplication') || kwTitle.includes('times') || kwTitle.includes('times table') || (topic.visual?.type === 'multiply')) {
    let gridCells = '';
    for (let r = 0; r < multRows; r++) {
      for (let c = 0; c < multCols; c++) {
        gridCells += `<div class="grid-cell"><span>${emoji}</span></div>`;
      }
    }

    return `
      <div class="visual-engine-box">
        <div style="font-size: 0.85rem; font-weight: 800; color: #6b21a8; text-transform: uppercase; margin-bottom: 0.6rem;">
          📐 Multiplication 2D Array Grid Transformation
        </div>
        
        <div class="engine-controls">
          <div>
            <label>Rows: <strong>${multRows}</strong></label>
            <input type="range" min="1" max="6" value="${multRows}" oninput="multRows=parseInt(this.value); renderTopicModal();">
          </div>
          <div>
            <label>Columns: <strong>${multCols}</strong></label>
            <input type="range" min="1" max="8" value="${multCols}" oninput="multCols=parseInt(this.value); renderTopicModal();">
          </div>
        </div>

        <div class="array-grid-container" style="grid-template-columns: repeat(${multCols}, 1fr);">
          ${gridCells}
        </div>

        <div class="math-equation-badge purple-theme">
          ${multRows} rows × ${multCols} columns = <strong style="font-size:1.25rem; color:#7c3aed;">${multRows * multCols} total items</strong>
        </div>
      </div>
    `;
  }

  // 4. DIVISION BUCKETS ENGINE
  if (kwTitle.includes('division') || kwTitle.includes('share') || kwTitle.includes('split') || (topic.visual?.type === 'divide')) {
    const itemsPerBucket = Math.floor(divTotal / divBuckets);
    const remainder = divTotal % divBuckets;

    let bucketsHtml = '';
    for (let b = 0; b < divBuckets; b++) {
      let bItems = Array(itemsPerBucket).fill(0).map(() => `<span style="font-size:1.4rem;">${emoji}</span>`).join('');
      bucketsHtml += `
        <div class="bucket-box">
          <div class="bucket-title">Bucket ${b + 1}</div>
          <div class="bucket-content">${bItems}</div>
          <div class="bucket-count">${itemsPerBucket} items</div>
        </div>
      `;
    }

    return `
      <div class="visual-engine-box">
        <div style="font-size: 0.85rem; font-weight: 800; color: #047857; text-transform: uppercase; margin-bottom: 0.6rem;">
          🪣 Division Equal Sharing Transformation
        </div>
        
        <div class="engine-controls">
          <div>
            <label>Total Items: <strong>${divTotal}</strong></label>
            <input type="range" min="2" max="20" value="${divTotal}" oninput="divTotal=parseInt(this.value); renderTopicModal();">
          </div>
          <div>
            <label>Share into Buckets: <strong>${divBuckets}</strong></label>
            <input type="range" min="2" max="5" value="${divBuckets}" oninput="divBuckets=parseInt(this.value); renderTopicModal();">
          </div>
        </div>

        <div class="buckets-stage">${bucketsHtml}</div>

        <div class="math-equation-badge green-theme">
          ${divTotal} ÷ ${divBuckets} buckets = <strong style="font-size:1.25rem; color:#059669;">${itemsPerBucket} per bucket</strong> ${remainder > 0 ? `(Remainder: ${remainder})` : ''}
        </div>
      </div>
    `;
  }

  // 5. FRACTION PIE ENGINE
  if (kwTitle.includes('fraction') || kwTitle.includes('slice') || kwTitle.includes('ratio') || kwTitle.includes('pie chart') || (topic.visual?.type === 'fractionPie')) {
    // honour per-topic defaults when the lesson specifies them
    if (topic.visual?.type === 'fractionPie') {
      if (topic.visual.denominator) fracDen = topic.visual.denominator;
      if (topic.visual.numerator != null) fracNum = Math.min(topic.visual.numerator, fracDen);
    }
    fracNum = Math.min(fracNum, fracDen);
    
    let slicesSvg = '';
    const cx = 60, cy = 60, r = 50;
    for (let i = 0; i < fracDen; i++) {
      const startAngle = (i * 360 / fracDen) * Math.PI / 180;
      const endAngle = ((i + 1) * 360 / fracDen) * Math.PI / 180;
      const x1 = cx + r * Math.sin(startAngle);
      const y1 = cy - r * Math.cos(startAngle);
      const x2 = cx + r * Math.sin(endAngle);
      const y2 = cy - r * Math.cos(endAngle);
      const largeArc = (360 / fracDen) > 180 ? 1 : 0;
      const pathD = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
      const isShaded = i < fracNum;
      slicesSvg += `<path d="${pathD}" fill="${isShaded ? '#2563eb' : '#e2e8f0'}" stroke="#ffffff" stroke-width="2"/>`;
    }

    const decimalVal = (fracNum / fracDen).toFixed(2);
    const percentVal = Math.round((fracNum / fracDen) * 100);

    return `
      <div class="visual-engine-box">
        <div style="font-size: 0.85rem; font-weight: 800; color: #1e40af; text-transform: uppercase; margin-bottom: 0.6rem;">
          🍕 Fraction Pie Shading Transformation
        </div>
        
        <div class="engine-controls">
          <div>
            <label>Shaded Parts (Numerator): <strong>${fracNum}</strong></label>
            <input type="range" min="0" max="${fracDen}" value="${fracNum}" oninput="fracNum=parseInt(this.value); renderTopicModal();">
          </div>
          <div>
            <label>Total Slices (Denominator): <strong>${fracDen}</strong></label>
            <input type="range" min="1" max="12" value="${fracDen}" oninput="fracDen=parseInt(this.value); renderTopicModal();">
          </div>
        </div>

        <div class="fraction-display-stage">
          <svg width="120" height="120" viewBox="0 0 120 120">${slicesSvg}</svg>
          <div style="display:flex; flex-direction:column; align-items:center;">
            <div class="frac-stacked">
              <span>${fracNum}</span>
              <span class="bar"></span>
              <span>${fracDen}</span>
            </div>
            <div style="font-size:0.83rem; font-weight:700; color:var(--text-muted); margin-top:0.4rem;">
              Decimal: <strong>${decimalVal}</strong> | Percentage: <strong>${percentVal}%</strong>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // 6. ELECTRIC CIRCUITS & OHM'S LAW ENGINE
  if (kwTitle.includes('ohm') || kwTitle.includes('circuit') || kwTitle.includes('current') || (topic.visual?.type === 'circuit')) {
    const current = (circVolts / circResist).toFixed(2);
    const power = (circVolts * current).toFixed(1);

    return `
      <div class="visual-engine-box">
        <div style="font-size: 0.85rem; font-weight: 800; color: #d97706; text-transform: uppercase; margin-bottom: 0.6rem;">
          ⚡ Electric Circuit & Ohm's Law Cause & Effect
        </div>
        
        <div class="engine-controls">
          <div>
            <label>Battery Voltage (V): <strong>${circVolts} V</strong></label>
            <input type="range" min="1" max="24" value="${circVolts}" oninput="circVolts=parseFloat(this.value); renderTopicModal();">
          </div>
          <div>
            <label>Resistor (R): <strong>${circResist} Ω</strong></label>
            <input type="range" min="1" max="50" value="${circResist}" oninput="circResist=parseFloat(this.value); renderTopicModal();">
          </div>
        </div>

        <div style="background: #0f172a; border-radius: 8px; padding: 1.2rem; text-align: center; color: #ffffff;">
          <div style="font-size: 1.8rem; margin-bottom: 0.5rem;">
            🔋 Battery (${circVolts}V) ➔ ⚡ Electron Drift Rate ➔ 💡 Bulb Glow (${power}W)
          </div>
          <div style="display:flex; justify-content:space-around; font-family:monospace; font-size:0.9rem;">
            <div>Current I = V/R: <strong style="color:#38bdf8;">${current} A</strong></div>
            <div>Power P = V×I: <strong style="color:#fde047;">${power} W</strong></div>
          </div>
        </div>

        <div class="math-equation-badge blue-theme">
          Voltage (${circVolts}V) ÷ Resistance (${circResist}Ω) = <strong style="font-size:1.2rem; color:#2563eb;">${current} Amperes Current</strong>
        </div>
      </div>
    `;
  }

  // 7. PHYSICS FORCE & ACCELERATION ENGINE
  // 7.5 SPEED / DISTANCE-TIME MANIPULATOR (motion, speed, velocity, distance)
  if (kwTitle.includes('speed') || kwTitle.includes('velocity') || kwTitle.includes('distance')
      || (kwTitle.includes('motion') && kwTitle.includes('time')) || (topic.visual?.type === 'speed')) {
    const spDist = 100;
    const spTime = 5;
    const speedVal = (spDist / spTime).toFixed(1);
    return `
      <div class="visual-engine-box">
        <div style="font-size: 0.85rem; font-weight: 800; color: #0369a1; text-transform: uppercase; margin-bottom: 0.6rem;">
          🏁 Distance-Time Speed Transformation
        </div>
        <div class="engine-controls">
          <div>
            <label>Distance: <strong>${spDist} m</strong></label>
            <input type="range" min="0" max="200" value="${spDist}" oninput="sandboxVal1=parseInt(this.value); renderTopicModal();">
          </div>
          <div>
            <label>Time: <strong>${spTime} s</strong></label>
            <input type="range" min="1" max="20" value="${spTime}" oninput="sandboxVal2=parseInt(this.value); renderTopicModal();">
          </div>
        </div>
        <div style="background: #0f172a; border-radius: 8px; padding: 1.2rem; text-align: center; color: #fff;">
          <div style="font-size: 2rem;">➡️ ${sandboxVal1} m in ${Math.max(1, sandboxVal2)} s</div>
          <div style="font-family: monospace; font-size: 0.9rem; color: #67e8f9;">
            Speed = Distance ÷ Time  ⇒  ${(sandboxVal1 / Math.max(1, sandboxVal2)).toFixed(1)} m/s
          </div>
        </div>
      </div>
    `;
  }

  // 8. FORCE & ACCELERATION MANIPULATOR
  if (kwTitle.includes('force') || kwTitle.includes('push') || kwTitle.includes('motion')
      || kwTitle.includes('friction') || kwTitle.includes('newton') || (topic.visual?.type === 'force')) {
    const accel = (physForce / physMass).toFixed(1);

    return `
      <div class="visual-engine-box">
        <div style="font-size: 0.85rem; font-weight: 800; color: #2563eb; text-transform: uppercase; margin-bottom: 0.6rem;">
          🏎️ Force & Acceleration Vector Transformation
        </div>
        
        <div class="engine-controls">
          <div>
            <label>Applied Push Force (F): <strong>${physForce} N</strong></label>
            <input type="range" min="0" max="100" value="${physForce}" oninput="physForce=parseFloat(this.value); renderTopicModal();">
          </div>
          <div>
            <label>Object Mass (m): <strong>${physMass} kg</strong></label>
            <input type="range" min="1" max="20" value="${physMass}" oninput="physMass=parseFloat(this.value); renderTopicModal();">
          </div>
        </div>

        <div style="background: #0f172a; border-radius: 8px; padding: 1.2rem; text-align: center; color: #ffffff;">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">
            ➡️ Push (${physForce}N) 📦 Box (${physMass}kg) 💨 Accel (${accel}m/s²)
          </div>
          <div style="font-family:monospace; font-size:0.9rem; color:#34d399;">
            Newton's 2nd Law: F = m × a  ⇒  ${physForce}N = ${physMass}kg × ${accel}m/s²
          </div>
        </div>
      </div>
    `;
  }

  // 8. NUMBER LINE MANIPULATOR (integers, ordering, rounding, sequences)
  if (kwTitle.includes('number line') || kwTitle.includes('integer') || kwTitle.includes('negative')
      || kwTitle.includes('ascending') || kwTitle.includes('descending') || kwTitle.includes('rounding')
      || kwTitle.includes('estimate') || kwTitle.includes('sequence') || kwTitle.includes('series')
      || kwTitle.includes('progression') || (topic.visual?.type === 'numberLine')) {
    const points = topic.visual?.points || [-5, -3, 0, 2, 5];
    const minVal = Math.min(...points, -10);
    const maxVal = Math.max(...points, 10);
    const range = maxVal - minVal;

    let markersHtml = '';
    for (let v = minVal; v <= maxVal; v++) {
      const pos = ((v - minVal) / range) * 100;
      const isPoint = points.includes(v);
      markersHtml += `<div style="position: absolute; left: ${pos}%; transform: translateX(-50%); text-align: center;">
        <div style="width: 2px; height: ${isPoint ? '20px' : '10px'}; background: ${isPoint ? '#2563eb' : '#64748b'}; margin: 0 auto;"></div>
        <span style="font-size: ${isPoint ? '0.8rem' : '0.65rem'}; font-weight: ${isPoint ? '800' : '400'}; color: ${isPoint ? '#2563eb' : '#64748b'};">${v}</span>
      </div>`;
    }

    return `
      <div class="visual-engine-box">
        <div class="engine-controls">
          <div>
            <label>Jump to position: <strong>${currentManipulatorValue}</strong></label>
            <input type="range" min="${minVal}" max="${maxVal}" value="${currentManipulatorValue}" oninput="currentManipulatorValue=parseInt(this.value); renderTopicModal();">
          </div>
        </div>
        <div style="position: relative; height: 50px; margin: 1.5rem 0; border-bottom: 2px solid #0f172a;">
          ${markersHtml}
          <div style="position: absolute; left: ${((currentManipulatorValue - minVal) / range) * 100}%; bottom: 100%; transform: translateX(-50%);">
            <span style="font-size: 1.5rem;">📍</span>
          </div>
        </div>
        <div class="math-equation-badge blue-theme">
          Current position: <strong>${currentManipulatorValue}</strong> on the number line
        </div>
      </div>
    `;
  }

  // 9. BAR CHART MANIPULATOR (data handling, statistics)
  if (kwTitle.includes('data') || kwTitle.includes('bar chart') || kwTitle.includes('graph') || kwTitle.includes('statistics') || (topic.visual?.type === 'barChart')) {
    const labels = topic.visual?.labels || ['A', 'B', 'C', 'D'];
    const values = topic.visual?.values || [4, 7, 5, 3];
    const maxVal = Math.max(...values, 10);

    const barsHtml = labels.map((label, i) => {
      const h = (values[i] / maxVal) * 100;
      return `
        <div style="display: flex; flex-direction: column; align-items: center; flex: 1;">
          <span style="font-size: 0.75rem; font-weight: 800; color: #2563eb; margin-bottom: 0.2rem;">${values[i]}</span>
          <div style="width: 80%; height: ${h}px; background: linear-gradient(180deg, #3b82f6, #1d4ed8); border-radius: 4px 4px 0 0; min-height: 2px;"></div>
          <span style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted); margin-top: 0.3rem;">${label}</span>
        </div>
      `;
    }).join('');

    return `
      <div class="visual-engine-box">
        <div style="display: flex; align-items: flex-end; gap: 0.5rem; height: 120px; padding: 0.5rem; background: var(--bg-secondary); border-radius: 8px; border-bottom: 2px solid #0f172a;">
          ${barsHtml}
        </div>
        <div class="math-equation-badge purple-theme">
          Total data points: <strong>${values.reduce((a, b) => a + b, 0)}</strong> | Highest: <strong>${labels[values.indexOf(maxVal)]}</strong> (${maxVal})
        </div>
      </div>
    `;
  }

  // 10. PLACE VALUE BLOCKS MANIPULATOR
  if (kwTitle.includes('place value') || (topic.visual?.type === 'placeValue') || (topic.visual?.type === 'placeValueTable')) {
    const num = currentManipulatorValue;
    const hundreds = Math.floor(num / 100);
    const tens = Math.floor((num % 100) / 10);
    const ones = num % 10;

    return `
      <div class="visual-engine-box">
        <div class="engine-controls">
          <div>
            <label>Number: <strong>${num}</strong></label>
            <input type="range" min="0" max="999" value="${num}" oninput="currentManipulatorValue=parseInt(this.value); renderTopicModal();">
          </div>
        </div>
        <div style="display: flex; gap: 1rem; justify-content: center; margin: 1rem 0;">
          <div style="text-align: center;">
            <div style="font-size: 0.7rem; font-weight: 800; color: #2563eb; margin-bottom: 0.3rem;">HUNDREDS (${hundreds})</div>
            <div style="display: flex; flex-wrap: wrap; gap: 2px; max-width: 80px;">
              ${Array(hundreds).fill('<div style="width: 20px; height: 20px; background: #2563eb; border-radius: 2px;"></div>').join('')}
            </div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 0.7rem; font-weight: 800; color: #059669; margin-bottom: 0.3rem;">TENS (${tens})</div>
            <div style="display: flex; flex-wrap: wrap; gap: 2px; max-width: 60px;">
              ${Array(tens).fill('<div style="width: 16px; height: 20px; background: #059669; border-radius: 2px;"></div>').join('')}
            </div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 0.7rem; font-weight: 800; color: #d97706; margin-bottom: 0.3rem;">ONES (${ones})</div>
            <div style="display: flex; flex-wrap: wrap; gap: 2px; max-width: 50px;">
              ${Array(ones).fill('<div style="width: 12px; height: 12px; background: #d97706; border-radius: 50%;"></div>').join('')}
            </div>
          </div>
        </div>
        <div class="math-equation-badge blue-theme">
          ${num} = ${hundreds}×100 + ${tens}×10 + ${ones}×1
        </div>
      </div>
    `;
  }

  // 11. CLOCK / TIME MANIPULATOR
  if (kwTitle.includes('time') || kwTitle.includes('clock') || (topic.visual?.type === 'clock')) {
    const hours = Math.floor(currentManipulatorValue / 60) % 12 || 12;
    const minutes = currentManipulatorValue % 60;
    const hourAngle = (hours * 30) + (minutes * 0.5);
    const minAngle = minutes * 6;

    return `
      <div class="visual-engine-box">
        <div class="engine-controls">
          <div>
            <label>Time in minutes from 12:00: <strong>${currentManipulatorValue}</strong></label>
            <input type="range" min="0" max="720" value="${currentManipulatorValue}" oninput="currentManipulatorValue=parseInt(this.value); renderTopicModal();">
          </div>
        </div>
        <div style="display: flex; justify-content: center; margin: 1rem 0;">
          <svg width="140" height="140" viewBox="0 0 140 140">
            <circle cx="70" cy="70" r="60" fill="#f8fafc" stroke="#0f172a" stroke-width="3"/>
            ${[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(h => {
              const angle = (h * 30 - 90) * Math.PI / 180;
              const x = 70 + 48 * Math.cos(angle);
              const y = 70 + 48 * Math.sin(angle);
              return `<text x="${x}" y="${y + 4}" text-anchor="middle" font-size="14" font-weight="700" fill="#0f172a">${h}</text>`;
            }).join('')}
            <line x1="70" y1="70" x2="${70 + 30 * Math.cos((hourAngle - 90) * Math.PI / 180)}" y2="${70 + 30 * Math.sin((hourAngle - 90) * Math.PI / 180)}" stroke="#2563eb" stroke-width="4" stroke-linecap="round"/>
            <line x1="70" y1="70" x2="${70 + 45 * Math.cos((minAngle - 90) * Math.PI / 180)}" y2="${70 + 45 * Math.sin((minAngle - 90) * Math.PI / 180)}" stroke="#059669" stroke-width="2" stroke-linecap="round"/>
            <circle cx="70" cy="70" r="4" fill="#0f172a"/>
          </svg>
        </div>
        <div class="math-equation-badge green-theme">
          Time: <strong>${hours}:${minutes.toString().padStart(2, '0')}</strong>
        </div>
      </div>
    `;
  }

  // 12. GEOMETRY SHAPES MANIPULATOR
  if (kwTitle.includes('shape') || kwTitle.includes('geometry') || kwTitle.includes('triangle')
      || kwTitle.includes('angle') || kwTitle.includes('symmetry') || kwTitle.includes('perimeter')
      || kwTitle.includes('rectangle') || kwTitle.includes('square') || kwTitle.includes('quadrilateral')
      || kwTitle.includes('polygon') || kwTitle.includes('area of')
      || (topic.visual?.type === 'shape') || (topic.visual?.type === 'triangle') || (topic.visual?.type === 'angle') || (topic.visual?.type === 'symmetry')) {
    const sides = currentManipulatorValue;
    const angle = 360 / sides;
    let points = '';
    for (let i = 0; i < sides; i++) {
      const a = (i * angle - 90) * Math.PI / 180;
      const x = 70 + 50 * Math.cos(a);
      const y = 70 + 50 * Math.sin(a);
      points += `${x},${y} `;
    }

    return `
      <div class="visual-engine-box">
        <div class="engine-controls">
          <div>
            <label>Number of sides: <strong>${sides}</strong></label>
            <input type="range" min="3" max="12" value="${sides}" oninput="currentManipulatorValue=parseInt(this.value); renderTopicModal();">
          </div>
        </div>
        <div style="display: flex; justify-content: center; margin: 1rem 0;">
          <svg width="140" height="140" viewBox="0 0 140 140">
            <polygon points="${points}" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/>
            ${sides >= 3 ? points.trim().split(' ').map(p => {
              const [x, y] = p.split(',');
              return `<circle cx="${x}" cy="${y}" r="3" fill="#2563eb"/>`;
            }).join('') : ''}
          </svg>
        </div>
        <div class="math-equation-badge purple-theme">
          ${sides}-sided polygon | Interior angle: <strong>${((sides - 2) * 180 / sides).toFixed(1)}°</strong> each
        </div>
      </div>
    `;
  }

  // 13. EQUATION BALANCE / COMPARISON MANIPULATOR
  if (kwTitle.includes('compare') || kwTitle.includes('greater') || kwTitle.includes('less') || kwTitle.includes('equal') || kwTitle.includes('balance') || (topic.visual?.type === 'compare') || (topic.visual?.type === 'equationBalance')) {
    const leftVal = sandboxVal1;
    const rightVal = sandboxVal2;
    const comparison = leftVal > rightVal ? '>' : leftVal < rightVal ? '<' : '=';

    return `
      <div class="visual-engine-box">
        <div class="engine-controls">
          <div>
            <label>Left side: <strong>${leftVal}</strong></label>
            <input type="range" min="0" max="20" value="${leftVal}" oninput="sandboxVal1=parseInt(this.value); renderTopicModal();">
          </div>
          <div>
            <label>Right side: <strong>${rightVal}</strong></label>
            <input type="range" min="0" max="20" value="${rightVal}" oninput="sandboxVal2=parseInt(this.value); renderTopicModal();">
          </div>
        </div>
        <div style="display: flex; justify-content: center; align-items: center; gap: 1.5rem; margin: 1rem 0;">
          <div style="text-align: center;">
            <div style="font-size: 0.7rem; font-weight: 800; color: #2563eb;">LEFT</div>
            <div style="font-size: 2rem; font-weight: 900; color: #2563eb;">${leftVal}</div>
            <div style="display: flex; flex-wrap: wrap; gap: 2px; max-width: 100px; justify-content: center;">
              ${Array(leftVal).fill(`<span style="font-size: 1rem;">${emoji}</span>`).join('')}
            </div>
          </div>
          <div style="font-size: 2.5rem; font-weight: 900; color: ${comparison === '>' ? '#059669' : comparison === '<' ? '#dc2626' : '#d97706'};">${comparison}</div>
          <div style="text-align: center;">
            <div style="font-size: 0.7rem; font-weight: 800; color: #d97706;">RIGHT</div>
            <div style="font-size: 2rem; font-weight: 900; color: #d97706;">${rightVal}</div>
            <div style="display: flex; flex-wrap: wrap; gap: 2px; max-width: 100px; justify-content: center;">
              ${Array(rightVal).fill(`<span style="font-size: 1rem;">${emoji}</span>`).join('')}
            </div>
          </div>
        </div>
        <div class="math-equation-badge ${comparison === '>' ? 'green-theme' : comparison === '<' ? 'red-theme' : 'blue-theme'}">
          ${leftVal} ${comparison} ${rightVal}
        </div>
      </div>
    `;
  }

  // 14. COORDINATE GEOMETRY PLOTTER (coordinate, line graph, speed-distance-time)
  if (kwTitle.includes('coordinate') || kwTitle.includes('graph') && !kwTitle.includes('bar') || kwTitle.includes('linear') || (topic.visual?.type === 'coordinate')) {
    const px = sandboxVal1;
    const py = sandboxVal2;
    const gridSize = 10;
    const cellSize = 20;
    const origin = gridSize * cellSize / 2;

    let gridLines = '';
    for (let i = 0; i <= gridSize; i++) {
      gridLines += `<line x1="${i * cellSize}" y1="0" x2="${i * cellSize}" y2="${gridSize * cellSize}" stroke="#e2e8f0" stroke-width="1"/>`;
      gridLines += `<line x1="0" y1="${i * cellSize}" x2="${gridSize * cellSize}" y2="${i * cellSize}" stroke="#e2e8f0" stroke-width="1"/>`;
    }
    // Axes
    gridLines += `<line x1="${origin}" y1="0" x2="${origin}" y2="${gridSize * cellSize}" stroke="#0f172a" stroke-width="2"/>`;
    gridLines += `<line x1="0" y1="${origin}" x2="${gridSize * cellSize}" y2="${origin}" stroke="#0f172a" stroke-width="2"/>`;
    // Point
    const pointX = origin + px * cellSize;
    const pointY = origin - py * cellSize;
    // Line from origin to point
    gridLines += `<line x1="${origin}" y1="${origin}" x2="${pointX}" y2="${pointY}" stroke="#2563eb" stroke-width="2" stroke-dasharray="4"/>`;
    gridLines += `<circle cx="${pointX}" cy="${pointY}" r="5" fill="#dc2626"/>`;

    return `
      <div class="visual-engine-box">
        <div class="engine-controls">
          <div>
            <label>X coordinate: <strong>${px}</strong></label>
            <input type="range" min="-5" max="5" value="${px}" oninput="sandboxVal1=parseInt(this.value); renderTopicModal();">
          </div>
          <div>
            <label>Y coordinate: <strong>${py}</strong></label>
            <input type="range" min="-5" max="5" value="${py}" oninput="sandboxVal2=parseInt(this.value); renderTopicModal();">
          </div>
        </div>
        <div style="display: flex; justify-content: center; margin: 1rem 0;">
          <svg width="${gridSize * cellSize}" height="${gridSize * cellSize}" viewBox="0 0 ${gridSize * cellSize} ${gridSize * cellSize}" style="border: 1px solid #cbd5e1; border-radius: 8px;">
            ${gridLines}
          </svg>
        </div>
        <div class="math-equation-badge blue-theme">
          Point: (<strong>${px}</strong>, <strong>${py}</strong>) | Distance from origin: <strong>${Math.sqrt(px*px + py*py).toFixed(2)}</strong>
        </div>
      </div>
    `;
  }

  // 15. DECIMAL / PERCENTAGE 10x10 GRID (also used for probability)
  if (kwTitle.includes('decimal') || kwTitle.includes('percentage') || kwTitle.includes('percent')
      || kwTitle.includes('probability') || kwTitle.includes('chance')
      || (topic.visual?.type === 'grid') || (topic.visual?.type === 'decimalAdd')) {
    const filled = Math.min(100, Math.max(0, currentManipulatorValue * 10));
    let cells = '';
    for (let i = 0; i < 100; i++) {
      const isFilled = i < filled;
      cells += `<div style="width: 18px; height: 18px; border: 1px solid #cbd5e1; background: ${isFilled ? '#2563eb' : '#f8fafc'}; border-radius: 2px;"></div>`;
    }
    const decimalVal = (filled / 100).toFixed(2);
    const percentVal = filled;

    return `
      <div class="visual-engine-box">
        <div class="engine-controls">
          <div>
            <label>Fill: <strong>${percentVal}%</strong> (${currentManipulatorValue} tenths)</label>
            <input type="range" min="0" max="10" value="${currentManipulatorValue}" oninput="currentManipulatorValue=parseInt(this.value); renderTopicModal();">
          </div>
        </div>
        <div style="display: flex; justify-content: center; margin: 1rem 0;">
          <div style="display: grid; grid-template-columns: repeat(10, 18px); gap: 0;">
            ${cells}
          </div>
        </div>
        <div class="math-equation-badge purple-theme">
          <strong>${filled}</strong>/100 = <strong>${decimalVal}</strong> = <strong>${percentVal}%</strong>
        </div>
      </div>
    `;
  }

  // 16. INTERACTIVE ANGLE PROTRACTOR
  if (kwTitle.includes('angle') || (topic.visual?.type === 'angle')) {
    const angle = Math.min(180, Math.max(0, currentManipulatorValue * 15));
    const rad = angle * Math.PI / 180;
    const cx = 80, cy = 80, r = 60;
    const x2 = cx + r * Math.cos(rad);
    const y2 = cy - r * Math.sin(rad);

    // Protractor arc
    let arc = '';
    for (let a = 0; a <= angle; a += 5) {
      const ar = a * Math.PI / 180;
      arc += `<line x1="${cx}" y1="${cy}" x2="${cx + 20 * Math.cos(ar)}" y2="${cy - 20 * Math.sin(ar)}" stroke="#fde68a" stroke-width="1"/>`;
    }

    let angleType = '';
    if (angle === 0) angleType = 'Zero angle';
    else if (angle < 90) angleType = 'Acute angle';
    else if (angle === 90) angleType = 'Right angle';
    else if (angle < 180) angleType = 'Obtuse angle';
    else angleType = 'Straight angle';

    return `
      <div class="visual-engine-box">
        <div class="engine-controls">
          <div>
            <label>Angle: <strong>${angle}°</strong></label>
            <input type="range" min="0" max="12" value="${currentManipulatorValue}" oninput="currentManipulatorValue=parseInt(this.value); renderTopicModal();">
          </div>
        </div>
        <div style="display: flex; justify-content: center; margin: 1rem 0;">
          <svg width="160" height="100" viewBox="0 0 160 100">
            ${arc}
            <line x1="${cx}" y1="${cy}" x2="${cx + r}" y2="${cy}" stroke="#0f172a" stroke-width="3"/>
            <line x1="${cx}" y1="${cy}" x2="${x2}" y2="${y2}" stroke="#2563eb" stroke-width="3"/>
            <circle cx="${cx}" cy="${cy}" r="4" fill="#0f172a"/>
            <text x="${cx + 30}" y="${cy - 25}" font-size="14" font-weight="700" fill="#dc2626">${angle}°</text>
          </svg>
        </div>
        <div class="math-equation-badge blue-theme">
          ${angle}° = <strong>${angleType}</strong>
        </div>
      </div>
    `;
  }

  // 17. MONEY COUNTER
  if (kwTitle.includes('money') || kwTitle.includes('profit') || kwTitle.includes('interest')
      || kwTitle.includes('price') || kwTitle.includes('cost') || kwTitle.includes('shopping')
      || kwTitle.includes('budget') || kwTitle.includes('discount') || kwTitle.includes('billing')
      || kwTitle.includes('salary') || kwTitle.includes('wages') || kwTitle.includes('expense')
      || (topic.visual?.type === 'money') || (topic.visual?.type === 'moneyAdd')) {
    const hundreds = Math.floor(sandboxVal1 / 100);
    const fifties = Math.floor((sandboxVal1 % 100) / 50);
    const tens = Math.floor((sandboxVal1 % 50) / 10);
    const ones = sandboxVal1 % 10;

    return `
      <div class="visual-engine-box">
        <div class="engine-controls">
          <div>
            <label>Amount: <strong>₹${sandboxVal1}</strong></label>
            <input type="range" min="0" max="500" value="${sandboxVal1}" oninput="sandboxVal1=parseInt(this.value); renderTopicModal();">
          </div>
        </div>
        <div style="display: flex; justify-content: center; gap: 0.8rem; margin: 1rem 0; flex-wrap: wrap;">
          ${hundreds > 0 ? `<div style="text-align: center;"><div style="font-size: 0.7rem; font-weight: 800; color: #991b1b;">₹100 × ${hundreds}</div><div style="font-size: 2rem;">💵</div></div>` : ''}
          ${fifties > 0 ? `<div style="text-align: center;"><div style="font-size: 0.7rem; font-weight: 800; color: #92400e;">₹50 × ${fifties}</div><div style="font-size: 2rem;">💴</div></div>` : ''}
          ${tens > 0 ? `<div style="text-align: center;"><div style="font-size: 0.7rem; font-weight: 800; color: #166534;">₹10 × ${tens}</div><div style="font-size: 2rem;">💶</div></div>` : ''}
          ${ones > 0 ? `<div style="text-align: center;"><div style="font-size: 0.7rem; font-weight: 800; color: #1e40af;">₹1 × ${ones}</div><div style="font-size: 2rem;">🪙</div></div>` : ''}
        </div>
        <div class="math-equation-badge green-theme">
          Total: <strong>₹${sandboxVal1}</strong> = ${hundreds}×100 + ${fifties}×50 + ${tens}×10 + ${ones}×1
        </div>
      </div>
    `;
  }

  // 18. FRACTION ADDITION VISUALIZER
  if (kwTitle.includes('adding') && kwTitle.includes('fraction') || kwTitle.includes('fraction addition') || (topic.visual?.type === 'fractionAdd')) {
    const num1 = Math.min(sandboxVal1, 8);
    const den1 = 8;
    const num2 = Math.min(sandboxVal2, 8);
    const den2 = 8;
    const resultNum = num1 + num2;
    const resultDen = den1; // like fractions

    function pieSvg(num, den, color) {
      let slices = '';
      const cx = 50, cy = 50, r = 40;
      for (let i = 0; i < den; i++) {
        const sa = (i * 360 / den) * Math.PI / 180;
        const ea = ((i + 1) * 360 / den) * Math.PI / 180;
        const x1 = cx + r * Math.sin(sa), y1 = cy - r * Math.cos(sa);
        const x2 = cx + r * Math.sin(ea), y2 = cy - r * Math.cos(ea);
        const la = (360 / den) > 180 ? 1 : 0;
        slices += `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${la} 1 ${x2} ${y2} Z" fill="${i < num ? color : '#e2e8f0'}" stroke="#fff" stroke-width="1.5"/>`;
      }
      return `<svg width="100" height="100" viewBox="0 0 100 100">${slices}</svg>`;
    }

    return `
      <div class="visual-engine-box">
        <div class="engine-controls">
          <div>
            <label>Fraction 1 numerator: <strong>${num1}</strong>/${den1}</label>
            <input type="range" min="0" max="8" value="${num1}" oninput="sandboxVal1=parseInt(this.value); renderTopicModal();">
          </div>
          <div>
            <label>Fraction 2 numerator: <strong>${num2}</strong>/${den2}</label>
            <input type="range" min="0" max="8" value="${num2}" oninput="sandboxVal2=parseInt(this.value); renderTopicModal();">
          </div>
        </div>
        <div style="display: flex; justify-content: center; align-items: center; gap: 1rem; margin: 1rem 0;">
          <div style="text-align: center;">${pieSvg(num1, den1, '#2563eb')}<div style="font-weight: 800; color: #2563eb;">${num1}/${den1}</div></div>
          <div style="font-size: 2rem; font-weight: 900; color: var(--text-main);">+</div>
          <div style="text-align: center;">${pieSvg(num2, den2, '#059669')}<div style="font-weight: 800; color: #059669;">${num2}/${den2}</div></div>
          <div style="font-size: 2rem; font-weight: 900; color: var(--text-main);">=</div>
          <div style="text-align: center;">${pieSvg(resultNum, resultDen, '#7c3aed')}<div style="font-weight: 800; color: #7c3aed;">${resultNum}/${resultDen}</div></div>
        </div>
        <div class="math-equation-badge purple-theme">
          ${num1}/${den1} + ${num2}/${den2} = <strong>${resultNum}/${resultDen}</strong>${resultNum > resultDen ? ` (= ${Math.floor(resultNum/resultDen)} ${resultNum % resultDen > 0 ? `${resultNum % resultDen}/${resultDen}` : ''})` : ''}
        </div>
      </div>
    `;
  }

  // 19. PATTERN BUILDER
  if (kwTitle.includes('pattern') || (topic.visual?.type === 'pattern')) {
    const patternEmojis = ['🔴', '🟦', '🟢', '🟡', '🟣'];
    const seqLen = currentManipulatorValue + 3;
    let patternHtml = '';
    for (let i = 0; i < seqLen; i++) {
      const emojiIdx = i % patternEmojis.length;
      const isHidden = i >= currentManipulatorValue;
      patternHtml += `<div style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; border: 2px dashed ${isHidden ? '#dc2626' : 'transparent'}; border-radius: 6px; background: ${isHidden ? '#fef2f2' : '#f8fafc'};">${isHidden ? '?' : patternEmojis[emojiIdx]}</div>`;
    }

    return `
      <div class="visual-engine-box">
        <div class="engine-controls">
          <div>
            <label>Visible items: <strong>${currentManipulatorValue}</strong></label>
            <input type="range" min="2" max="8" value="${currentManipulatorValue}" oninput="currentManipulatorValue=parseInt(this.value); renderTopicModal();">
          </div>
        </div>
        <div style="display: flex; justify-content: center; gap: 0.3rem; margin: 1rem 0;">
          ${patternHtml}
        </div>
        <div class="math-equation-badge blue-theme">
          Pattern repeats every <strong>${patternEmojis.length}</strong> items. What comes next?
        </div>
      </div>
    `;
  }

  // 20. SYMMETRY MIRROR
  if (kwTitle.includes('symmetry') || (topic.visual?.type === 'symmetry')) {
    const dots = Math.min(8, currentManipulatorValue);
    let leftDots = '';
    let rightDots = '';
    for (let i = 0; i < dots; i++) {
      const y = 15 + i * 12;
      const x = 30 + (i % 3) * 15;
      leftDots += `<circle cx="${x}" cy="${y}" r="4" fill="#2563eb"/>`;
      rightDots += `<circle cx="${100 - x}" cy="${y}" r="4" fill="#dc2626"/>`;
    }

    return `
      <div class="visual-engine-box">
        <div class="engine-controls">
          <div>
            <label>Points on left side: <strong>${dots}</strong></label>
            <input type="range" min="1" max="8" value="${dots}" oninput="currentManipulatorValue=parseInt(this.value); renderTopicModal();">
          </div>
        </div>
        <div style="display: flex; justify-content: center; margin: 1rem 0;">
          <svg width="120" height="120" viewBox="0 0 120 120">
            <line x1="60" y1="0" x2="60" y2="120" stroke="#0f172a" stroke-width="2" stroke-dasharray="4"/>
            <text x="62" y="12" font-size="8" fill="#64748b">mirror line</text>
            ${leftDots}
            ${rightDots}
          </svg>
        </div>
        <div class="math-equation-badge purple-theme">
          Left side has <strong>${dots}</strong> points → Right side mirrors with <strong>${dots}</strong> points. Total: ${dots * 2}
        </div>
      </div>
    `;
  }

  // 20.5 LIGHT RAYS ENGINE (reflection — angle of incidence = angle of reflection)
  if (kwTitle.includes('light') || (topic.visual?.type === 'light')) {
    if (lightAngleTopic !== topic.id) { lightAngle = topic.visual?.angle ?? 45; lightAngleTopic = topic.id; }
    const theta = Math.min(85, Math.max(5, lightAngle));
    const rad = theta * Math.PI / 180;
    const cx = 92, cy = 62, len = 62;
    const ix = cx - len * Math.cos(rad), iy = cy - len * Math.sin(rad);
    const rx = cx + len * Math.cos(rad), ry = cy - len * Math.sin(rad);
    const arcR = 16;
    return `
      <div class="visual-engine-box">
        <div style="font-size: 0.85rem; font-weight: 800; color: #b45309; text-transform: uppercase; margin-bottom: 0.6rem;">🪞 Light Reflection — Bounce the Ray</div>
        <div class="engine-controls">
          <div>
            <label>Angle from the mirror: <strong>${theta}°</strong></label>
            <input type="range" min="5" max="85" value="${theta}" oninput="lightAngle=parseInt(this.value); renderTopicModal();">
          </div>
        </div>
        <svg viewBox="0 0 184 124" style="width:100%; background:#0b1220; border-radius:10px; margin:0.6rem 0;">
          <line x1="${cx}" y1="8" x2="${cx}" y2="116" stroke="#cbd5e1" stroke-width="4" stroke-linecap="round"/>
          <text x="${cx + 6}" y="18" fill="#94a3b8" font-size="10">MIRROR</text>
          <line x1="${cx - 30}" y1="${cy}" x2="${cx + 30}" y2="${cy}" stroke="#475569" stroke-width="1.5" stroke-dasharray="4 3"/>
          <line x1="${cx}" y1="${cy}" x2="${ix}" y2="${iy}" stroke="#fbbf24" stroke-width="3" stroke-linecap="round" marker-end="url(#rayArrow)"/>
          <line x1="${cx}" y1="${cy}" x2="${rx}" y2="${ry}" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" marker-end="url(#rayArrow)"/>
          <path d="M ${cx} ${cy} L ${cx - arcR} ${cy} A ${arcR} ${arcR} 0 0 1 ${cx - arcR * Math.cos(rad)} ${cy - arcR * Math.sin(rad)} Z" fill="#fbbf24" opacity="0.35"/>
          <path d="M ${cx} ${cy} L ${cx + arcR} ${cy} A ${arcR} ${arcR} 0 0 0 ${cx + arcR * Math.cos(rad)} ${cy - arcR * Math.sin(rad)} Z" fill="#38bdf8" opacity="0.35"/>
          <defs>
            <marker id="rayArrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <polygon points="0 0, 7 3.5, 0 7" fill="#fbbf24"/>
            </marker>
          </defs>
        </svg>
        <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:0.6rem 0.8rem; font-size:0.82rem; color:#92400e;">
          🟡 Angle of incidence = <strong>${theta}°</strong> &nbsp;·&nbsp; 🔵 Angle of reflection = <strong>${theta}°</strong><br>
          The reflected ray bounces off at <strong>exactly the same angle</strong> — that is the law of reflection.
        </div>
      </div>
    `;
  }

  // 20.6 SOUND WAVES ENGINE (pitch from frequency, loudness from amplitude)
  if (kwTitle.includes('sound') || (topic.visual?.type === 'sound')) {
    if (soundTopic !== topic.id) { soundFreq = topic.visual?.freq ?? 30; soundAmp = topic.visual?.amp ?? 40; soundTopic = topic.id; }
    const cycles = Math.round(1 + (soundFreq / 60) * 4);
    const amp = 10 + (soundAmp / 55) * 42;
    const w = 180, h = 70, mid = h / 2;
    let d = 'M 0 ' + mid;
    for (let x = 0; x <= w; x += 2) {
      const y = mid - amp * Math.sin((x / w) * cycles * 2 * Math.PI);
      d += ' L ' + x + ' ' + y.toFixed(1);
    }
    const pitch = soundFreq < 25 ? 'low pitch (fewer waves)' : soundFreq < 45 ? 'medium pitch' : 'high pitch (more waves)';
    const loud = soundAmp < 25 ? 'soft (small waves)' : soundAmp < 45 ? 'medium loudness' : 'loud (big waves)';
    return `
      <div class="visual-engine-box">
        <div style="font-size: 0.85rem; font-weight: 800; color: #7c3aed; text-transform: uppercase; margin-bottom: 0.6rem;">🎵 Sound Waves — See Pitch and Loudness</div>
        <div class="engine-controls">
          <div>
            <label>Frequency (pitch): <strong>${soundFreq}</strong></label>
            <input type="range" min="10" max="60" value="${soundFreq}" oninput="soundFreq=parseInt(this.value); renderTopicModal();">
          </div>
          <div>
            <label>Amplitude (loudness): <strong>${soundAmp}</strong></label>
            <input type="range" min="5" max="55" value="${soundAmp}" oninput="soundAmp=parseInt(this.value); renderTopicModal();">
          </div>
        </div>
        <svg viewBox="0 0 180 70" style="width:100%; background:#0f172a; border-radius:10px; margin:0.6rem 0;">
          <path d="${d}" fill="none" stroke="#a78bfa" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="0" y1="${mid}" x2="180" y2="${mid}" stroke="#334155" stroke-width="1" stroke-dasharray="4 3"/>
        </svg>
        <div style="margin-top:0.5rem; text-align:center;">
          <button class="btn" style="background:#7c3aed; border-color:#7c3aed; color:#fff; font-size:0.8rem;" onclick="playSoundTone()">🔊 Play ${soundInstrument === 'flute' ? 'flute' : 'pluck'}</button>
          <button class="btn" style="background:#fff; border-color:#c4b5fd; color:#5b21b6; font-size:0.8rem; margin-left:0.4rem;" onclick="soundInstrument = soundInstrument === 'flute' ? 'pluck' : 'flute'; renderTopicModal();">${soundInstrument === 'flute' ? '🎸 Try plucked string' : '🎺 Back to flute'}</button>
        </div>
        <div style="background:#f5f3ff; border:1px solid #ddd6fe; border-radius:8px; padding:0.6rem 0.8rem; font-size:0.82rem; color:#5b21b6;">
          🎼 More waves per second = <strong>${pitch}</strong> &nbsp;·&nbsp; 🔊 Bigger waves = <strong>${loud}</strong><br>
          Try raising the frequency: the waves crowd together. Then raise the amplitude: they grow taller. Press ▶ to hear the pitch change!
        </div>
      </div>
    `;
  }

  // 21. WHAT-IF SCENARIO EXPLORER (for science topics — physics, chemistry, biology)
  const isScienceTopic = ['Physics', 'Chemistry', 'Biology', 'Earth & Space'].includes(topic.subject);
  if (isScienceTopic && !kwTitle.includes('force') && !kwTitle.includes('ohm') && !kwTitle.includes('circuit') && !kwTitle.includes('speed') && !kwTitle.includes('distance')) {
    const param1 = sandboxVal1;
    const param2 = sandboxVal2;

    // Generate scenario based on subject
    let scenarioTitle = 'Interactive Exploration';
    let param1Label = 'Parameter 1';
    let param2Label = 'Parameter 2';
    let outcome = '';

    if (topic.subject === 'Physics') {
      // Topic-aware physics scenarios instead of a one-size-fits-all slider
      const pTitle = titleLower;
      if (pTitle.includes('light') || pTitle.includes('reflection') || pTitle.includes('mirror') || pTitle.includes('shadow') || pTitle.includes('spectacle') || pTitle.includes('lens') || pTitle.includes('eye')) {
        param1Label = 'Light Intensity';
        param2Label = 'Angle of Light';
        scenarioTitle = 'How does light behave?';
        outcome = `With light intensity ${param1} and angle ${param2}, the reflected beam ${param1 > 50 ? 'is bright and clearly visible' : 'is dim and harder to see'}. ${param2 > 5 ? 'A steeper angle changes where the beam lands.' : 'A shallow angle keeps the beam close to the surface.'}`;
      } else if (pTitle.includes('sound') || pTitle.includes('vibration') || pTitle.includes('pitch') || pTitle.includes('loud') || pTitle.includes('music') || pTitle.includes('hear')) {
        param1Label = 'Vibration Strength';
        param2Label = 'Vibration Speed';
        scenarioTitle = 'What makes sounds loud or high?';
        outcome = `With vibration strength ${param1} and speed ${param2}, the sound is ${param1 > 50 ? 'loud' : 'soft'}. ${param2 > 5 ? 'Fast vibrations make a high pitch.' : 'Slow vibrations make a low pitch.'}`;
      } else if (pTitle.includes('magnet') || pTitle.includes('pole') || pTitle.includes('magnetic')) {
        param1Label = 'Magnet Strength';
        param2Label = 'Distance';
        scenarioTitle = 'How does magnetism work?';
        outcome = `With magnet strength ${param1} and distance ${param2}, the pull is ${param2 > 5 ? 'too weak to feel' : param1 > 50 ? 'strong' : 'moderate'}. Magnets attract iron from nearby, not far away.`;
      } else if (pTitle.includes('float') || pTitle.includes('sink') || pTitle.includes('buoy') || pTitle.includes('boat')) {
        param1Label = 'Weight of Object';
        param2Label = 'Water Pushed Aside';
        scenarioTitle = 'Why do things float or sink?';
        outcome = `With weight ${param1} and displaced water ${param2}, the object ${param2 * 10 > param1 ? 'floats — the water pushes back harder than the weight' : 'sinks — the weight wins'}.`;
      } else if (pTitle.includes('electric') || pTitle.includes('current') || pTitle.includes('electro') || pTitle.includes('conduct') || pTitle.includes('battery')) {
        param1Label = 'Battery Power';
        param2Label = 'Resistance';
        scenarioTitle = 'How does electricity flow?';
        outcome = `With battery power ${param1} and resistance ${param2}, the current flows ${param1 > 50 ? 'strongly' : 'weakly'}. ${param2 > 5 ? 'More resistance slows the flow.' : 'Low resistance lets charge move easily.'}`;
      } else {
        param1Label = 'Temperature';
        param2Label = 'Pressure';
        scenarioTitle = 'What happens when you change conditions?';
        outcome = `At ${param1Label} = ${param1}°C and ${param2Label} = ${param2} atm, the system ${param1 > 50 ? 'expands rapidly' : 'remains stable'}. ${param2 > 5 ? 'High pressure compresses the material.' : 'Low pressure allows expansion.'}`;
      }
    } else if (topic.subject === 'Chemistry') {
      param1Label = 'Temperature (°C)';
      param2Label = 'Concentration';
      scenarioTitle = 'What happens when you change conditions?';
      outcome = `At ${param1}°C with concentration ${param2}, the reaction ${param1 > 50 ? 'speeds up significantly' : 'proceeds slowly'}. ${param2 > 5 ? 'Higher concentration means more particles collide.' : 'Lower concentration means fewer collisions.'}`;
    } else if (topic.subject === 'Biology') {
      param1Label = 'Light Intensity';
      param2Label = 'Water Amount';
      scenarioTitle = 'What happens when you change conditions?';
      outcome = `With light ${param1} and water ${param2}, the organism ${param1 > 50 && param2 > 3 ? 'thrives and grows well' : param1 < 20 ? 'struggles due to low light' : 'shows reduced growth'}. Both factors are needed together.`;
    } else if (topic.subject === 'Earth & Space') {
      param1Label = 'Distance from Sun';
      param2Label = 'Surface Temperature';
      scenarioTitle = 'What happens when you change conditions?';
      outcome = `At distance ${param1} and temperature ${param2}°C, conditions are ${param1 < 30 && param2 > 0 && param2 < 50 ? 'suitable for liquid water' : 'extreme and inhospitable'}.`;
    }

    return `
      <div class="visual-engine-box">
        <div style="background: linear-gradient(135deg, #f0f9ff, #e0f2fe); border-radius: 8px; padding: 0.6rem 0.8rem; margin-bottom: 0.8rem;">
          <div style="font-size: 0.78rem; font-weight: 800; color: #0284c7; text-transform: uppercase;">🔍 ${scenarioTitle}</div>
        </div>
        <div class="engine-controls">
          <div>
            <label>${param1Label}: <strong>${param1}</strong></label>
            <input type="range" min="0" max="100" value="${param1}" oninput="sandboxVal1=parseInt(this.value); renderTopicModal();">
          </div>
          <div>
            <label>${param2Label}: <strong>${param2}</strong></label>
            <input type="range" min="0" max="10" value="${param2}" oninput="sandboxVal2=parseInt(this.value); renderTopicModal();">
          </div>
        </div>
        <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.8rem; margin-top: 0.8rem;">
          <div style="font-size: 0.75rem; font-weight: 800; color: var(--accent-primary); text-transform: uppercase; margin-bottom: 0.3rem;">📊 Predicted Outcome</div>
          <p style="font-size: 0.85rem; color: var(--text-main);">${outcome}</p>
        </div>
        <div style="margin-top: 0.6rem; padding: 0.5rem 0.8rem; background: #fef3c7; border-radius: 6px; font-size: 0.78rem; color: #92400e;">
          💡 <strong>What-If:</strong> Try moving both sliders to extremes. What happens when one is very high and the other is very low?
        </div>
      </div>
    `;
  }

  // DEFAULT COUNT SLIDER MANIPULATOR
  const visualEmojisHtml = Array(currentManipulatorValue).fill(`<span style="font-size: 2.2rem; margin: 0 0.2rem;">${emoji}</span>`).join('');

  return `
    <div class="manipulator-box">
      <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-muted); margin-bottom: 0.6rem;">
        🎛️ Interactive Manipulator Control: <span id="manipulatorCountVal" style="color: var(--accent-primary); font-size: 1.1rem; font-weight: 800;">${currentManipulatorValue}</span> ${label}
      </div>
      <input type="range" class="manipulator-slider" min="1" max="10" value="${currentManipulatorValue}" oninput="currentManipulatorValue=parseInt(this.value); renderTopicModal();">
      <div id="manipulatorCanvasView" style="margin-top: 1rem; min-height: 50px;">${visualEmojisHtml}</div>
    </div>
  `;
}

// ==========================================================================
// STEP 2 DETAILED FORMULA BREAKDOWN ENGINE (CARDS + TRIANGLE + SANDBOX)
// ==========================================================================

// 1. VARIABLE SYMBOL CARDS GENERATOR
function renderFormulaVariableCards(topic) {
  // This companion panel stays keyword-driven per topic title; it is not part
  // of the data-driven manipulator gate.
  const kwTitle = (topic.title || '').toLowerCase();

  let vars = [];
  if (kwTitle.includes('ohm') || kwTitle.includes('circuit')) {
    vars = [
      { symbol: 'V', name: 'Voltage (Potential Difference)', unit: 'Volts (V)', badgeBg: '#2563eb', analogy: '🌊 Water pressure pushing through a pipe' },
      { symbol: 'I', name: 'Current (Electric Charge Flow)', unit: 'Amperes (A)', badgeBg: '#059669', analogy: '💧 Rate of water flowing through the pipe per second' },
      { symbol: 'R', name: 'Resistance', unit: 'Ohms (Ω)', badgeBg: '#d97706', analogy: '🚧 Narrowness or friction restriction inside pipe' }
    ];
  } else if (kwTitle.includes('force') || kwTitle.includes('push') || kwTitle.includes('motion')) {
    vars = [
      { symbol: 'F', name: 'Net Force', unit: 'Newtons (N)', badgeBg: '#2563eb', analogy: '🏎️ Total push or pull effort applied' },
      { symbol: 'm', name: 'Object Mass', unit: 'Kilograms (kg)', badgeBg: '#7c3aed', analogy: '⚖️ Heavy weight / resistance to motion' },
      { symbol: 'a', name: 'Acceleration', unit: 'Meters / sec² (m/s²)', badgeBg: '#059669', analogy: '💨 How quickly speed increases' }
    ];
  } else if (kwTitle.includes('subtraction')) {
    vars = [
      { symbol: 'A', name: 'Minuend (Start Amount)', unit: 'Initial Count', badgeBg: '#2563eb', analogy: '🍌 Bananas in the basket before eating' },
      { symbol: 'B', name: 'Subtrahend (Take Away)', unit: 'Removed Count', badgeBg: '#dc2626', analogy: '🍌 Bananas taken out or eaten' },
      { symbol: 'C', name: 'Difference (Remaining)', unit: 'Leftover Count', badgeBg: '#059669', analogy: '🍌 Bananas left over in the basket' }
    ];
  } else if (kwTitle.includes('addition')) {
    vars = [
      { symbol: 'A', name: 'First Addend', unit: 'Group A Count', badgeBg: '#2563eb', analogy: '🍎 Apples in Group A' },
      { symbol: 'B', name: 'Second Addend', unit: 'Group B Count', badgeBg: '#d97706', analogy: '🍎 Apples in Group B' },
      { symbol: 'C', name: 'Sum (Total Amount)', unit: 'Combined Count', badgeBg: '#059669', analogy: '🍎 Total apples after merging' }
    ];
  } else if (kwTitle.includes('speed') || kwTitle.includes('velocity') || kwTitle.includes('distance')) {
    vars = [
      { symbol: 's', name: 'Speed', unit: 'metres/sec (m/s)', badgeBg: '#2563eb', analogy: '🏃 How fast you are running' },
      { symbol: 'd', name: 'Distance', unit: 'metres (m)', badgeBg: '#059669', analogy: '🛣️ How far you travelled' },
      { symbol: 't', name: 'Time', unit: 'seconds (s)', badgeBg: '#d97706', analogy: '⏱️ How long it took' }
    ];
  } else if (kwTitle.includes('density')) {
    vars = [
      { symbol: 'ρ', name: 'Density', unit: 'kg/m³', badgeBg: '#2563eb', analogy: '🧱 How tightly packed the material is' },
      { symbol: 'm', name: 'Mass', unit: 'kilograms (kg)', badgeBg: '#059669', analogy: '⚖️ How heavy the object is' },
      { symbol: 'V', name: 'Volume', unit: 'cubic metres (m³)', badgeBg: '#d97706', analogy: '📦 How much space the object takes' }
    ];
  } else if (kwTitle.includes('area') || (kwTitle.includes('rectangle') && !kwTitle.includes('triangle'))) {
    vars = [
      { symbol: 'A', name: 'Area', unit: 'square units (m²)', badgeBg: '#2563eb', analogy: '🔲 Total surface covered' },
      { symbol: 'l', name: 'Length', unit: 'metres (m)', badgeBg: '#059669', analogy: '📏 How long the shape is' },
      { symbol: 'w', name: 'Width', unit: 'metres (m)', badgeBg: '#d97706', analogy: '📐 How wide the shape is' }
    ];
  } else if (kwTitle.includes('percentage') || kwTitle.includes('percent')) {
    vars = [
      { symbol: '%', name: 'Percentage', unit: 'percent (%)', badgeBg: '#2563eb', analogy: '🍕 Slice of the whole (out of 100)' },
      { symbol: 'P', name: 'Part', unit: 'units', badgeBg: '#059669', analogy: '🧩 The portion you are measuring' },
      { symbol: 'W', name: 'Whole', unit: 'units', badgeBg: '#d97706', analogy: '🎯 The total or complete amount' }
    ];
  } else if (kwTitle.includes('interest') || kwTitle.includes('simple interest')) {
    vars = [
      { symbol: 'I', name: 'Simple Interest', unit: 'rupees (₹)', badgeBg: '#2563eb', analogy: '💰 Extra money earned or paid' },
      { symbol: 'P', name: 'Principal', unit: 'rupees (₹)', badgeBg: '#059669', analogy: '🏦 Original amount deposited or borrowed' },
      { symbol: 'R', name: 'Rate', unit: 'percent per year (%)', badgeBg: '#d97706', analogy: '📊 Interest percentage per year' },
      { symbol: 'T', name: 'Time', unit: 'years (yr)', badgeBg: '#7c3aed', analogy: '📅 Duration of the loan/deposit' }
    ];
  } else if (kwTitle.includes('energy') || kwTitle.includes('kinetic')) {
    vars = [
      { symbol: 'E', name: 'Energy', unit: 'Joules (J)', badgeBg: '#2563eb', analogy: '⚡ Capacity to do work' },
      { symbol: 'm', name: 'Mass', unit: 'kilograms (kg)', badgeBg: '#059669', analogy: '⚖️ How heavy the object is' },
      { symbol: 'v', name: 'Velocity', unit: 'metres/sec (m/s)', badgeBg: '#d97706', analogy: '🏃 How fast it is moving' }
    ];
  } else if (kwTitle.includes('pressure')) {
    vars = [
      { symbol: 'P', name: 'Pressure', unit: 'Pascals (Pa)', badgeBg: '#2563eb', analogy: '🎈 Force spread over an area' },
      { symbol: 'F', name: 'Force', unit: 'Newtons (N)', badgeBg: '#059669', analogy: '💪 Total push applied' },
      { symbol: 'A', name: 'Area', unit: 'square metres (m²)', badgeBg: '#d97706', analogy: '🔲 Surface area in contact' }
    ];
  } else if (kwTitle.includes('multiplication') || kwTitle.includes('times')) {
    vars = [
      { symbol: 'A', name: 'First Factor', unit: 'Group A Count', badgeBg: '#2563eb', analogy: '🥚 Number of egg cartons' },
      { symbol: 'B', name: 'Second Factor', unit: 'Group B Count', badgeBg: '#d97706', analogy: '🥚 Eggs per carton' },
      { symbol: 'C', name: 'Product (Total)', unit: 'Combined Count', badgeBg: '#059669', analogy: '🥚 Total eggs in all cartons' }
    ];
  } else if (kwTitle.includes('division') || kwTitle.includes('share')) {
    vars = [
      { symbol: 'D', name: 'Dividend (Total)', unit: 'Total Count', badgeBg: '#2563eb', analogy: '🍪 Total cookies to share' },
      { symbol: 'd', name: 'Divisor (Groups)', unit: 'Number of Groups', badgeBg: '#d97706', analogy: '👥 Number of friends sharing' },
      { symbol: 'Q', name: 'Quotient (Per Group)', unit: 'Count Per Group', badgeBg: '#059669', analogy: '🍪 Cookies each friend gets' }
    ];
  } else {
    vars = [
      { symbol: 'A', name: 'Primary Input Parameter', unit: 'Standard SI Unit', badgeBg: '#2563eb', analogy: '💡 Given starting quantity' },
      { symbol: 'B', name: 'Secondary Input Parameter', unit: 'Standard SI Unit', badgeBg: '#059669', analogy: '💡 Modifying operational factor' },
      { symbol: 'C', name: 'Resulting Output', unit: 'Derived SI Unit', badgeBg: '#7c3aed', analogy: '🎯 Final calculated value' }
    ];
  }

  return `
    <div style="margin-top: 1.2rem;">
      <h4 class="step-subheading">🔤 Variable Breakdown & Real-World Analogies</h4>
      <div class="variable-cards-grid">
        ${vars.map(v => `
          <div class="var-card">
            <div class="var-card-header">
              <span class="var-symbol-badge" style="background: ${v.badgeBg};">${v.symbol}</span>
              <div>
                <div class="var-name">${v.name}</div>
                <div class="var-unit-tag">Unit: <strong>${v.unit}</strong></div>
              </div>
            </div>
            <div class="var-analogy">${v.analogy}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// 2. FORMULA MAGIC TRIANGLE REARRANGER
function renderFormulaMagicTriangle(topic) {
  // Companion breakdown panel — keyword-driven per topic title (not part of
  // the data-driven manipulator gate).
  const kwTitle = (topic.title || '').toLowerCase();

  if (kwTitle.includes('ohm') || kwTitle.includes('circuit')) {
    let eqText = 'V = I × R', ruleText = 'Multiply Current (I) by Resistance (R)';
    if (selectedFormulaTargetVar === 'I') {
      eqText = 'I = V / R'; ruleText = 'Divide Voltage (V) by Resistance (R)';
    } else if (selectedFormulaTargetVar === 'R') {
      eqText = 'R = V / I'; ruleText = 'Divide Voltage (V) by Current (I)';
    }

    return `
      <div class="magic-triangle-box">
        <h4 class="step-subheading">🔺 Interactive Formula Magic Triangle (Rearrange Equation)</h4>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.8rem;">Click any variable to cover it and isolate the formula!</p>
        
        <div class="triangle-layout">
          <div>
            <div class="triangle-buttons-group">
              <button class="tri-btn ${selectedFormulaTargetVar === 'V' || selectedFormulaTargetVar === 'primary' ? 'active' : ''}" onclick="selectedFormulaTargetVar='V'; renderTopicModal();">Isolate Voltage (V)</button>
              <button class="tri-btn ${selectedFormulaTargetVar === 'I' ? 'active' : ''}" onclick="selectedFormulaTargetVar='I'; renderTopicModal();">Isolate Current (I)</button>
              <button class="tri-btn ${selectedFormulaTargetVar === 'R' ? 'active' : ''}" onclick="selectedFormulaTargetVar='R'; renderTopicModal();">Isolate Resistance (R)</button>
            </div>
          </div>

          <div class="rearrange-card">
            <div style="font-size:0.75rem; color:#64748b; font-weight:700;">SOLVING FOR: ${selectedFormulaTargetVar.toUpperCase()}</div>
            <div style="font-size:1.6rem; font-weight:800; color:#60a5fa; margin:0.3rem 0;">${formatMathExpression(eqText)}</div>
            <div style="font-size:0.88rem; color:#e2e8f0;">⚡ <strong>Rule:</strong> ${ruleText}</div>
          </div>
        </div>
      </div>
    `;
  }

  if (kwTitle.includes('force') || kwTitle.includes('push') || kwTitle.includes('motion')) {
    let eqText = 'F = m × a', ruleText = 'Multiply Mass (m) by Acceleration (a)';
    if (selectedFormulaTargetVar === 'a') {
      eqText = 'a = F / m'; ruleText = 'Divide Force (F) by Mass (m)';
    } else if (selectedFormulaTargetVar === 'm') {
      eqText = 'm = F / a'; ruleText = 'Divide Force (F) by Acceleration (a)';
    }

    return `
      <div class="magic-triangle-box">
        <h4 class="step-subheading">🔺 Interactive Formula Magic Triangle (Rearrange Equation)</h4>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.8rem;">Click any variable to cover it and isolate the formula!</p>
        
        <div class="triangle-layout">
          <div>
            <div class="triangle-buttons-group">
              <button class="tri-btn ${selectedFormulaTargetVar === 'F' || selectedFormulaTargetVar === 'primary' ? 'active' : ''}" onclick="selectedFormulaTargetVar='F'; renderTopicModal();">Isolate Force (F)</button>
              <button class="tri-btn ${selectedFormulaTargetVar === 'a' ? 'active' : ''}" onclick="selectedFormulaTargetVar='a'; renderTopicModal();">Isolate Accel (a)</button>
              <button class="tri-btn ${selectedFormulaTargetVar === 'm' ? 'active' : ''}" onclick="selectedFormulaTargetVar='m'; renderTopicModal();">Isolate Mass (m)</button>
            </div>
          </div>

          <div class="rearrange-card">
            <div style="font-size:0.75rem; color:#64748b; font-weight:700;">SOLVING FOR: ${selectedFormulaTargetVar.toUpperCase()}</div>
            <div style="font-size:1.6rem; font-weight:800; color:#60a5fa; margin:0.3rem 0;">${formatMathExpression(eqText)}</div>
            <div style="font-size:0.88rem; color:#e2e8f0;">⚡ <strong>Rule:</strong> ${ruleText}</div>
          </div>
        </div>
      </div>
    `;
  }

  // SPEED / DISTANCE / TIME
  if (kwTitle.includes('speed') || kwTitle.includes('velocity') || kwTitle.includes('distance')) {
    let eqText = 's = d / t', ruleText = 'Divide Distance (d) by Time (t)';
    if (selectedFormulaTargetVar === 'd') {
      eqText = 'd = s × t'; ruleText = 'Multiply Speed (s) by Time (t)';
    } else if (selectedFormulaTargetVar === 't') {
      eqText = 't = d / s'; ruleText = 'Divide Distance (d) by Speed (s)';
    }
    return renderMagicTriangleHtml(['s', 'd', 't'], ['Speed', 'Distance', 'Time'], eqText, ruleText);
  }

  // DENSITY
  if (kwTitle.includes('density')) {
    let eqText = 'ρ = m / V', ruleText = 'Divide Mass (m) by Volume (V)';
    if (selectedFormulaTargetVar === 'm') {
      eqText = 'm = ρ × V'; ruleText = 'Multiply Density (ρ) by Volume (V)';
    } else if (selectedFormulaTargetVar === 'V') {
      eqText = 'V = m / ρ'; ruleText = 'Divide Mass (m) by Density (ρ)';
    }
    return renderMagicTriangleHtml(['ρ', 'm', 'V'], ['Density', 'Mass', 'Volume'], eqText, ruleText);
  }

  // AREA OF RECTANGLE
  if (kwTitle.includes('area') || (kwTitle.includes('rectangle') && !kwTitle.includes('triangle'))) {
    let eqText = 'A = l × w', ruleText = 'Multiply Length (l) by Width (w)';
    if (selectedFormulaTargetVar === 'l') {
      eqText = 'l = A / w'; ruleText = 'Divide Area (A) by Width (w)';
    } else if (selectedFormulaTargetVar === 'w') {
      eqText = 'w = A / l'; ruleText = 'Divide Area (A) by Length (l)';
    }
    return renderMagicTriangleHtml(['A', 'l', 'w'], ['Area', 'Length', 'Width'], eqText, ruleText);
  }

  // PRESSURE
  if (kwTitle.includes('pressure')) {
    let eqText = 'P = F / A', ruleText = 'Divide Force (F) by Area (A)';
    if (selectedFormulaTargetVar === 'F') {
      eqText = 'F = P × A'; ruleText = 'Multiply Pressure (P) by Area (A)';
    } else if (selectedFormulaTargetVar === 'A') {
      eqText = 'A = F / P'; ruleText = 'Divide Force (F) by Pressure (P)';
    }
    return renderMagicTriangleHtml(['P', 'F', 'A'], ['Pressure', 'Force', 'Area'], eqText, ruleText);
  }

  return '';
}

// Helper: render a generic magic triangle
function renderMagicTriangleHtml(symbols, names, eqText, ruleText) {
  const targetVar = selectedFormulaTargetVar === 'primary' ? symbols[0] : selectedFormulaTargetVar;
  return `
    <div class="magic-triangle-box">
      <h4 class="step-subheading">🔺 Interactive Formula Magic Triangle (Rearrange Equation)</h4>
      <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.8rem;">Click any variable to cover it and isolate the formula!</p>
      <div class="triangle-layout">
        <div>
          <div class="triangle-buttons-group">
            ${symbols.map((s, i) => `<button class="tri-btn ${targetVar === s ? 'active' : ''}" onclick="selectedFormulaTargetVar='${s}'; renderTopicModal();">Isolate ${names[i]} (${s})</button>`).join('')}
          </div>
        </div>
        <div class="rearrange-card">
          <div style="font-size:0.75rem; color:#64748b; font-weight:700;">SOLVING FOR: ${targetVar.toUpperCase()}</div>
          <div style="font-size:1.6rem; font-weight:800; color:#60a5fa; margin:0.3rem 0;">${formatMathExpression(eqText)}</div>
          <div style="font-size:0.88rem; color:#e2e8f0;">⚡ <strong>Rule:</strong> ${ruleText}</div>
        </div>
      </div>
    </div>
  `;
}
function renderFormulaSandboxCalculator(topic) {
  // Companion breakdown panel — keyword-driven per topic title (not part of
  // the data-driven manipulator gate).
  const kwTitle = (topic.title || '').toLowerCase();

  if (kwTitle.includes('ohm') || kwTitle.includes('circuit')) {
    const calcCurrent = (sandboxVal1 / sandboxVal2).toFixed(2);
    return `
      <div class="formula-sandbox-box">
        <h4 class="step-subheading" style="color: #1e40af; margin-top:0;">🧮 Live Formula Sandbox (Step-by-Step Substitution)</h4>
        <p style="font-size: 0.83rem; color: var(--text-main);">Type numbers to watch the equation substitute and compute live!</p>

        <div class="sandbox-input-grid">
          <div class="sandbox-field">
            <label>Voltage V (Volts):</label>
            <input type="number" value="${sandboxVal1}" oninput="sandboxVal1=parseFloat(this.value)||1; renderTopicModal();">
          </div>
          <div class="sandbox-field">
            <label>Resistance R (Ohms):</label>
            <input type="number" value="${sandboxVal2}" oninput="sandboxVal2=parseFloat(this.value)||1; renderTopicModal();">
          </div>
        </div>

        <div class="sandbox-step-result">
          <div style="font-weight: 800; color: #1e3a8a; margin-bottom: 0.3rem;">Step-by-Step Substitution:</div>
          <div>1. Standard Formula: <code>I = V / R</code></div>
          <div>2. Substitute Values: <code>I = ${sandboxVal1} / ${sandboxVal2}</code></div>
          <div style="font-weight: 800; color: #059669; margin-top: 0.3rem; font-size: 1.05rem;">
            3. Final Result: Current I = ${calcCurrent} Amperes (A)
          </div>
        </div>
      </div>
    `;
  }

  if (kwTitle.includes('subtraction')) {
    const diff = Math.max(0, sandboxVal1 - sandboxVal2);
    return `
      <div class="formula-sandbox-box">
        <h4 class="step-subheading" style="color: #1e40af; margin-top:0;">🧮 Live Subtraction Sandbox (Step-by-Step Calculation)</h4>

        <div class="sandbox-input-grid">
          <div class="sandbox-field">
            <label>Start Amount (A):</label>
            <input type="number" value="${sandboxVal1}" oninput="sandboxVal1=parseFloat(this.value)||0; renderTopicModal();">
          </div>
          <div class="sandbox-field">
            <label>Take Away (B):</label>
            <input type="number" value="${sandboxVal2}" oninput="sandboxVal2=parseFloat(this.value)||0; renderTopicModal();">
          </div>
        </div>

        <div class="sandbox-step-result">
          <div style="font-weight: 800; color: #1e3a8a; margin-bottom: 0.3rem;">Step-by-Step Math:</div>
          <div>1. Equation: <code>C = A - B</code></div>
          <div>2. Substitute: <code>C = ${sandboxVal1} - ${sandboxVal2}</code></div>
          <div style="font-weight: 800; color: #059669; margin-top: 0.3rem; font-size: 1.05rem;">
            3. Difference: C = ${diff} remaining
          </div>
        </div>
      </div>
    `;
  }

  // SPEED / DISTANCE / TIME
  if (kwTitle.includes('speed') || kwTitle.includes('velocity') || kwTitle.includes('distance')) {
    const speed = (sandboxVal1 / sandboxVal2).toFixed(2);
    return renderSandboxHtml('Speed Calculator', [
      { label: 'Distance d (metres):', val: 'sandboxVal1' },
      { label: 'Time t (seconds):', val: 'sandboxVal2' }
    ], 's = d / t', `s = ${sandboxVal1} / ${sandboxVal2}`, `Speed s = ${speed} m/s`);
  }

  // DENSITY
  if (kwTitle.includes('density')) {
    const density = (sandboxVal1 / sandboxVal2).toFixed(2);
    return renderSandboxHtml('Density Calculator', [
      { label: 'Mass m (kg):', val: 'sandboxVal1' },
      { label: 'Volume V (m³):', val: 'sandboxVal2' }
    ], 'ρ = m / V', `ρ = ${sandboxVal1} / ${sandboxVal2}`, `Density ρ = ${density} kg/m³`);
  }

  // AREA OF RECTANGLE
  if (kwTitle.includes('area') || (kwTitle.includes('rectangle') && !kwTitle.includes('triangle'))) {
    const area = (sandboxVal1 * sandboxVal2).toFixed(2);
    return renderSandboxHtml('Area Calculator', [
      { label: 'Length l (metres):', val: 'sandboxVal1' },
      { label: 'Width w (metres):', val: 'sandboxVal2' }
    ], 'A = l × w', `A = ${sandboxVal1} × ${sandboxVal2}`, `Area A = ${area} m²`);
  }

  // PERCENTAGE
  if (kwTitle.includes('percentage') || kwTitle.includes('percent')) {
    const pct = ((sandboxVal1 / sandboxVal2) * 100).toFixed(1);
    return renderSandboxHtml('Percentage Calculator', [
      { label: 'Part (units):', val: 'sandboxVal1' },
      { label: 'Whole (units):', val: 'sandboxVal2' }
    ], '% = (Part / Whole) × 100', `% = (${sandboxVal1} / ${sandboxVal2}) × 100`, `Percentage = ${pct}%`);
  }

  // SIMPLE INTEREST
  if (kwTitle.includes('interest')) {
    const interest = (sandboxVal1 * sandboxVal2 * currentManipulatorValue / 100).toFixed(2);
    return `
      <div class="formula-sandbox-box">
        <h4 class="step-subheading" style="color: #1e40af; margin-top:0;">🧮 Live Simple Interest Sandbox</h4>
        <div class="sandbox-input-grid">
          <div class="sandbox-field">
            <label>Principal P (₹):</label>
            <input type="number" value="${sandboxVal1}" oninput="sandboxVal1=parseFloat(this.value)||0; renderTopicModal();">
          </div>
          <div class="sandbox-field">
            <label>Rate R (% per year):</label>
            <input type="number" value="${sandboxVal2}" oninput="sandboxVal2=parseFloat(this.value)||0; renderTopicModal();">
          </div>
          <div class="sandbox-field">
            <label>Time T (years):</label>
            <input type="number" value="${currentManipulatorValue}" oninput="currentManipulatorValue=parseFloat(this.value)||1; renderTopicModal();">
          </div>
        </div>
        <div class="sandbox-step-result">
          <div style="font-weight: 800; color: #1e3a8a; margin-bottom: 0.3rem;">Step-by-Step:</div>
          <div>1. Formula: <code>I = (P × R × T) / 100</code></div>
          <div>2. Substitute: <code>I = (${sandboxVal1} × ${sandboxVal2} × ${currentManipulatorValue}) / 100</code></div>
          <div style="font-weight: 800; color: #059669; margin-top: 0.3rem; font-size: 1.05rem;">
            3. Interest I = ₹${interest}
          </div>
        </div>
      </div>
    `;
  }

  // MULTIPLICATION
  if (kwTitle.includes('multiplication') || kwTitle.includes('times')) {
    const product = (sandboxVal1 * sandboxVal2).toFixed(0);
    return renderSandboxHtml('Multiplication Sandbox', [
      { label: 'First Factor (A):', val: 'sandboxVal1' },
      { label: 'Second Factor (B):', val: 'sandboxVal2' }
    ], 'C = A × B', `C = ${sandboxVal1} × ${sandboxVal2}`, `Product C = ${product}`);
  }

  // ADDITION
  if (kwTitle.includes('addition') || kwTitle.includes('plus')) {
    const sum = (sandboxVal1 + sandboxVal2).toFixed(0);
    return renderSandboxHtml('Addition Sandbox', [
      { label: 'First Addend (A):', val: 'sandboxVal1' },
      { label: 'Second Addend (B):', val: 'sandboxVal2' }
    ], 'C = A + B', `C = ${sandboxVal1} + ${sandboxVal2}`, `Sum C = ${sum}`);
  }

  return '';
}

// Helper: render a generic sandbox calculator
function renderSandboxHtml(title, inputs, formula, substituted, result) {
  const valMap = { sandboxVal1, sandboxVal2, currentManipulatorValue };
  return `
    <div class="formula-sandbox-box">
      <h4 class="step-subheading" style="color: #1e40af; margin-top:0;">🧮 Live ${title} (Step-by-Step Substitution)</h4>
      <p style="font-size: 0.83rem; color: var(--text-main);">Type numbers to watch the equation substitute and compute live!</p>
      <div class="sandbox-input-grid">
        ${inputs.map(inp => `
          <div class="sandbox-field">
            <label>${inp.label}</label>
            <input type="number" value="${valMap[inp.val] !== undefined ? valMap[inp.val] : ''}" oninput="${inp.val}=parseFloat(this.value)||0; renderTopicModal();">
          </div>
        `).join('')}
      </div>
      <div class="sandbox-step-result">
        <div style="font-weight: 800; color: #1e3a8a; margin-bottom: 0.3rem;">Step-by-Step Substitution:</div>
        <div>1. Standard Formula: <code>${formula}</code></div>
        <div>2. Substitute Values: <code>${substituted}</code></div>
        <div style="font-weight: 800; color: #059669; margin-top: 0.3rem; font-size: 1.05rem;">
          3. Final Result: ${result}
        </div>
      </div>
    </div>
  `;
}
function renderFlashcardsPanel(topic) {
  const cards = topic.flashcards || [];
  if (cards.length === 0) return '';

  const cardsHtml = cards.map((card, i) => `
    <div class="flashcard" onclick="this.classList.toggle('flipped')">
      <div class="flashcard-inner">
        <div class="flashcard-front">
          <span style="font-size: 0.7rem; font-weight: 800; color: #dc2626; text-transform: uppercase;">⚠️ Common Myth</span>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.3rem;">${card.myth}</p>
          <span style="font-size: 0.7rem; color: var(--text-dim); margin-top: auto;">Tap to reveal fact →</span>
        </div>
        <div class="flashcard-back">
          <span style="font-size: 0.7rem; font-weight: 800; color: #059669; text-transform: uppercase;">✓ Scientific Fact</span>
          <p style="font-size: 0.85rem; color: #1e3a8a; margin-top: 0.3rem;">${card.fact}</p>
          <span style="font-size: 0.7rem; color: var(--text-dim); margin-top: auto;">← Tap to go back</span>
        </div>
      </div>
    </div>
  `).join('');

  return `
    <div style="margin-top: 1.2rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
      <h4 style="font-size: 0.9rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.6rem;">🃏 Myth vs Fact Flashcards <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600;">(tap each card to flip)</span></h4>
      <div class="flashcards-grid">${cardsHtml}</div>
    </div>
  `;
}

// 5. EXPERIMENT / ACTIVITY CORNER PANEL (Do / Say / Write / Check framework)
function renderExperimentPanel(topic) {
  const exp = topic.experiment;
  if (!exp) return '';

  const itemsHtml = (exp.items || []).map(item => `<span style="font-size: 0.78rem; background: var(--bg-hover); padding: 0.2rem 0.6rem; border-radius: 6px; margin: 0.15rem;">📋 ${item}</span>`).join('');
  const stepsHtml = (exp.steps || []).map((s, i) => `
    <div style="display: flex; gap: 0.5rem; margin-bottom: 0.4rem;">
      <span style="flex-shrink: 0; width: 22px; height: 22px; background: var(--accent-primary); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 800;">${i + 1}</span>
      <span style="font-size: 0.85rem; color: var(--text-main);">${s}</span>
    </div>
  `).join('');

  // Generate Do/Say/Write/Check — subject-aware text so lessons never show generic boilerplate
  const subject = topic.subject;
  const sayText = {
    'Mathematics': `Explain the pattern or rule you noticed, using the formula from Step 2.`,
    'Physics': `Explain what you observed using the physical law from Step 3.`,
    'Chemistry': `Describe what happened to the materials and why, using the ideas from Step 3.`,
    'Biology': `Explain what you observed about the living system and how it responded.`,
    'Computer Science & AI': `Explain the steps you followed and what the output tells you.`,
    'Earth & Space': `Explain what you observed about the Earth or space system.`
  }[subject] || `Explain what you observe using the concept: ${topic.title}.`;
  const writeText = {
    'Mathematics': `Write the numbers you used and the result you got. Check it against: ${topic.schoolForm?.expression || topic.summary || 'the rule from Step 2'}.`,
    'Physics': `Record the starting conditions, what changed, and the final measurement. Verify with: ${topic.schoolForm?.expression || 'the law from Step 2'}.`,
    'Chemistry': `Record what you saw before, during, and after. Note the conditions and the result.`,
    'Biology': `Record what you observed and how the living thing responded over time.`,
    'Computer Science & AI': `Write down the inputs, the steps, and the output you got.`,
    'Earth & Space': `Record what you observed and what it tells you about the system.`
  }[subject] || `Record your observations and compare them with ${topic.schoolForm?.expression || 'the standard rule'}.`;
  const checkText = exp.explanation || {
    'Mathematics': 'Check your result against the formula or rule from Step 2.',
    'Physics': 'Check whether your observation matches the physical law from Step 3.',
    'Chemistry': 'Compare your observation with the expected chemical behaviour.',
    'Biology': 'Compare your observation with how the living system normally works.',
    'Computer Science & AI': 'Verify that the output follows the rules of the algorithm you learned.',
    'Earth & Space': 'Compare your observation with how the Earth system normally behaves.'
  }[subject] || 'Compare your result with the expected outcome.';
  const doText = (exp.steps && exp.steps[0]) || 'Set up the materials and observe what happens.';

  return `
    <div style="margin-top: 1.2rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
      <h4 style="font-size: 0.9rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.6rem;">🔬 ${exp.title || 'Hands-on Activity Corner'}</h4>
      
      <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 0.5rem 0.8rem; margin-bottom: 0.6rem; font-size: 0.78rem; color: #92400e;">
        ⚠️ <strong>Safety First:</strong> Perform under adult supervision. Do not taste or smell unknown substances directly.
      </div>

      <div style="margin-bottom: 0.6rem;">
        <div style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted); margin-bottom: 0.3rem;">Materials Needed:</div>
        <div style="display: flex; flex-wrap: wrap; gap: 0.2rem;">${itemsHtml}</div>
      </div>

      <!-- DO / SAY / WRITE / CHECK FRAMEWORK -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; margin: 0.8rem 0;">
        <div style="background: var(--accent-primary-light); border-left: 3px solid #2563eb; padding: 0.6rem 0.8rem; border-radius: 0 8px 8px 0;">
          <div style="font-size: 0.72rem; font-weight: 800; color: #2563eb; text-transform: uppercase; margin-bottom: 0.2rem;">👉 Do</div>
          <p style="font-size: 0.82rem; color: #1e3a8a;">${doText}</p>
        </div>
        <div style="background: #fef3c7; border-left: 3px solid #d97706; padding: 0.6rem 0.8rem; border-radius: 0 8px 8px 0;">
          <div style="font-size: 0.72rem; font-weight: 800; color: #d97706; text-transform: uppercase; margin-bottom: 0.2rem;">🗣️ Say</div>
          <p style="font-size: 0.82rem; color: #92400e;">${sayText}</p>
        </div>
        <div style="background: #f5f3ff; border-left: 3px solid #7c3aed; padding: 0.6rem 0.8rem; border-radius: 0 8px 8px 0;">
          <div style="font-size: 0.72rem; font-weight: 800; color: #7c3aed; text-transform: uppercase; margin-bottom: 0.2rem;">✏️ Write</div>
          <p style="font-size: 0.82rem; color: #5b21b6;">${writeText}</p>
        </div>
        <div style="background: #ecfdf5; border-left: 3px solid #059669; padding: 0.6rem 0.8rem; border-radius: 0 8px 8px 0;">
          <div style="font-size: 0.72rem; font-weight: 800; color: #059669; text-transform: uppercase; margin-bottom: 0.2rem;">✅ Check</div>
          <p style="font-size: 0.82rem; color: #065f46;">${checkText}</p>
        </div>
      </div>

      <div style="margin-bottom: 0.6rem;">
        <div style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted); margin-bottom: 0.3rem;">Detailed Steps:</div>
        ${stepsHtml}
      </div>
    </div>
  `;
}

// 6a. SUBJECT COLOR KEY — maps each subject to a color key for CSS styling
function subjectColorKey(subject) {
  const map = {
    'Mathematics': 'math',
    'Physics': 'physics',
    'Chemistry': 'chemistry',
    'Biology': 'biology',
    'Computer Science & AI': 'cs',
    'Earth & Space': 'earth',
    'Science': 'science'
  };
  return map[subject] || 'default';
}

// Display subject for a topic: young classes (≤ 6) see one "Science" subject.
function topicDisplaySubject(topic) {
  return displaySubject(topic.subject, topic.class_level);
}

// Subjects the current user actually sees (chips, dashboard, path cards).
function visibleSubjects() {
  return subjectsForGrade((currentUser && currentUser.grade) || 1);
}

// 6b. RELATED TOPICS PANEL — shows same-subject topics at adjacent class levels
function renderRelatedTopicsPanel(topic) {
  const related = AVYAAN_DATA.topics.filter(t =>
    t.id !== topic.id &&
    t.subject === topic.subject &&
    Math.abs(t.class_level - topic.class_level) <= 1
  ).slice(0, 4);

  if (related.length === 0) return '';

  const cardsHtml = related.map(t => `
    <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.6rem; cursor: pointer; transition: border-color 0.2s;" onmouseover="this.style.borderColor='var(--accent-primary)'" onmouseout="this.style.borderColor='var(--border-color)'" onclick="openTopicDetail('${t.id}')">
      <div style="display: flex; align-items: center; gap: 0.4rem;">
        <span style="font-size: 1.3rem;">${t.emoji}</span>
        <div>
          <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-main);">${topicTitle(t)}</div>
          <div style="font-size: 0.68rem; color: var(--text-muted);">Class ${t.class_level} ${completedTopicIds.has(t.id) ? '• ★ Mastered' : ''}</div>
        </div>
      </div>
    </div>
  `).join('');

  return `
    <div style="margin-top: 1.2rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
      <h4 style="font-size: 0.9rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.6rem;">🔗 Related Topics in ${topicDisplaySubject(topic)}</h4>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.5rem;">
        ${cardsHtml}
      </div>
    </div>
  `;
}

// 6c. TOPIC NAVIGATION — Previous / Up Next within the learning path
function renderTopicNavigation(topic) {
  const path = getPathFor(topic.subject, topic.class_level);
  const currentIdx = path.findIndex(t => t.id === topic.id);
  const prevTopic = currentIdx > 0 ? path[currentIdx - 1] : null;
  const nextTopic = currentIdx >= 0 && currentIdx < path.length - 1 ? path[currentIdx + 1] : null;
  const nextUnmastered = path.slice(currentIdx + 1).find(t => !completedTopicIds.has(t.id)) || null;
  const upNext = nextUnmastered || nextTopic;
  const pathDone = currentIdx >= 0 && path.slice(currentIdx + 1).every(t => completedTopicIds.has(t.id));

  const pathSummary = pathDone ? '🎉 Path complete — great work!' : (upNext ? `Up next: ${upNext.title}` : '');

  return `
    <div style="margin-top: 1.2rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.5rem;">
        <div style="font-size: 0.75rem; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: var(--text-muted);">Your ${topicDisplaySubject(topic)} Path · Class ${topic.class_level}</div>
        <button class="btn btn-sm" onclick="openPathModal('${topic.subject.replace(/'/g, "\\'")}', ${topic.class_level})">🗺️ Curriculum Path</button>
      </div>
      <div style="display: flex; justify-content: space-between; gap: 0.5rem;">
        ${prevTopic ? `
          <button class="btn" style="flex: 1; text-align: left; font-size: 0.8rem;" onclick="openTopicDetail('${prevTopic.id}')">
            ‹ ${prevTopic.emoji} ${prevTopic.title}
          </button>
        ` : '<div style="flex: 1;"></div>'}
        ${upNext ? `
          <button class="btn btn-primary" style="flex: 1; text-align: right; font-size: 0.8rem;" onclick="openTopicDetail('${upNext.id}')">
            <span style="display:block; font-size:0.65rem; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; opacity:0.85;">${pathDone ? 'All done' : 'Up Next'}</span>
            ${upNext.title} ${upNext.emoji} ›
          </button>
        ` : '<div style="flex: 1;"></div>'}
      </div>
      ${pathSummary && !pathDone ? `<div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.4rem;">${pathSummary}</div>` : ''}
    </div>
  `;
}

// 6c-1. LEARNING PATH — ordered topic chain for a subject + class.
// Display-aware: "Science" merges Physics/Chemistry/Biology for that class,
// while the underlying per-topic subject stays intact for content tools.
function getPathFor(subject, classLevel) {
  const display = displaySubject(subject, classLevel);
  return AVYAAN_DATA.topics.filter(t =>
    topicDisplaySubject(t) === display && t.class_level === classLevel
  );
}

function getPathPositions() {
  try { return JSON.parse(avyaanStorage.getItem('avyaan_path_positions') || '{}'); } catch (e) { return {}; }
}

function getCurrentPathTopic(subject, classLevel) {
  const path = getPathFor(subject, classLevel);
  const positions = getPathPositions();
  const key = displaySubject(subject, classLevel) + '::' + classLevel;
  const saved = positions[key];
  if (saved) {
    const savedIdx = path.findIndex(t => t.id === saved);
    if (savedIdx >= 0) return path[savedIdx];
  }
  // Fall back to the first unmastered, unlockable topic
  return path.find(t => !completedTopicIds.has(t.id) && canAccessTopic(t)) || path[0] || null;
}

function advancePathPosition(subject, classLevel, masteredId) {
  const path = getPathFor(subject, classLevel);
  const positions = getPathPositions();
  const key = displaySubject(subject, classLevel) + '::' + classLevel;
  const currentIdx = path.findIndex(t => t.id === masteredId);
  if (currentIdx < 0) return;
  const next = path.slice(currentIdx + 1).find(t => !completedTopicIds.has(t.id));
  positions[key] = next ? next.id : (path[path.length - 1] || {}).id || '';
  avyaanStorage.setItem('avyaan_path_positions', JSON.stringify(positions));
}

// 6c-2. CURRICULUM PATH MODAL
function openPathModal(subject, classLevel) {
  currentPathSubject = subject;
  currentPathClass = classLevel;
  renderPathModal();
  openModal('pathModal');
}

function renderPathModal() {
  const container = document.getElementById('pathModalContent');
  if (!container) return;
  const subject = currentPathSubject || 'Mathematics';
  const classLevel = currentPathClass || 1;
  const path = getPathFor(subject, classLevel);
  if (!path.length) { container.innerHTML = '<p>No topics yet for this subject and class.</p>'; return; }

  const mastered = path.filter(t => completedTopicIds.has(t.id)).length;
  const current = getCurrentPathTopic(subject, classLevel);
  const percent = Math.round((mastered / path.length) * 100);
  const subjKey = subjectColorKey(subject);

  const rows = path.map((t, i) => {
    const isMastered = completedTopicIds.has(t.id);
    const isCurrent = current && current.id === t.id;
    const locked = !canAccessTopic(t);
    let icon = '⚪';
    if (isMastered) icon = '✅';
    else if (locked) icon = '🔒';
    else if (isCurrent) icon = '▶️';
    return `
      <div class="path-row ${isCurrent ? 'path-row-current' : ''} ${locked ? 'path-row-locked' : ''}" style="${locked ? '' : 'cursor: pointer;'}" ${locked ? '' : `onclick="openTopicDetail('${t.id}')"`}>
        <span class="path-index">${i + 1}</span>
        <span class="path-status">${icon}</span>
        <span class="path-emoji">${t.emoji}</span>
        <span class="path-title">${topicTitle(t)}</span>
        ${isAssigned(t.id) ? '<span class="assign-badge" title="Assigned by your teacher">📋</span>' : ''}
        <span class="path-tier">${locked ? t.required_tier === 'primary_paid' ? 'Premium' : 'Locked' : ''}</span>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="path-modal-head">
      <div style="display:flex; align-items:center; gap:0.6rem;">
        <span class="subject-badge subject-${subjKey}">${subject}</span>
        <span class="class-tag">Class ${classLevel}</span>
      </div>
      <h2 style="font-size:1.3rem; font-weight:800; color:#0f172a; margin:0.6rem 0 0.2rem;">Learning Path</h2>
      <p style="font-size:0.85rem; color:var(--text-muted); margin:0 0 0.8rem;">Follow the order below — each topic builds on the one before it.</p>
      <div class="path-progress-bar"><div class="path-progress-fill subject-${subjKey}" style="width:${percent}%"></div></div>
      <div style="font-size:0.8rem; color:#334155; margin-top:0.35rem;">${mastered} of ${path.length} topics mastered (${percent}%)</div>
      ${current && !completedTopicIds.has(current.id) ? `
        <button class="btn btn-primary" style="margin-top:0.8rem;" onclick="openTopicDetail('${current.id}'); closeModal('pathModal');">▶ Continue: ${current.title}</button>
      ` : path.length && path.every(t => completedTopicIds.has(t.id)) ? `
        <div style="margin-top:0.8rem; font-size:0.9rem; font-weight:700; color:#059669;">🎉 You have mastered this whole path!</div>
      ` : ''}
    </div>
    <div class="path-list">${rows}</div>
    <div class="path-legend" style="font-size:0.75rem; color:var(--text-muted); margin-top:0.7rem; display:flex; gap:1rem; flex-wrap:wrap;">
      <span>✅ Mastered</span><span>▶️ Your next topic</span><span>⚪ Not started</span><span>🔒 Premium</span>
      ${isAssigned(path[0] && path[0].id) ? '<span>📋 Assigned</span>' : ''}
    </div>
    <div style="margin-top:0.9rem; padding-top:0.8rem; border-top:1px dashed var(--border-color); display:flex; gap:0.6rem;">
      <button class="btn" style="font-size:0.78rem; flex:1;" onclick="copyAssignmentLink()">👩‍🏫 Copy assignment link</button>
      <button class="btn" style="font-size:0.78rem; flex:1;" onclick="printWorksheetPack('${subject.replace(/'/g, "\\'")}', ${classLevel})">🖨️ Print worksheet pack</button>
    </div>
  `;
}

// ==========================================================================
// WORKSHEET PACK — printable multi-topic bundle for a class + subject path
// ==========================================================================
function printWorksheetPack(subject, classLevel) {
  const path = getPathFor(subject, classLevel);
  if (!path.length) return;
  const pack = path.slice(0, 10);

  const letter = (label) => `<div class="ans-line">${label}: <span class="line"></span></div>`;
  const topicHtml = pack.map((t, i) => {
    const quiz = (t.mcqs && t.mcqs.length ? t.mcqs : [t.tryIt]).filter(Boolean).slice(0, 3);
    const quizHtml = quiz.length ? quiz.map((q, qi) => `
      <div class="quiz-item">
        <p><strong>Q${qi + 1}.</strong> ${q.question}</p>
        ${(q.options || []).map((opt, oi) => `<label class="quiz-opt"><span class="opt-letter">${String.fromCharCode(65 + oi)}</span> ${opt}</label>`).join('')}
      </div>
    `).join('') : '<p>No quiz.</p>';
    const experiment = t.experiment && t.experiment.steps && t.experiment.steps.length
      ? `<ol class="exp-list">${t.experiment.steps.slice(0, 4).map(s => `<li>${s}</li>`).join('')}</ol>` : '';
    const chapter = t.chapter ? t.chapter.replace(/^Chapter\s*\d+\s*—\s*/, '') : '';
    return `
    <div class="pack-page">
      <div class="pk-head">
        <div>
          <div class="pk-num">Worksheet ${i + 1} / ${pack.length}</div>
          <div class="pk-title">${t.emoji} ${escapeHtml(t.title)}</div>
          <div class="pk-meta">${t.subject} · Class ${t.class_level}${chapter ? ' · 📖 ' + chapter : ''}</div>
        </div>
        <div class="pk-id">${t.id}</div>
      </div>
      <div class="name-line"><span></span><span></span></div>
      <p><strong>About:</strong> ${escapeHtml(t.summary)}</p>
      ${t.outcome ? `<p><strong>You will be able to:</strong> ${t.outcome.replace(/^You can\s+/i, '')}</p>` : ''}
      <h3>Quiz</h3>
      ${quizHtml}
      ${experiment ? `<h3>Hands-on activity</h3><div class="exp-box">${experiment}</div>` : ''}
      ${letter('My notes')}
    </div>`;
  }).join('<div class="page-break"></div>');

  const w = window.open('', '_blank', 'width=820,height=1050');
  if (!w) return;
  w.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Worksheet Pack: ${subject} Class ${classLevel}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: var(--text-main); margin: 0; padding: 28px; font-size: 12.5px; }
  .pack-cover { text-align: center; padding: 40px 10px; border-bottom: 3px solid #0f172a; margin-bottom: 20px; }
  .pack-cover h1 { font-size: 26px; margin: 0 0 6px; }
  .pack-cover p { color: var(--text-muted); margin: 2px 0; }
  .pack-page { padding: 6px 0; }
  .pk-head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 10px; }
  .pk-num { font-size: 10px; letter-spacing: 0.08em; color: var(--text-dim); text-transform: uppercase; }
  .pk-title { font-size: 20px; font-weight: 800; margin-top: 2px; }
  .pk-meta { font-size: 11px; color: var(--text-muted); margin-top: 3px; }
  .pk-id { font-size: 10px; color: var(--text-dim); text-align: right; }
  .name-line { display: flex; gap: 40px; margin-bottom: 12px; font-weight: 700; }
  .name-line span { border-bottom: 1px solid #0f172a; flex: 1; }
  h3 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; margin: 14px 0 5px; color: #1e293b; }
  p { margin: 4px 0; }
  .quiz-opt { display: block; margin: 3px 0 3px 16px; }
  .opt-letter { display: inline-block; width: 15px; height: 15px; border: 1px solid #334155; border-radius: 3px; text-align: center; font-size: 9px; font-weight: 700; margin-right: 5px; }
  .exp-box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; margin-top: 4px; }
  .exp-list { margin: 4px 0 4px 16px; }
  .ans-line { margin: 12px 0 2px; }
  .line { display: inline-block; width: 75%; border-bottom: 1px dotted #94a3b8; }
  .page-break { page-break-after: always; }
  .pack-foot { margin-top: 26px; border-top: 1px solid #cbd5e1; padding-top: 8px; font-size: 10px; color: var(--text-dim); text-align: center; }
  @media print { body { padding: 12px; } }
</style>
</head>
<body>
  <div class="pack-cover">
    <h1>📚 Avyaan Worksheet Pack</h1>
    <p><strong>${subject} · Class ${classLevel}</strong></p>
    <p>${pack.length} worksheets · one page each · practice a little every day</p>
    <div class="name-line" style="margin-top:26px;"><span></span><span></span></div>
  </div>
  ${topicHtml}
  <div class="pack-foot">Generated by Avyaan STEM for Classes 1–10 · smaraze.com</div>
</body>
</html>`);
  w.document.close();
  w.focus();
  setTimeout(() => { try { w.print(); } catch (e) {} }, 400);
}

// ==========================================================================
// PARENT / TEACHER DASHBOARD — progress, weak areas, streak, activity
// ==========================================================================

function openDashboard() {
  const authenticated = currentUser && currentUser.id && currentUser.id !== 'guest';
  if (!authenticated) {
    openLoginModal();
    return;
  }
  renderDashboard();
  openModal('dashboardModal');
}

function renderDashboard() {
  const container = document.getElementById('dashboardContent');
  if (!container) return;

  const all = AVYAAN_DATA.topics;
  const masteredCount = completedTopicIds.size;
  const totalCount = all.length;
  const overallPct = Math.round((masteredCount / totalCount) * 100);
  const streakData = JSON.parse(avyaanStorage.getItem('avyaan_streak_data') || '{}');
  const level = getUserLevel();
  const studentName = currentUser ? currentUser.name : 'Guest';
  const grade = currentUser && currentUser.grade ? currentUser.grade : '—';

  // Per-subject stats (display-aware: young classes see Science as one row)
  const subjectRows = visibleSubjects().map(subj => {
    const topics = all.filter(t => topicDisplaySubject(t) === subj);
    const mastered = topics.filter(t => completedTopicIds.has(t.id));
    const pct = topics.length ? Math.round((mastered.length / topics.length) * 100) : 0;
    const scores = mastered.map(t => getSmartScore(t.id)).filter(s => s > 0);
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    const subjKey = subjectColorKey(subj);
    return `
      <div class="dash-subject" onclick="closeModal('dashboardModal'); openPathModal('${subj.replace(/'/g, "\\'")}', ${grade});">
        <div class="dash-subject-top">
          <span class="subject-badge subject-${subjKey}">${subj}</span>
          <span class="dash-subject-count">${mastered.length}/${topics.length} · ${avg !== null ? `avg ${avg}` : '—'}</span>
        </div>
        <div class="path-progress-bar"><div class="path-progress-fill subject-${subjKey}" style="width:${pct}%"></div></div>
      </div>
    `;
  }).join('');

  // Weak areas: attempted or due-for-review topics that are not mastered yet
  const attempted = Object.keys(smartScores).filter(id => smartScores[id] > 0 && !completedTopicIds.has(id));
  const dueForReview = getTopicsDueForReview().filter(id => !completedTopicIds.has(id));
  const weakPool = Array.from(new Set([...attempted, ...dueForReview]));
  const weakTopics = weakPool
    .map(id => all.find(t => t.id === id))
    .filter(Boolean)
    .sort((a, b) => (getSmartScore(a.id) - getSmartScore(b.id)) || (a.class_level - b.class_level))
    .slice(0, 6);

  const weakHtml = weakTopics.length ? weakTopics.map(t => `
    <button class="dash-weak-chip" onclick="closeModal('dashboardModal'); openTopicDetail('${t.id}')">
      ${t.emoji} ${t.title}
      <span class="dash-weak-score">${getSmartScore(t.id) > 0 ? getSmartScore(t.id) : 'due'}</span>
    </button>
  `).join('') : '<div style="font-size:0.85rem; color:var(--text-muted);">No weak areas yet — attempt a quiz to build this list.</div>';

  // Recent activity
  const log = getActivityLog().slice(-8).reverse();
  const activityHtml = log.length ? log.map(a => `
    <div class="dash-activity-row">
      <span>${a.emoji}</span>
      <span class="dash-activity-title">${a.title}</span>
      <span class="dash-activity-type">${activityTypeLabel(a.type)}</span>
      <span class="dash-activity-time">${timeAgo(a.ts)}</span>
    </div>
  `).join('') : '<div style="font-size:0.85rem; color:var(--text-muted);">No activity yet — complete a lesson to see it here.</div>';

  // Class coverage
  const classRows = [1,2,3,4,5,6,7,8,9,10].map(c => {
    const topics = all.filter(t => t.class_level === c);
    const mastered = topics.filter(t => completedTopicIds.has(t.id)).length;
    const pct = topics.length ? Math.round((mastered / topics.length) * 100) : 0;
    return `
      <div class="dash-class-row">
        <span class="dash-class-label">Class ${c}</span>
        <div class="path-progress-bar" style="flex:1;"><div class="path-progress-fill subject-math" style="width:${pct}%; background:#94a3b8;"></div></div>
        <span class="dash-class-pct">${mastered}/${topics.length}</span>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="dash-head">
      <div style="display:flex; align-items:center; gap:0.8rem;">
        <span class="nav-avatar" style="font-size:1.4rem; width:3rem; height:3rem;">${currentUser && currentUser.avatar ? currentUser.avatar : (studentName[0] || 'G')}</span>
        <div>
          <h2 style="font-size:1.3rem; font-weight:800; color:#0f172a; margin:0;">Progress Dashboard</h2>
          <p style="font-size:0.85rem; color:var(--text-muted); margin:0.15rem 0 0;">${studentName} · Class ${grade} · ${level.icon} ${level.name}</p>
        </div>
      </div>
      <div style="display:flex; flex-direction:column; gap:0.4rem; align-items:flex-end;">
        <div style="display:flex; gap:0.35rem;">
          <button class="btn btn-primary" style="font-size:0.75rem; padding:0.4rem 0.9rem;" onclick="openWeeklyReport()">👨‍👩‍👧 Weekly Report</button>
          <button class="btn" style="font-size:0.75rem; padding:0.4rem 0.9rem;" onclick="emailWeeklyReport()">📧 Email</button>
        </div>
        <button class="btn" style="font-size:0.72rem; padding:0.32rem 0.8rem;" id="weeklyEmailToggle" onclick="toggleWeeklyEmailSubscription()">${avyaanStorage.getItem('avyaan_weekly_email_subscribed') === 'on' ? '✓ Weekly email ON' : '📧 Weekly email OFF'}</button>
        <button class="btn" style="font-size:0.75rem; padding:0.4rem 0.9rem;" onclick="renderFamilyProfilesPanel(); openModal('familyProfilesModal')">👨‍👩‍👧👦 Family Profiles</button>
        <button class="btn" style="font-size:0.75rem; padding:0.4rem 0.9rem; background:#f5f3ff; border-color:#ddd6fe; color:#5b21b6;" onclick="openParentDashboard()">👨‍👩‍👧 Parent View</button>
        <button class="btn" style="font-size:0.75rem; padding:0.4rem 0.9rem;" onclick="openVocabPanel()">📖 Words I learned</button>
        <button class="btn" style="font-size:0.75rem; padding:0.4rem 0.9rem;" onclick="generateShareCard()">📤 Share Progress Card</button>
        <button class="btn" style="font-size:0.75rem; padding:0.4rem 0.9rem;" onclick="exportProgress()">💾 Backup</button>
        <button class="btn" style="font-size:0.75rem; padding:0.4rem 0.9rem;" onclick="importProgress()">↩ Restore</button>
        <button class="btn" style="font-size:0.75rem; padding:0.4rem 0.9rem;" onclick="syncProgressToCloud().then(() => renderDashboard())">☁️ Sync</button>
        ${cloudSyncStatusLine()}
      </div>
      <div class="dash-stats">
        <div class="dash-stat"><span class="dash-stat-value">${masteredCount}</span><span class="dash-stat-label">Mastered</span></div>
        <div class="dash-stat"><span class="dash-stat-value">${overallPct}%</span><span class="dash-stat-label">Complete</span></div>
        <div class="dash-stat"><span class="dash-stat-value">${userXP}</span><span class="dash-stat-label">XP</span></div>
        <div class="dash-stat"><span class="dash-stat-value">${streakData.count || 0}🔥</span><span class="dash-stat-label">Day streak</span></div>
        <div class="dash-stat"><span class="dash-stat-value">${earnedBadges.size}</span><span class="dash-stat-label">Badges</span></div>
      </div>
    </div>

    <div class="dash-section">
      <h3 class="dash-section-title">📚 Progress by Subject</h3>
      <div class="dash-subject-grid">${subjectRows}</div>
    </div>

    <div class="dash-section">
      <h3 class="dash-section-title">🎯 Needs Attention</h3>
      <div class="dash-weak-grid">${weakHtml}</div>
    </div>

    <div class="dash-section">
      <h3 class="dash-section-title">🕘 Recent Activity</h3>
      ${activityHtml}
    </div>

    <div class="dash-section">
      <h3 class="dash-section-title">🏫 Class Coverage</h3>
      ${classRows}
    </div>
  `;
}

// 6d. UNMARK topic as mastered. Authenticated learners must confirm the
// server mutation before changing the local mirror; guests remain local-only.
async function unmarkTopicMastered(topicId) {
  const requiresServer = typeof AvyaanAPI !== 'undefined' && AvyaanAPI.getToken() && currentUser && !currentUser.isGuest;
  if (requiresServer) {
    const result = await AvyaanAPI.unmarkMastered(topicId);
    if (!result || result.status !== 'success') {
      if (typeof toast === 'function') toast(result?.detail || 'The server could not remove mastery. Try again.');
      return false;
    }
  }
  completedTopicIds.delete(topicId);
  avyaanStorage.setItem('avyaan_completed_topics', JSON.stringify(Array.from(completedTopicIds)));
  updateMasteryScorecard();
  renderGrid();
  renderTopicModal();
  return true;
}

// 6d-1. OUTCOME SELF-ASSESSMENT — "Can you do this now?" after the quiz
async function selfAssessOutcome(rating) {
  const topic = currentActiveTopic;
  if (!topic) return;
  // Record the honest self-rating against the lesson outcome
  const assessments = JSON.parse(avyaanStorage.getItem('avyaan_self_assessments') || '{}');
  assessments[topic.id] = { rating, ts: Date.now() };
  avyaanStorage.setItem('avyaan_self_assessments', JSON.stringify(assessments));

  const nextBtn = `<button class="btn btn-primary" style="font-size:0.85rem; margin-top:0.7rem;" onclick="navigateToNextTopic()">Next Topic ›</button>`;
  const retryBtn = `<button class="btn" style="font-size:0.85rem; margin-top:0.7rem;" onclick="restartQuiz()">🔄 Try the quiz again</button>`;

  let masteryRecorded = true;
  if (rating === 'yes') {
    // Mastering re-renders the modal, so grab the feedback div only AFTER.
    if (!completedTopicIds.has(topic.id)) {
      masteryRecorded = await markTopicMasteredFromModal(topic.id);
    } else {
      updateMasteryScorecard();
    }
    if (!masteryRecorded) {
      const blockedFeedback = document.getElementById('selfCheckFeedback');
      if (blockedFeedback) {
        blockedFeedback.innerHTML = '<div class="selfcheck-feedback selfcheck-almost">Mastery is locked until the server quiz is completed with a passing score. Please finish the diagnostic quiz first.</div>';
      }
      return;
    }
  } else if (rating === 'almost') {
    scheduleReview(topic.id, false); // "almost" — bring it back for a quick review soon
  }

  const feedback = document.getElementById('selfCheckFeedback');
  const options = document.querySelector('.selfcheck-options');
  if (options) options.style.display = 'none';
  if (feedback) {
    if (rating === 'yes') {
      feedback.innerHTML = `<div class="selfcheck-feedback selfcheck-yes">🎉 Fantastic — you've got this! <strong>${escapeHtml(topic.title)}</strong> is now marked as mastered. ${nextBtn}</div>`;
    } else if (rating === 'almost') {
      feedback.innerHTML = `<div class="selfcheck-feedback selfcheck-almost">💪 Almost there! We'll schedule a short review so it sticks. Re-read <strong>Step 3 · Why It Works</strong>, then try again. ${retryBtn} ${nextBtn}</div>`;
    } else {
      feedback.innerHTML = `<div class="selfcheck-feedback selfcheck-no">💛 No worries — every expert started as a beginner. Go back to <strong>Step 3 · Why It Works</strong>, explore the visual, and try the quiz again. ${retryBtn} ${nextBtn}</div>`;
    }
  }
  logActivity(topic.id, 'self-assessed:' + rating);
}

// Vocabulary ladder — 'Words I learned' panel (data in js/vocab_data.js)
let vocabKnown = new Set(JSON.parse(avyaanStorage.getItem('avyaan_vocab_known') || '[]'));

function vocabBand() {
  const g = (currentUser && currentUser.grade) || 1;
  const bands = window.AVYAAN_VOCAB || [];
  return bands.find(b => {
    const parts = b.band.split('-');
    return parseInt(parts[0]) <= g && g <= parseInt(parts[1]);
  }) || bands[0];
}

function openVocabPanel() {
  openModal('vocabModal');
  renderVocabPanel();
}

function renderVocabPanel() {
  const el = document.getElementById('vocabPanelContent');
  if (!el) return;
  const band = vocabBand();
  if (!band || !band.words || !band.words.length) {
    el.innerHTML = '<p style="color:var(--text-muted);">No vocabulary yet — try a lesson first!</p>';
    return;
  }
  const words = band.words;
  const known = words.filter(w => vocabKnown.has(w.word)).length;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const cards = words.map(w => {
    const isKnown = vocabKnown.has(w.word);
    const q = w.word.replace(/'/g, "\\'");
    return `
      <div style="border:1px solid var(--border-color); border-radius:12px; padding:0.9rem; background:var(--bg-card);">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem;">
          <div style="font-size:1.25rem; font-weight:800; color:var(--text-main); text-transform:capitalize;">${esc(w.word)}</div>
          <button class="btn" style="font-size:0.75rem; padding:0.25rem 0.6rem; ${isKnown ? 'background:#ecfdf5; color:#059669; border-color:#6ee7b7;' : 'background:var(--bg-secondary);'}" onclick="toggleVocabWord('${q}')">${isKnown ? '✓ I know it' : 'I know this'}</button>
        </div>
        <div style="font-size:0.9rem; color:var(--text-muted); margin-top:0.45rem; line-height:1.5;">“${esc(w.context)}”</div>
        <div style="font-size:0.75rem; color:var(--text-dim); margin-top:0.35rem;">from ${esc(w.lesson)} · Class ${w.class}</div>
      </div>`;
  }).join('');
  el.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.8rem; flex-wrap:wrap; gap:0.4rem;">
      <h3 style="font-size:1.2rem; font-weight:800; color:var(--text-main); margin:0;">📖 Words I learned</h3>
      <span style="font-size:0.85rem; color:var(--text-muted);">Class ${band.band} · ${known}/${words.length} known</span>
    </div>
    <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(240px, 1fr)); gap:0.7rem;">${cards}</div>
    <p style="font-size:0.8rem; color:var(--text-dim); margin-top:0.8rem;">Every word and sentence comes from your actual lessons — tap “I know this” as you meet them. ✨</p>`;
}

function toggleVocabWord(word) {
  if (vocabKnown.has(word)) vocabKnown.delete(word); else vocabKnown.add(word);
  avyaanStorage.setItem('avyaan_vocab_known', JSON.stringify(Array.from(vocabKnown)));
  renderVocabPanel();
}

// Human-readable labels for activity-feed entries (dashboard + report)
const ACTIVITY_TYPE_LABELS = {
  'mastered': '✅ Mastered',
  'quiz': '📝 Quiz',
  'prediction': '🔮 Prediction',
  'estimation': '🎯 Estimation',
  'daily-challenge': '⭐ Daily Challenge',
  'self-assessed:yes': '🤔 Self-check · Got it',
  'self-assessed:almost': '🤔 Self-check · Almost',
  'self-assessed:no': '🤔 Self-check · Not yet'
};
function activityTypeLabel(type) {
  return ACTIVITY_TYPE_LABELS[type] || type;
}

// 6e. RESTART QUIZ — reset quiz session state
function restartQuiz() {
  currentQuizIndex = 0;
  quizCorrectCount = 0;
  quizAnsweredCount = 0;
  quizSessionDone = false;
  quizSession = null;
  quizSessionQuestions = null;
  saveTopicProgress();
  renderTopicModal();
  loadSecureQuizSession(currentActiveTopic?.id);
}

// 6f. NAVIGATE TO NEXT TOPIC — finds next topic in same subject/class
function navigateToNextTopic() {
  if (!currentActiveTopic) return;
  const sameLevelTopics = AVYAAN_DATA.topics.filter(t =>
    t.subject === currentActiveTopic.subject && t.class_level === currentActiveTopic.class_level
  );
  const currentIdx = sameLevelTopics.findIndex(t => t.id === currentActiveTopic.id);
  if (currentIdx < sameLevelTopics.length - 1) {
    openTopicDetail(sameLevelTopics[currentIdx + 1].id);
  }
}

// 5b. MULTI-LEVEL EXPLANATION (Simple / Standard / Deep) for Step 3
function renderMultiLevelExplanation(topic, whyItWorks) {
  const summary = topic.summary || '';
  const title = topic.title || '';
  const subject = topic.subject || '';

  // Generate 3 levels of explanation
  let simple = `"${whyItWorks.text || summary}"`;
  let standard = `"${whyItWorks.text || summary}" ${whyItWorks.reason || ''}`;
  let deep = '';

  if (subject === 'Mathematics') {
    simple = `${title} works because of a simple pattern or rule we can see and touch. ${whyItWorks.text || summary}`;
    standard = `${whyItWorks.text || summary} ${whyItWorks.reason || 'The mathematical relationship follows from the structure of numbers and operations.'}`;
    deep = `${whyItWorks.text || summary} ${whyItWorks.reason || ''} At a deeper level, this follows from the axioms of arithmetic and the properties of the number system. The formula ${topic.schoolForm?.expression || ''} is derived from these fundamental principles, and every step in the solution can be traced back to a mathematical proof.`;
  } else if (subject === 'Physics') {
    simple = `${title} happens because of a simple physical rule. ${whyItWorks.text || summary} Think of it like a cause and effect in nature.`;
    standard = `${whyItWorks.text || summary} ${whyItWorks.reason || 'This follows from the laws of physics — energy, force, and matter follow strict conservation and transformation rules.'}`;
    deep = `${whyItWorks.text || summary} ${whyItWorks.reason || ''} At a fundamental level, this is governed by the laws of thermodynamics, Newton's laws of motion, or electromagnetic theory. The equation ${topic.schoolForm?.expression || ''} is a mathematical expression of these underlying physical laws, which have been verified through centuries of experimental evidence.`;
  } else if (subject === 'Chemistry') {
    simple = `${title} happens because of how atoms and molecules interact. ${whyItWorks.text || summary}`;
    standard = `${whyItWorks.text || summary} ${whyItWorks.reason || 'Chemical reactions follow the law of conservation of mass and specific bonding rules between atoms.'}`;
    deep = `${whyItWorks.text || summary} ${whyItWorks.reason || ''} At the molecular level, this involves electron interactions, bond formation/breaking, and energy changes. The behavior follows from quantum mechanics and the electronic structure of atoms. Every chemical change can be explained by the rearrangement of electrons and the drive toward lower energy states.`;
  } else if (subject === 'Biology') {
    simple = `${title} happens because of how living things work. ${whyItWorks.text || summary}`;
    standard = `${whyItWorks.text || summary} ${whyItWorks.reason || 'Living systems follow specific biological processes — cells, tissues, and organs work together following the rules of life.'}`;
    deep = `${whyItWorks.text || summary} ${whyItWorks.reason || ''} At a cellular and molecular level, this involves DNA, proteins, enzymes, and metabolic pathways. The process is regulated by gene expression, hormonal signals, and feedback loops that have evolved over millions of years through natural selection.`;
  } else if (subject === 'Computer Science & AI') {
    simple = `${title} works because computers follow step-by-step instructions. ${whyItWorks.text || summary}`;
    standard = `${whyItWorks.text || summary} ${whyItWorks.reason || 'Computers process data through algorithms — precise sequences of steps that transform input into output.'}`;
    deep = `${whyItWorks.text || summary} ${whyItWorks.reason || ''} At the lowest level, this involves binary logic gates, memory addressing, and CPU instruction cycles. The algorithm's efficiency is measured in time and space complexity (Big-O notation), and modern implementations leverage parallel processing, caching, and optimization techniques.`;
  } else if (subject === 'Earth & Space') {
    simple = `${title} happens because of how the Earth and universe work. ${whyItWorks.text || summary}`;
    standard = `${whyItWorks.text || summary} ${whyItWorks.reason || 'Earth and space phenomena follow measurable physical laws — gravity, plate tectonics, orbital mechanics, and electromagnetic radiation.'}`;
    deep = `${whyItWorks.text || summary} ${whyItWorks.reason || ''} At a fundamental level, this is governed by gravitational forces, thermodynamics, fluid dynamics, and nuclear processes. The Earth's systems interact through complex feedback loops, and cosmic phenomena follow from general relativity and the Standard Model of particle physics.`;
  } else {
    deep = standard;
  }

  const levelConfig = {
    simple: { color: '#ecfdf5', border: '#6ee7b7', text: '#065f46', label: '🟢 Simple Explanation', hint: 'Easy to understand — no jargon' },
    standard: { color: '#eff6ff', border: 'var(--accent-primary)', text: '#1e3a8a', label: '🔵 Standard Explanation', hint: 'Grade-appropriate detail' },
    deep: { color: '#fef2f2', border: '#fca5a5', text: '#991b1b', label: '🔴 Deep Dive', hint: 'Advanced — for curious minds' }
  };

  const cfg = levelConfig[explanationLevel] || levelConfig.standard;
  const text = explanationLevel === 'simple' ? simple : explanationLevel === 'deep' ? deep : standard;

  return `
    <div style="background: ${cfg.color}; border-left: 4px solid ${cfg.border}; padding: 1rem; border-radius: 0 10px 10px 0; margin-bottom: 1rem;">
      <div style="font-size: 0.72rem; font-weight: 800; color: ${cfg.text}; text-transform: uppercase; margin-bottom: 0.3rem;">${cfg.label} <span style="font-weight: 400; text-transform: none;">— ${cfg.hint}</span></div>
      <p style="font-size: 0.95rem; color: ${cfg.text}; line-height: 1.6;">${text}</p>
    </div>
  `;
}

// 6. REAL-LIFE CONNECTION (enhances Step 3)
function renderRealLifeConnection(topic) {
  const summary = topic.summary || '';
  const subject = topic.subject || '';
  const title = topic.title || '';

  // Generate a real-life connection based on subject and topic
  let realLife = '';
  if (subject === 'Mathematics') {
    realLife = `You use <strong>${title}</strong> when shopping (calculating prices), cooking (measuring ingredients), building (measuring dimensions), and managing money. Every calculation in daily life relies on this fundamental concept.`;
  } else if (subject === 'Physics') {
    realLife = `<strong>${title}</strong> is happening around you right now — when you walk, throw a ball, switch on a light, or feel the warmth of the sun. Physics isn't just formulas; it's the invisible rules that govern everything you see and do.`;
  } else if (subject === 'Chemistry') {
    realLife = `<strong>${title}</strong> explains what happens in your kitchen, your body, and the world around you. From the water you drink to the food you cook, chemical processes are at work every moment.`;
  } else if (subject === 'Biology') {
    realLife = `<strong>${title}</strong> is happening inside you and around you right now. Every breath, every heartbeat, every plant growing outside your window — all follow the biological principles you're learning here.`;
  } else if (subject === 'Computer Science & AI') {
    realLife = `<strong>${title}</strong> powers the apps on your phone, the games you play, and the AI assistants you talk to. Understanding this concept means understanding how digital technology shapes our world.`;
  } else if (subject === 'Earth & Space') {
    realLife = `<strong>${title}</strong> is about the planet you live on and the universe beyond. From the weather outside your window to the stars you see at night, these concepts explain your place in the cosmos.`;
  } else {
    realLife = `<strong>${title}</strong> connects directly to the world around you. ${summary}`;
  }

  return `
    <div style="background: #f0fdf4; border-left: 4px solid #059669; padding: 0.8rem 1rem; border-radius: 0 10px 10px 0; margin-top: 1rem;">
      <div style="font-size: 0.75rem; font-weight: 800; color: #059669; text-transform: uppercase; margin-bottom: 0.3rem;">🌍 Real-Life Connection</div>
      <p style="font-size: 0.9rem; color: #065f46; line-height: 1.5;">${realLife}</p>
    </div>
  `;
}

// Render the 5-Step Learning Ladder View
const DIFFICULTY_STYLES = {
  easy:   { bg: '#ecfdf5', bd: '#6ee7b7', color: '#047857', label: '🟢 Easy' },
  medium: { bg: '#fffbeb', bd: '#fde68a', color: '#92400e', label: '🟡 Medium' },
  hard:   { bg: '#fef2f2', bd: '#fecaca', color: '#991b1b', label: '🔴 Hard' }
};

function difficultyChipHtml(topic) {
  const d = DIFFICULTY_STYLES[topic.difficulty];
  if (!d) return '';
  return `<span class="difficulty-tag" style="font-size: 0.68rem; font-weight: 800; background: ${d.bg}; color: ${d.color}; border: 1px solid ${d.bd}; padding: 0.1rem 0.4rem; border-radius: 8px;" title="Difficulty: ${topic.difficulty}">${d.label}</span>`;
}

// Recall score: how many successful spaced recalls a topic has survived. The
// SM-2 reps count is the honest measure of memory-proven-ness.
function renderRecallScore(topic) {
  const entry = getReviewEntry(topic.id);
  const reps = (entry && entry.reps) || 0;
  if (!reps || !isSolidified(topic.id)) return '';
  const title = 'Survived ' + reps + ' successful spaced recall' + (reps === 1 ? '' : 's');
  return `<span style="font-size: 0.68rem; font-weight: 800; background: #f5f3ff; color: #6d28d9; border: 1px solid #ddd6fe; padding: 0.1rem 0.4rem; border-radius: 8px;" title="${title}">🔁 ×${reps}</span>`;
}

// ---- READ-ALOUD: Web Speech API narration for the active lesson ----
function speakLesson() {
  const t = currentActiveTopic;
  if (!t) return;
  if (!('speechSynthesis' in window)) {
    alert('Read-aloud is not supported in this browser.');
    return;
  }
  // Toggle: already speaking -> stop
  if (window.speechSynthesis.speaking || window.speechSynthesis.paused) {
    window.speechSynthesis.cancel();
    setListenLabel(false);
    return;
  }
  const parts = [
    t.title + '.',
    t.outcome ? t.outcome : '',
    (t.whyItWorks && t.whyItWorks.text) || t.summary,
    ...(t.flashcards || []).slice(0, 3).map(fc => (fc.myth || '') + ' ' + (fc.fact || '')),
    ...(t.mcqs || []).slice(0, 1).map(m => m.question)
  ].filter(Boolean);
  const utterance = new SpeechSynthesisUtterance(parts.join(' '));
  utterance.rate = 0.95;
  utterance.lang = 'en-IN';
  utterance.onend = utterance.onerror = () => setListenLabel(false);
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  setListenLabel(true);
}

function setListenLabel(active) {
  const btn = document.getElementById('listenBtn');
  if (btn) btn.innerHTML = active ? '⏹ Stop reading' : '🔊 Listen';
}

function stopReading() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  setListenLabel(false);
}

function renderTopicModal() {
  const topic = currentActiveTopic;
  if (!topic) return;

  const seeIt = topic.seeIt || {
    title: "Start with the picture",
    text: topic.summary,
    instruction: "Look first. Do not calculate yet."
  };
  const schoolForm = topic.schoolForm || {
    title: "Formula / School Form",
    expression: `${topic.title} Formula`,
    text: topic.summary
  };
  const whyItWorks = topic.whyItWorks || {
    title: "Why It Works",
    text: topic.summary,
    reason: "Underlying principles of conservation and transformation."
  };
  const workedExample = topic.workedExample || {
    problem: `Worked example problem for ${topic.title}`,
    steps: ["Step 1: Identify given values.", "Step 2: Calculate result."],
    answer: "Correct solution."
  };

  const accountSession = typeof AvyaanAPI !== 'undefined' && AvyaanAPI.getToken() && currentUser && !currentUser.isGuest;
  const serverQuestionsReady = quizSessionQuestions && quizSessionQuestions.topicId === topic.id && Array.isArray(quizSessionQuestions.questions);
  const quizPool = serverQuestionsReady
    ? quizSessionQuestions.questions
    : (topic.mcqs && topic.mcqs.length > 0 ? topic.mcqs : [topic.tryIt || {
    question: `Practice question for ${topic.title}`,
    options: ["Option A", "Option B", "Option C"],
    answer: 0,
    explanation: "Correct principle."
  }]);

  if (quizPool.length) currentQuizIndex = currentQuizIndex % quizPool.length;
  const currentQuizItem = quizPool[currentQuizIndex];
  const localQuizAvailable = Number.isInteger(currentQuizItem?.answer);
  // Quiz text is content data, not markup.  Keep visible strings escaped and
  // pass callback arguments as HTML-escaped JSON so quotes cannot break the
  // inline handler when a reviewed question contains punctuation.
  const quizQuestionText = escapeHtml(currentQuizItem?.question || '');
  const quizAnswerArg = accountSession ? null : (currentQuizItem?.answer ?? null);
  const quizExplanationArg = accountSession ? '' : (currentQuizItem?.explanation || '');
  const quizExplanationsArg = accountSession ? [] : (currentQuizItem?.explanations || []);
  const quizArg = value => escapeHtml(JSON.stringify(value));
  const formattedFormula = formatMathExpression(schoolForm.expression);
  const workedStepsList = workedExample.steps || ["Step 1: Parse given parameters.", "Step 2: Calculate answer."];

  const container = document.getElementById('detailModalContent');
  container.innerHTML = `
    ${renderSessionDock()}
    <!-- HEADER WITH SCRATCHPAD + MASTERED TOGGLE -->
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
      <div style="display: flex; align-items: center; gap: 1rem;">
        <span style="font-size: 2.5rem; background: var(--bg-secondary); padding: 0.4rem 0.6rem; border-radius: 12px; border: 1px solid var(--border-color);">${topic.emoji}</span>
        <div>
          <div style="display: flex; gap: 0.4rem; margin-bottom: 0.2rem; align-items: center;">
            <span class="class-tag">Class ${topic.class_level}</span>
            <span class="subject-tag subject-color-${subjectColorKey(topic.subject)}">${topic.subject}</span>
            ${difficultyChipHtml(topic)}
            ${topic.chapter ? `<span class="chapter-tag" title="Chapter">📖 ${topic.chapter.replace(/^Chapter\s*\d+\s*—\s*/, '')}</span>` : ''}
            ${completedTopicIds.has(topic.id) ? '<span style="font-size: 0.68rem; font-weight: 800; background: #ecfdf5; color: #059669; border: 1px solid #6ee7b7; padding: 0.1rem 0.4rem; border-radius: 8px;">★ MASTERED</span>' : ''}
          </div>
          <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--text-main);">${topicTitle(topic)}</h2>
          ${topic.outcome ? `
            <div class="lesson-outcome-box">🎯 <strong>By the end of this lesson you can…</strong> ${(topic.outcome || '').replace(/^You can\s+/i, '')}</div>
          ` : ''}
          ${renderBridgesHtml(topic.id)}
        </div>
      </div>

      <div style="display: flex; gap: 0.4rem; flex-shrink: 0; flex-wrap: wrap;">
        ${getSmartScore(topic.id) > 0 ? `
          <div style="background: ${getSmartScore(topic.id) >= 80 ? '#ecfdf5' : getSmartScore(topic.id) >= 50 ? '#fef3c7' : '#fef2f2'}; border: 1px solid ${getSmartScore(topic.id) >= 80 ? '#6ee7b7' : getSmartScore(topic.id) >= 50 ? '#fde68a' : '#fecaca'}; border-radius: 8px; padding: 0.2rem 0.6rem; font-size: 0.75rem; font-weight: 800; color: ${getSmartScore(topic.id) >= 80 ? '#059669' : getSmartScore(topic.id) >= 50 ? '#92400e' : '#991b1b'};">
            📊 SmartScore: ${getSmartScore(topic.id)}
          </div>
        ` : ''}
       ${completedTopicIds.has(topic.id) ? `
         <button class="btn" style="background: #ecfdf5; border-color: #6ee7b7; color: #059669; font-weight: 700; font-size: 0.8rem;" onclick="unmarkTopicMastered('${topic.id}')">★ Mastered</button>
       ` : `
          <span role="status" title="Complete the diagnostic quiz and pass at least 80% to record mastery" style="display:inline-flex; align-items:center; background:#f8fafc; border:1px solid #cbd5e1; color:#475569; font-weight:700; font-size:0.78rem; padding:0.35rem 0.6rem; border-radius:8px;">🎯 Quiz required for mastery</span>
       `}
        <button class="btn" style="background: #fdf4ff; border-color: #f5d0fe; color: #a21caf; font-weight: 700;" onclick="toggleScratchpad()">
          ✏️ Scratchpad
        </button>
        <button class="btn" style="background: #fff7ed; border-color: #fed7aa; color: #9a3412; font-weight: 700;" onclick="printWorksheet()" title="Print a worksheet for school or homework">
          🖨️ Print Worksheet
        </button>
        <button class="btn" style="background: var(--accent-primary-light); border-color: #bfdbfe; color: #1d4ed8; font-weight: 700;" onclick="openChapterReview()" title="Mixed review quiz with questions from every lesson in this chapter">
          🧩 Chapter Review
        </button>
        ${topic.class_level >= 9 ? `
        <button class="btn" style="background: #0f172a; border-color: var(--text-main); color: #fff; font-weight: 700;" onclick="openBoardPrep()" title="Timed board-style practice for this chapter">
          🎯 Board Prep
        </button>
        ` : ''}
        <button id="listenBtn" class="btn ${topic.class_level <= 2 ? 'listen-pulse' : ''}" style="background: var(--bg-secondary); border-color: #cbd5e1; color: var(--text-main); font-weight: 700;" onclick="speakLesson()" title="Read this lesson aloud">
          🔊 ${topic.class_level <= 2 ? 'Read to me' : 'Listen'}
        </button>
      </div>
    </div>

    <!-- 5-STEP LEARNING LADDER TABS BAR (with Predict step) -->
    <div class="step-tabs-bar">
      <button class="step-tab ${currentActiveStep === 0 ? 'active' : ''}" onclick="switchLessonStep(0)" style="background: #fef3c7; border-color: #f59e0b;">
        <span style="background: #f59e0b;">🔮</span> Predict
      </button>
      <button class="step-tab ${currentActiveStep === 1 ? 'active' : ''}" onclick="switchLessonStep(1)">
        <span>1</span> See It
      </button>
      <button class="step-tab ${currentActiveStep === 2 ? 'active' : ''}" onclick="switchLessonStep(2)">
        <span>2</span> Number / Formula
      </button>
      <button class="step-tab ${currentActiveStep === 3 ? 'active' : ''}" onclick="switchLessonStep(3)">
        <span>3</span> Why
      </button>
      <button class="step-tab ${currentActiveStep === 4 ? 'active' : ''}" onclick="switchLessonStep(4)">
        <span>4</span> Solve
      </button>
      <button class="step-tab ${currentActiveStep === 5 ? 'active' : ''}" onclick="switchLessonStep(5)">
        <span>5</span> Try
      </button>
    </div>

    <!-- VISUAL STEP PROGRESS BAR -->
    <div style="display: flex; gap: 4px; margin: 0.5rem 0;">
      ${[0,1,2,3,4,5].map(s => `<div style="flex: 1; height: 4px; border-radius: 2px; background: ${s <= currentActiveStep ? (s === 0 ? '#f59e0b' : 'var(--accent-primary)') : '#e2e8f0'}; transition: background 0.3s;"></div>`).join('')}
    </div>

    <!-- STEP CONTENT VIEWPORT -->
    <div class="step-content-card" style="position: relative;">

      <!-- PHASE 4: ON-SCREEN SCRATCHPAD CANVAS OVERLAY -->
      <div class="scratchpad-wrapper" id="scratchpadOverlay" style="display: ${isScratchpadActive ? 'flex' : 'none'};">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <div style="font-size: 0.9rem; font-weight: 800; color: #a21caf;">✏️ On-Screen Rough Pad / Scribble Canvas</div>
          <div style="display: flex; gap: 0.4rem;">
            <button class="btn" style="font-size: 0.75rem; padding: 0.25rem 0.6rem;" onclick="clearScratchpad()">🧹 Clear</button>
            <button class="btn" style="font-size: 0.75rem; padding: 0.25rem 0.6rem; background: var(--bg-hover);" onclick="toggleScratchpad()">✕ Close</button>
          </div>
        </div>
        <canvas id="scratchpadCanvas" class="scratchpad-canvas"></canvas>
      </div>

      ${currentActiveStep === 0 ? `
        <span class="step-badge-tag" style="background: #fef3c7; color: #92400e;">STEP 0 • PREDICT (BEFORE YOU SEE IT)</span>
        <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.6rem;">🔮 What do you think will happen?</h3>

        <div style="background: linear-gradient(135deg, #fffbeb, #fef3c7); border: 2px solid #f59e0b; border-radius: 12px; padding: 1.2rem; margin-bottom: 1rem;">
          <p style="font-size: 0.9rem; color: #78350f; margin-bottom: 0.8rem;">Before we show you the visual, take a guess! Thinking first helps you learn better.</p>

          <div style="font-size: 0.82rem; font-weight: 700; color: #92400e; margin-bottom: 0.4rem;">${escapeHtml(topic.title)} — what do you already know or predict about this?</div>

          <textarea id="predictionInput" class="form-input" placeholder="Type your prediction here... (e.g., 'I think when you add more, the total gets bigger' or 'I predict the angle changes the shape')" style="width: 100%; min-height: 80px; font-size: 0.85rem; padding: 0.6rem; border: 2px solid #fde68a; border-radius: 8px; resize: vertical; ${hasPredicted ? 'display: none;' : ''}">${userPrediction}</textarea>

          ${!hasPredicted ? `
            <button class="btn btn-primary" style="margin-top: 0.6rem; background: #f59e0b; border-color: #f59e0b;" onclick="submitPrediction()">
              📝 Submit My Prediction →
            </button>
          ` : `
            <div style="background: #ecfdf5; border: 1px solid #6ee7b7; border-radius: 8px; padding: 0.8rem; margin-top: 0.6rem;">
              <div style="font-size: 0.75rem; font-weight: 800; color: #059669; text-transform: uppercase; margin-bottom: 0.3rem;">✅ Your Prediction:</div>
              <p style="font-size: 0.85rem; color: #065f46; font-style: italic;">"${userPrediction}"</p>
            </div>
            <div style="margin-top: 0.6rem; padding: 0.6rem 0.8rem; background: var(--accent-primary-light); border-radius: 8px; font-size: 0.8rem; color: #1e40af;">
              💡 Now let's see if you were right! Click <strong>"See It"</strong> to explore the visual.
            </div>
            <button class="btn btn-primary" style="margin-top: 0.6rem;" onclick="switchLessonStep(1)">
              👁️ See It →
            </button>
          `}
        </div>

        <div style="font-size: 0.78rem; color: var(--text-muted); font-style: italic;">
          🧠 Research shows that predicting before seeing improves memory and understanding — even if your prediction is wrong!
        </div>
      ` : ''}

      ${currentActiveStep === 1 ? `
        <span class="step-badge-tag">STEP 1 • SEE IT (DYNAMIC VISUAL TRANSFORMATION)</span>
        <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.6rem;">${seeIt.title || 'Start with the picture.'}</h3>
        
        <!-- DYNAMIC VISUAL ENGINE -->
        ${renderDynamicManipulator(topic)}

        <p style="font-size: 0.95rem; color: var(--text-main); margin-bottom: 0.8rem;">${seeIt.text || seeIt.prompt}</p>

        <div style="background: #0f172a; color: #ffffff; padding: 0.8rem 1rem; border-radius: 8px; font-weight: 700; font-size: 0.85rem; font-family: monospace;">
          ${seeIt.instruction || 'Look first. Observe the visual effect before calculating.'}
        </div>
      ` : ''}

      ${currentActiveStep === 2 ? `
        <span class="step-badge-tag">STEP 2 • ${schoolForm.expression ? 'NUMBER FORM & FORMULA BREAKDOWN' : 'CONCEPT & SCHOOL FORM'}</span>
        <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.6rem;">${schoolForm.title || 'Formula / School Form'}</h3>

        ${schoolForm.expression ? `
          <!-- MAIN KATEX FORMULA DISPLAY -->
          <div class="formula-card-box">
            <div style="font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase; margin-bottom: 0.3rem;">Standard School Form / Equation:</div>
            <div class="formula-expression">${formattedFormula}</div>
          </div>

          <p style="font-size: 0.95rem; color: var(--text-main); margin-bottom: 0.6rem;">${schoolForm.text}</p>

          <!-- 1. VARIABLE CARDS -->
          ${renderFormulaVariableCards(topic)}

          <!-- 2. FORMULA MAGIC TRIANGLE REARRANGER -->
          ${renderFormulaMagicTriangle(topic)}

          <!-- 3. LIVE FORMULA SANDBOX CALCULATOR -->
          ${renderFormulaSandboxCalculator(topic)}
        ` : `
          <div class="formula-card-box concept-form-box">
            <div style="font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase; margin-bottom: 0.3rem;">Idea to remember:</div>
            <div style="font-size: 1rem; font-weight: 600; color: var(--text-main); line-height: 1.5;">${schoolForm.text}</div>
          </div>
          <p style="font-size: 0.85rem; color: var(--text-dim);">This topic is about ideas and observations, so there is no number formula to memorise. Look for the pattern and explain it in your own words.</p>
        `}

        <div style="font-size: 0.8rem; color: var(--text-dim); font-style: italic; margin-top: 0.8rem;">${schoolForm.note || ''}</div>
      ` : ''}

      ${currentActiveStep === 3 ? `
        <span class="step-badge-tag">STEP 3 • WHY IT WORKS</span>
        <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.6rem;">${whyItWorks.title || 'Why It Works'}</h3>

        <!-- MULTI-LEVEL EXPLANATION TOGGLE -->
        <div style="display: flex; gap: 0.3rem; margin-bottom: 0.8rem;">
          <button class="btn" style="font-size: 0.75rem; padding: 0.3rem 0.7rem; ${explanationLevel === 'simple' ? 'background: var(--accent-primary); color: white; border-color: var(--accent-primary);' : 'background: var(--bg-hover); color: var(--text-muted);'}" onclick="explanationLevel='simple'; renderTopicModal();">🟢 Simple</button>
          <button class="btn" style="font-size: 0.75rem; padding: 0.3rem 0.7rem; ${explanationLevel === 'standard' ? 'background: var(--accent-primary); color: white; border-color: var(--accent-primary);' : 'background: var(--bg-hover); color: var(--text-muted);'}" onclick="explanationLevel='standard'; renderTopicModal();">🔵 Standard</button>
          <button class="btn" style="font-size: 0.75rem; padding: 0.3rem 0.7rem; ${explanationLevel === 'deep' ? 'background: var(--accent-primary); color: white; border-color: var(--accent-primary);' : 'background: var(--bg-hover); color: var(--text-muted);'}" onclick="explanationLevel='deep'; renderTopicModal();">🔴 Deep Dive</button>
        </div>

        ${renderMultiLevelExplanation(topic, whyItWorks)}

        ${renderRealLifeConnection(topic)}
      ` : ''}

      ${currentActiveStep === 4 ? `
        <span class="step-badge-tag">STEP 4 • SOLVE (PROGRESSIVE STEP REVEAL)</span>
        <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.6rem;">Worked Example</h3>
        
        <div class="worked-example-box">
          <div class="worked-problem-title">📌 Problem: ${workedExample.problem}</div>
          
          ${workedExample.given && workedExample.given.length > 0 ? `
            <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 0.6rem 0.8rem; margin: 0.6rem 0;">
              <div style="font-size: 0.75rem; font-weight: 800; color: #92400e; text-transform: uppercase; margin-bottom: 0.3rem;">📋 Given (Identify these first):</div>
              <ul style="margin: 0; padding-left: 1.2rem;">
                ${workedExample.given.map(g => `<li style="font-size: 0.85rem; color: #78350f; margin-bottom: 0.2rem;">${g}</li>`).join('')}
              </ul>
            </div>
          ` : ''}

          <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-muted); margin-bottom: 0.4rem;">Progressive Solution Steps:</div>
          
          <ol class="worked-step-list">
            ${workedStepsList.slice(0, currentRevealedStep).map(s => `<li style="margin-bottom: 0.4rem; font-weight: 600; color: var(--text-main);">${s}</li>`).join('')}
          </ol>

          ${currentRevealedStep < workedStepsList.length ? `
            <button class="btn btn-primary" style="font-size: 0.83rem; margin: 0.6rem 0;" onclick="revealNextWorkedStep()">
              Show Step ${currentRevealedStep + 1} of ${workedStepsList.length} ›
            </button>
          ` : `
            <div class="worked-answer-box">
              ✓ Final Answer: ${workedExample.answer}
            </div>
          `}
        </div>
      ` : ''}

      ${currentActiveStep === 5 ? `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem;">
          <span class="step-badge-tag">STEP 5 • DIAGNOSTIC PRACTICE (Q${currentQuizIndex + 1} OF ${quizPool.length})</span>
          <span style="font-size: 0.75rem; font-weight: 700; color: var(--accent-primary);">Adaptive Misconception Mode</span>
        </div>

        <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.6rem;">Check Your Understanding</h3>

        ${renderEstimationChallenge(topic)}

        ${quizSessionDone ? `
          <!-- QUIZ SUMMARY SCREEN -->
          <div style="background: linear-gradient(135deg, #f0f9ff, #e0f2fe); border: 2px solid #7dd3fc; border-radius: 12px; padding: 1.5rem; text-align: center;">
            <div style="font-size: 3rem; margin-bottom: 0.5rem;">${quizCorrectCount === quizPool.length ? '🏆' : quizCorrectCount >= quizPool.length / 2 ? '👍' : '📚'}</div>
            <h3 style="font-size: 1.3rem; font-weight: 800; color: #0c4a6e; margin-bottom: 0.3rem;">Quiz Complete!</h3>
            <div style="font-size: 1.8rem; font-weight: 900; color: ${quizCorrectCount === quizPool.length ? '#059669' : '#0284c7'}; margin: 0.5rem 0;">
              ${quizCorrectCount} / ${quizPool.length} Correct
            </div>
            <div style="font-size: 0.85rem; color: #075985; margin-bottom: 1rem;">
              ${quizCorrectCount === quizPool.length ? 'Perfect score! You have mastered this topic.' : quizCorrectCount >= quizPool.length / 2 ? 'Good job! Review the missed concepts and try again.' : 'Keep practicing! Review Steps 1-3 and try again.'}
            </div>

            <!-- SmartScore Display -->
            ${currentActiveTopic ? `
              <div style="background: var(--bg-card); border: 1px solid #bae6fd; border-radius: 8px; padding: 0.8rem; margin-bottom: 1rem; display: inline-block;">
                <div style="font-size: 0.7rem; font-weight: 800; color: #0284c7; text-transform: uppercase;">SmartScore</div>
                <div style="font-size: 2rem; font-weight: 900; color: ${getSmartScore(currentActiveTopic.id) >= 80 ? '#059669' : getSmartScore(currentActiveTopic.id) >= 50 ? '#d97706' : '#dc2626'};">${getSmartScore(currentActiveTopic.id)}</div>
                <div style="font-size: 0.65rem; color: var(--text-dim);">${getSmartScore(currentActiveTopic.id) >= 80 ? 'Excellent mastery!' : getSmartScore(currentActiveTopic.id) >= 50 ? 'Good progress' : 'Needs more practice'}</div>
              </div>
            ` : ''}

            <div style="display: flex; gap: 0.5rem; justify-content: center;">
              <button class="btn btn-primary" style="font-size: 0.85rem;" onclick="restartQuiz()">🔄 Retry Quiz</button>
              <button class="btn" style="font-size: 0.85rem;" onclick="navigateToNextTopic()">Next Topic ›</button>
            </div>
          </div>

          <!-- OUTCOME SELF-ASSESSMENT: can the student actually do this now? -->
          ${currentActiveTopic && currentActiveTopic.outcome ? `
            <div class="selfcheck-box">
              <div class="selfcheck-goal">🎯 Lesson goal: <em>${currentActiveTopic.outcome.replace(/^You can\s+/i, '')}</em></div>
              <div class="selfcheck-question">Can you do this now, on your own?</div>
              <div class="selfcheck-options">
                <button class="btn selfcheck-btn selfcheck-btn-yes" onclick="selfAssessOutcome('yes')">👍 Yes, I can</button>
                <button class="btn selfcheck-btn selfcheck-btn-almost" onclick="selfAssessOutcome('almost')">🤔 Almost</button>
                <button class="btn selfcheck-btn selfcheck-btn-no" onclick="selfAssessOutcome('no')">👎 Not yet</button>
              </div>
              <div id="selfCheckFeedback"></div>
            </div>
          ` : ''}
        ` : (accountSession && !serverQuestionsReady) ? `
        <div id="quizSecureNotice" role="status" style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 1.2rem; border-radius: 12px; color: #1e40af;">
          Preparing a secure quiz for this learner…
        </div>
        ` : !localQuizAvailable ? `
        <div id="quizSecureNotice" role="status" style="background: #fffbeb; border: 1px solid #fde68a; padding: 1.2rem; border-radius: 12px; color: #92400e;">
          Sign in to take this quiz securely. Answer checking is kept on the server so the correct answers are not stored in the public lesson bundle.
          <div style="margin-top: 0.7rem;"><button class="btn btn-primary" style="font-size:0.82rem;" onclick="openLoginModal()">Sign in to start ›</button></div>
        </div>
        ` : `
        <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 1.2rem; border-radius: 12px;">
          ${quizAnsweredCount > 0 ? `<div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.5rem;">Score so far: <strong style="color: var(--accent-primary);">${quizCorrectCount}/${quizAnsweredCount}</strong></div>` : ''}
          <p style="font-size: 0.95rem; font-weight: 700; color: #1e293b; margin-bottom: 0.8rem;">${quizQuestionText}</p>
          
          <div class="quiz-options" id="quizContainer">
            ${(currentQuizItem.options || []).map((opt, idx) => `
              <button class="quiz-option" onclick="checkQuizAnswerDiagnostic(this, ${idx}, ${quizArg(quizAnswerArg)}, ${quizArg(quizExplanationArg)}, ${quizPool.length}, ${quizArg(quizExplanationsArg)})">
                ${String.fromCharCode(65 + idx)}. ${escapeHtml(opt)}
              </button>
            `).join('')}
          </div>

          <div id="quizFeedback" style="margin-top: 0.9rem; font-size: 0.88rem; display: none;"></div>
        </div>
        `}
      ` : ''}
    </div>

    <!-- STEP NAVIGATION BUTTONS (PREV / NEXT STEP) -->
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <button class="btn" ${currentActiveStep === 0 ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''} onclick="switchLessonStep(${currentActiveStep - 1})">
        ‹ Previous Step
      </button>

      <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-dim);">
        ${currentActiveStep === 0 ? 'Predict' : `Step ${currentActiveStep} of 5`}
      </div>

      <button class="btn btn-primary" ${currentActiveStep === 5 ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''} onclick="switchLessonStep(${currentActiveStep + 1})">
        Next Step ›
      </button>
    </div>

    <!-- FLASHCARDS PANEL (always visible below steps) -->
    ${renderFlashcardsPanel(topic)}

    <!-- EXPERIMENT / ACTIVITY CORNER (always visible below steps) -->
    ${renderExperimentPanel(topic)}

    <!-- RELATED TOPICS PANEL -->
    ${renderRelatedTopicsPanel(topic)}

    <!-- TOPIC NAVIGATION (PREV / NEXT TOPIC) -->
    ${renderTopicNavigation(topic)}
  `;

  if (isScratchpadActive) {
    setTimeout(initScratchpadCanvas, 100);
  }
}

// ---- ESTIMATION CHALLENGE (math topics): guess before you calculate ----
// Pulls a numeric target from the topic's worked example answer so the
// student builds number sense: estimate first, then compare closeness.
function getEstimationTarget(topic) {
  if (!topic || topic.subject !== 'Mathematics') return null;
  const we = topic.workedExample || {};
  const candidates = [we.answer, ...(we.steps || [])].join(' ');
  const m = candidates.match(/[-+]?\d+(?:\.\d+)?/);
  if (!m) return null;
  const val = parseFloat(m[0]);
  if (!isFinite(val) || val <= 0) return null;
  return { value: val, raw: m[0] };
}

function renderEstimationChallenge(topic) {
  const target = getEstimationTarget(topic);
  if (!target) return '';
  const we = topic.workedExample || {};
  const record = estimationData[topic.id] || null;

  if (record) {
    const diff = Math.abs(record.guess - target.value) / target.value;
    const band = diff <= 0.05 ? 'excellent' : diff <= 0.2 ? 'good' : 'far';
    const msg = band === 'excellent' ? 'Wow — almost spot on! Your number sense is excellent.'
      : band === 'good' ? 'Nice estimate! You were close — a little more practice and you will nail it.'
      : 'Good try! The exact answer is ' + target.raw + '. Estimate in parts next time to get closer.';
    return `
      <div class="est-box">
        <div class="est-title">🔎 Estimation Challenge — your guess</div>
        <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.4rem;">${we.problem || 'Estimate the answer to the worked example.'}</div>
        <div style="display:flex; align-items:center; gap:0.8rem; flex-wrap:wrap;">
          <span class="est-guess">You guessed: <strong>${record.guess}</strong></span>
          <span class="est-band est-band-${band}">${band === 'excellent' ? '✓ Excellent' : band === 'good' ? '≈ Close' : '↔ Keep practising'}</span>
          <button class="btn" style="font-size:0.75rem; padding:0.25rem 0.7rem;" onclick="deleteEstimation('${topic.id}')">Try again</button>
        </div>
        <div style="font-size:0.78rem; color:#64748b; margin-top:0.4rem;">${msg}</div>
      </div>
    `;
  }

  return `
    <div class="est-box">
      <div class="est-title">🔎 Estimation Challenge — guess before you calculate</div>
      <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.5rem;">${we.problem || 'Estimate the answer to the worked example.'}<br><span style="color:#64748b;">No calculators — what feels about right? You will see the exact answer after you guess.</span></div>
      <div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap;">
        <input id="estInput" class="form-input" type="number" inputmode="decimal" placeholder="Your estimate..." style="width:160px; font-size:0.9rem;" onkeydown="if(event.key==='Enter')submitEstimation('${topic.id}')">
        <button class="btn btn-primary" style="font-size:0.85rem;" onclick="submitEstimation('${topic.id}')">Submit estimate</button>
      </div>
    </div>
  `;
}

function submitEstimation(topicId) {
  const input = document.getElementById('estInput');
  const topic = AVYAAN_DATA.topics.find(t => t.id === topicId);
  if (!input || !topic) return;
  const guess = parseFloat(input.value);
  if (!isFinite(guess) || guess <= 0) { input.style.borderColor = '#f87171'; input.focus(); return; }
  const target = getEstimationTarget(topic);
  const accuracy = estimateAccuracy(guess, target ? target.value : null);
  estimationData[topicId] = { guess, accuracy, timestamp: Date.now() };
  avyaanStorage.setItem('avyaan_estimations', JSON.stringify(estimationData));
  awardXP(5, 'Estimation challenge');
  logActivity(topicId, 'estimation');
  renderTopicModal();
}

function deleteEstimation(topicId) {
  delete estimationData[topicId];
  avyaanStorage.setItem('avyaan_estimations', JSON.stringify(estimationData));
  renderTopicModal();
}

// Quiz session accounting — one 'quiz' activity per session (not per question,
// which would flood the feed), plus per-session correct/wrong counts so the
// weekly report can sum exact quiz XP instead of estimating it.
function beginQuizSession(topicId) {
  const serverSession = quizSessionQuestions && quizSessionQuestions.topicId === topicId ? quizSessionQuestions : null;
  const sessionId = serverSession?.sessionId || (window.crypto?.randomUUID ? crypto.randomUUID() : 'qz-' + Date.now() + '-' + Math.random().toString(36).slice(2));
  quizSession = { id: sessionId, topicId, correct: 0, wrong: 0, ts: Date.now() };
  logActivity(topicId, 'quiz');
  persistQuizSession();
}

function bumpQuizSession(correct) {
  if (!quizSession) return;
  if (correct) quizSession.correct++; else quizSession.wrong++;
  persistQuizSession();
}

function persistQuizSession() {
  let sessions = [];
  try { sessions = JSON.parse(avyaanStorage.getItem('avyaan_quiz_sessions') || '[]'); } catch (e) { sessions = []; }
  const idx = sessions.findIndex(s => s && s.topicId === quizSession.topicId && s.ts === quizSession.ts);
  if (idx >= 0) sessions[idx] = quizSession; else sessions.push(quizSession);
  if (sessions.length > 100) sessions = sessions.slice(-100);
  avyaanStorage.setItem('avyaan_quiz_sessions', JSON.stringify(sessions));
}

// DIAGNOSTIC MISCONCEPTION COACHING CHECKER
async function checkQuizAnswerDiagnostic(btnEl, selectedIdx, correctAnsRaw, explanation, totalQuestions, explanationsRaw) {
  // One 'quiz' activity per session — starts on the first answer of a run
  if (currentActiveTopic && (!quizSession || quizSession.topicId !== currentActiveTopic.id)) beginQuizSession(currentActiveTopic.id);
  const container = document.getElementById('quizContainer');
  const feedback = document.getElementById('quizFeedback');
  const buttons = container.querySelectorAll('.quiz-option');
  // Lock the whole question immediately so a slow server cannot record
  // duplicate attempts from repeated taps/clicks.
  if (btnEl.disabled) return;
  buttons.forEach(b => { b.disabled = true; });
  // Distractor-aware feedback: use the per-option explanation when the lesson
  // provides one (selected option -> specific reason it is right or wrong).
  let explanations = [];
  try { explanations = JSON.parse(explanationsRaw || '[]'); } catch (e) { explanations = []; }
  let optionExplanation = Array.isArray(explanations) && explanations[selectedIdx] ? explanations[selectedIdx] : explanation;

  const selectedText = btnEl.textContent.replace(/^[A-Z]\.\s*/, '').trim();
  const selectedClean = selectedText.toLowerCase();
  const targetText = String(correctAnsRaw).trim().toLowerCase();

  let correctIdx = -1;

  const parsedNum = parseInt(correctAnsRaw);
  if (!isNaN(parsedNum) && parsedNum >= 0 && parsedNum < buttons.length) {
    const optTextAtNum = buttons[parsedNum] ? buttons[parsedNum].textContent.replace(/^[A-Z]\.\s*/, '').trim().toLowerCase() : '';
    if (optTextAtNum === targetText || (parsedNum < buttons.length && isNaN(parseInt(targetText)))) {
      correctIdx = parsedNum;
    }
  }

  if (correctIdx === -1) {
    buttons.forEach((b, idx) => {
      const bText = b.textContent.replace(/^[A-Z]\.\s*/, '').trim().toLowerCase();
      if (bText === targetText) {
        correctIdx = idx;
      }
    });
  }

  if (correctIdx === -1 && !isNaN(parsedNum) && parsedNum >= 0 && parsedNum < buttons.length) {
    correctIdx = parsedNum;
  }

  let isCorrect = (selectedIdx === correctIdx) || (selectedClean === targetText);

  // For a real account, the browser is only a view: correctness and the
  // answer position come from the server registry before XP/mastery changes.
  const accountSession = typeof AvyaanAPI !== 'undefined' && AvyaanAPI.getToken() && currentUser && !currentUser.isGuest && currentActiveTopic;
  if (accountSession) {
    const authoritative = await AvyaanAPI.logQuizAttempt(currentActiveTopic.id, currentQuizIndex, selectedIdx, selectedText, quizSession?.id);
    if (!authoritative || typeof authoritative.correct !== 'boolean') {
      buttons.forEach(b => { b.disabled = false; });
      feedback.style.display = 'block';
      feedback.innerHTML = '<div class="selfcheck-feedback selfcheck-almost">The answer service is temporarily unavailable. Please retry; no mastery or XP was recorded.</div>';
      return;
    }
    isCorrect = authoritative.correct;
    if (Number.isInteger(authoritative.correct_option_index)) correctIdx = authoritative.correct_option_index;
    optionExplanation = authoritative.explanation || optionExplanation;
  }

  buttons.forEach((b, idx) => {
    b.disabled = true;
    const bText = b.textContent.replace(/^[A-Z]\.\s*/, '').trim().toLowerCase();
    
    if (idx === correctIdx || bText === targetText) {
      b.classList.add('correct');
    } else if (idx === selectedIdx && !isCorrect) {
      b.classList.add('wrong');
    }
  });

  feedback.style.display = 'block';

  if (isCorrect) {
    quizCorrectCount++;
    quizAnsweredCount++;

    const isLastQuestion = currentQuizIndex >= totalQuestions - 1;
    const isPassing = isLastQuestion && (quizCorrectCount / totalQuestions >= 0.8);
    let masteryConfirmed = !isPassing || completedTopicIds.has(currentActiveTopic?.id);

    // A paid/authenticated learner's mastery mirror may change only after the
    // server accepts the complete quiz. Guests remain local-only.
    if (isPassing && currentActiveTopic && !completedTopicIds.has(currentActiveTopic.id)) {
      if (accountSession) {
        const result = await AvyaanAPI.markMastered(currentActiveTopic.id, quizSession?.id);
        masteryConfirmed = !!(result && result.status === 'success');
        if (!masteryConfirmed && typeof toast === 'function') {
          toast(result?.detail || 'Diagnostic passed, but the server could not record mastery. Please retry.');
        }
      } else {
        masteryConfirmed = true;
      }
      if (masteryConfirmed) {
        completedTopicIds.add(currentActiveTopic.id);
        avyaanStorage.setItem('avyaan_completed_topics', JSON.stringify(Array.from(completedTopicIds)));
        advancePathPosition(currentActiveTopic.subject, currentActiveTopic.class_level, currentActiveTopic.id);
        logActivity(currentActiveTopic.id, 'mastered');
        updateMasteryScorecard();
        updateStreak();
        awardXP(50, 'Topic mastered');
        scheduleReview(currentActiveTopic.id);
        checkBadges();
        renderGrid();
      }
    }

    feedback.innerHTML = `
      <div style="background: #ecfdf5; border: 1px solid #6ee7b7; padding: 0.9rem; border-radius: 8px; color: #065f46;">
        <div style="font-size: 1rem; font-weight: 800; margin-bottom: 0.3rem;">🎉 Excellent! Correct Answer!</div>
        <p>${escapeHtml(optionExplanation)}</p>
        ${!isLastQuestion ? `
          <button class="btn btn-primary" style="margin-top: 0.6rem; font-size: 0.85rem;" onclick="nextQuizQuestion()">
            Next Diagnostic Question (${currentQuizIndex + 2} of ${totalQuestions}) ›
          </button>
        ` : `
          <div style="margin-top: 0.6rem; font-weight: 700;">
            ${isPassing ? '🏆 Topic Mastered! Diagnostic passed (' + quizCorrectCount + '/' + totalQuestions + ' correct).' : 'Diagnostic complete (' + quizCorrectCount + '/' + totalQuestions + ' correct).'}
          </div>
          <button class="btn btn-primary" style="margin-top: 0.6rem; font-size: 0.85rem;" onclick="showQuizSummary()">
            📊 View Quiz Summary ›
          </button>
        `}
      </div>
   `;
   
    if (isPassing && !masteryConfirmed) {
      feedback.innerHTML = feedback.innerHTML.replace('Topic Mastered! Diagnostic passed', 'Diagnostic passed - mastery is waiting for server confirmation');
    }

   // Trigger Canvas Confetti Celebration!
    maybeCelebrate({ particleCount: 60, spread: 70, origin: { y: 0.7 } });

    // SmartScore update + XP award
    if (currentActiveTopic) {
      bumpQuizSession(true);
      const newScore = updateSmartScore(currentActiveTopic.id, true, totalQuestions);
      awardXP(20, 'Correct answer');
    }

    // Retrieval-gated mastery: a correct answer on a DUE spaced review proves
    // the memory survived the interval — that earns the Solidified tier.
    if (currentActiveTopic && !isSolidified(currentActiveTopic.id) &&
        completedTopicIds.has(currentActiveTopic.id) &&
        getReviewEntry(currentActiveTopic.id) && getReviewEntry(currentActiveTopic.id).dueDate <= Date.now()) {
      markSolidified(currentActiveTopic.id);
      renderGrid();
    }

    // Check if this was the daily challenge topic
    const dc = getDailyChallenge();
    if (currentActiveTopic && dc.topicId === currentActiveTopic.id && !dc.completed && quizSessionDone) {
      completeDailyChallenge();
    }
  } else {
    quizAnsweredCount++;
    // SmartScore update (wrong answer)
    if (currentActiveTopic) {
      bumpQuizSession(false);
      updateSmartScore(currentActiveTopic.id, false, totalQuestions);
      awardXP(5, 'Attempted (wrong answer)');
      // SM-2 failure: a wrong answer on a topic that is in the review cycle
      // resets its interval so it comes back within a day.
      if (getReviewEntry(currentActiveTopic.id)) {
        scheduleReview(currentActiveTopic.id, false);
      }
    }
    // DIAGNOSTIC MISCONCEPTION COACHING — uses per-topic flashcard data when available
    const correctLabel = buttons[correctIdx] ? buttons[correctIdx].textContent.trim() : targetText;

    // Try to find a relevant myth/fact from the topic's flashcards
    let misconceptionCoach = '';
    let mythFactCard = '';

    if (currentActiveTopic && currentActiveTopic.flashcards && currentActiveTopic.flashcards.length > 0) {
      // Use the first flashcard's myth/fact as coaching
      const fc = currentActiveTopic.flashcards[0];
      misconceptionCoach = `You selected <strong>"${escapeHtml(selectedText)}"</strong>. <strong>${escapeHtml(fc.myth)}</strong> — but the truth is: ${escapeHtml(fc.fact)}`;
      logMisconception(currentActiveTopic.id, fc.myth);
      mythFactCard = `
        <div style="margin-top: 0.6rem; padding: 0.6rem; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px;">
          <div style="font-size: 0.75rem; font-weight: 800; color: #92400e; margin-bottom: 0.2rem;">🃏 Relevant Flashcard</div>
          <div style="font-size: 0.8rem; color: #991b1b; margin-bottom: 0.2rem;"><strong>Myth:</strong> ${escapeHtml(fc.myth)}</div>
          <div style="font-size: 0.8rem; color: #065f46;"><strong>Fact:</strong> ${escapeHtml(fc.fact)}</div>
        </div>
      `;
    }

    if (!misconceptionCoach) {
      // Fallback to subject-based coaching
      misconceptionCoach = `You selected <strong>"${escapeHtml(selectedText)}"</strong>. This is a common misconception where visual models or calculations are misinterpreted.`;
      if (currentActiveTopic && currentActiveTopic.subject === "Mathematics") {
        misconceptionCoach = `You selected <strong>"${escapeHtml(selectedText)}"</strong>. Notice that applying the standard equation yields <strong>${escapeHtml(correctLabel)}</strong> instead of performing an unguided operation.`;
      } else if (currentActiveTopic && currentActiveTopic.subject === "Physics") {
        misconceptionCoach = `You selected <strong>"${escapeHtml(selectedText)}"</strong>. Recall that energy, force, and electric current follow strict conservation and vector laws.`;
      } else if (currentActiveTopic && currentActiveTopic.subject === "Chemistry") {
        misconceptionCoach = `You selected <strong>"${escapeHtml(selectedText)}"</strong>. Remember that chemical reactions follow conservation of mass and specific bonding rules.`;
      } else if (currentActiveTopic && currentActiveTopic.subject === "Biology") {
        misconceptionCoach = `You selected <strong>"${escapeHtml(selectedText)}"</strong>. Living systems follow specific biological processes — not random chance or magic.`;
      } else if (currentActiveTopic && currentActiveTopic.subject === "Computer Science & AI") {
        misconceptionCoach = `You selected <strong>"${escapeHtml(selectedText)}"</strong>. Computers follow precise logical rules — every output is determined by the algorithm and input.`;
      } else if (currentActiveTopic && currentActiveTopic.subject === "Earth & Space") {
        misconceptionCoach = `You selected <strong>"${escapeHtml(selectedText)}"</strong>. Earth and space phenomena follow measurable physical laws, not superstition.`;
      }
    }

    const isLastQuestion = currentQuizIndex >= totalQuestions - 1;

    feedback.innerHTML = `
      <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 0.9rem; border-radius: 8px; color: #991b1b;">
        <div style="font-weight: 800; font-size: 0.95rem; margin-bottom: 0.3rem;">❌ Misconception Diagnosis</div>
        <p style="margin-bottom: 0.4rem;">${misconceptionCoach}</p>
        ${optionExplanation && optionExplanation !== explanation ? `<div style="font-size: 0.83rem; color: #7f1d1d; margin-bottom: 0.6rem;">📌 ${escapeHtml(optionExplanation)}</div>` : ''}
        <div style="font-size: 0.83rem; color: #7f1d1d; margin-bottom: 0.6rem;">Correct Answer: <strong>${escapeHtml(correctLabel)}</strong></div>
        ${mythFactCard}
        
        <div style="display: flex; gap: 0.4rem; flex-wrap: wrap; margin-top: 0.6rem;">
          <button class="btn" style="background: var(--accent-primary-light); border-color: #bfdbfe; color: #1e40af; font-size: 0.8rem; font-weight: 700;" onclick="switchLessonStep(3)">
            💡 Review Step 3 (Why It Works) →
          </button>
          ${!isLastQuestion ? `
            <button class="btn btn-primary" style="font-size: 0.8rem;" onclick="nextQuizQuestion()">
              Next Question (${currentQuizIndex + 2} of ${totalQuestions}) ›
            </button>
          ` : `
            <button class="btn btn-primary" style="font-size: 0.8rem;" onclick="showQuizSummary()">
              📊 View Quiz Summary ›
            </button>
          `}
        </div>
      </div>
    `;
  }
}

// Confetti helper that respects prefers-reduced-motion
function maybeCelebrate(opts) {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (typeof confetti === 'function') confetti(opts);
}

// Show quiz summary screen
function showQuizSummary() {
  quizSessionDone = true;
  saveTopicProgress();
  renderTopicModal();
}

// Trigger Paywall Upgrade Modal
function triggerPaywall(topicId) {
  const topic = AVYAAN_DATA.topics.find(t => t.id === topicId);
  if (topic && typeof AvyaanPayments !== 'undefined') {
    AvyaanPayments.renderPaywall(topic);
  } else {
    openModal('paywallModal');
  }
}

// ==========================================================================
// CROSS-SUBJECT BRIDGES — "Connected ideas" panel in the lesson player
// ==========================================================================
function getTopicBridges(topicId) {
  if (!topicId || !AVYAAN_DATA.bridges) return [];
  return AVYAAN_DATA.bridges.filter(b => b.a === topicId || b.b === topicId);
}

function renderBridgesHtml(topicId) {
  const bridges = getTopicBridges(topicId);
  if (!bridges.length) return '';
  const rows = bridges.map(b => {
    const partnerId = b.a === topicId ? b.b : b.a;
    const partner = AVYAAN_DATA.topics.find(t => t.id === partnerId);
    if (!partner) return '';
    return `
      <div style="display: flex; gap: 0.5rem; align-items: flex-start; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 10px; padding: 0.55rem 0.7rem; cursor: pointer;" onclick="openTopicDetail('${partner.id}')">
        <span style="font-size: 1.1rem;">${partner.emoji || '🔗'}</span>
        <div style="flex: 1; min-width: 0;">
          <div style="font-size: 0.78rem; font-weight: 800; color: #4338ca;">${partner.subject} · Class ${partner.class_level}</div>
          <div style="font-size: 0.9rem; font-weight: 700; color: var(--text-main);">${partner.title}</div>
          <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.15rem;">💡 ${b.reason}</div>
        </div>
        <span style="color: var(--accent-primary); font-weight: 800;">›</span>
      </div>
    `;
  }).join('');
  return `
    <div style="margin-top: 0.6rem; background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 12px; padding: 0.7rem 0.9rem;">
      <div style="font-size: 0.78rem; font-weight: 800; color: #4338ca; margin-bottom: 0.5rem;">🔗 Connected ideas — see this lesson from another subject</div>
      <div style="display: flex; flex-direction: column; gap: 0.4rem;">${rows}</div>
    </div>
  `;
}

// ==========================================================================
// CHAPTER MIXED-REVIEW QUIZ — interleaves MCQs from every lesson in a chapter
// ==========================================================================
let reviewQuestions = [];
let reviewIndex = 0;
let reviewScore = 0;
let reviewTimed = false;
let reviewTimer = null;
let reviewTimeLeft = 0;
let reviewTimeLimitSeconds = 5 * 60;
let reviewSession = null; // { id, mode, expiresAt } for server-bound aggregate reviews
let reviewContext = null; // overrides currentActiveTopic for header (Board Prep from chapter list)
let reviewModeTitle = 'Chapter Mixed Review';

function getChapterReview(topic) {
  if (!topic || !AVYAAN_DATA.reviews) return null;
  return AVYAAN_DATA.reviews.find(r =>
    r.class_level === topic.class_level &&
    r.subject === topic.subject &&
    r.chapter === (topic.chapter || '')
  ) || null;
}

function hasAuthenticatedAccount() {
  return typeof AvyaanAPI !== 'undefined' && AvyaanAPI.getToken() && currentUser && !currentUser.isGuest;
}

function renderReviewServiceMessage(title, message, showLessonButton = false) {
  const container = document.getElementById('reviewContent');
  if (!container) return;
  const lessonButton = showLessonButton && currentActiveTopic
    ? '<button class="btn btn-primary" style="margin-top:0.8rem;" onclick="closeModal(\'reviewModal\'); switchLessonStep(5)">Open secure lesson quiz →</button>'
    : '';
  container.innerHTML = `
    <div role="status" style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:12px; padding:1.4rem; text-align:center; color:#1e3a8a;">
      <div style="font-size:2rem;">🔐</div>
      <h2 style="font-size:1.1rem; margin:0.5rem 0;">${escapeHtml(title)}</h2>
      <p style="font-size:0.85rem; margin:0;">${escapeHtml(message)}</p>
      ${lessonButton}
    </div>`;
}

async function startAggregateReview(selector, fallbackQuestions, title, context, timed, timeLimitSeconds) {
  reviewSession = null;
  reviewQuestions = [];
  reviewIndex = 0;
  reviewScore = 0;
  reviewTimed = !!timed;
  reviewTimeLimitSeconds = timeLimitSeconds || 5 * 60;
  reviewContext = context || null;
  reviewModeTitle = title;
  stopReviewTimer();
  openModal('reviewModal');
  renderReviewServiceMessage('Preparing secure review…', 'Loading questions from the trusted learning service.');

  if (hasAuthenticatedAccount() && typeof AvyaanAPI.createReviewSession === 'function') {
    const session = await AvyaanAPI.createReviewSession(selector);
    if (!session || session.status !== 'success' || !Array.isArray(session.questions) || session.questions.length < 4) {
      renderReviewServiceMessage('Secure review unavailable', session?.detail || 'Please try again later or use the individual lesson quiz.', true);
      return false;
    }
    reviewSession = {
      id: session.session_id,
      mode: session.mode,
      expiresAt: session.expires_at,
    };
    reviewQuestions = session.questions;
    reviewTimed = !!session.timed;
  } else {
    reviewQuestions = Array.isArray(fallbackQuestions) ? fallbackQuestions : [];
    if (!reviewQuestions.length) {
      renderReviewServiceMessage('Sign in for secure review', 'Aggregate review answer checking is kept on the server. Sign in to start this review.', true);
      return false;
    }
  }

  renderReviewQuestion();
  if (reviewTimed) startReviewTimer(timeLimitSeconds || 5 * 60);
  return true;
}

function openChapterReview() {
  loadLazy('reviews', async () => {
    const topic = currentActiveTopic;
    const review = getChapterReview(topic);
    if (!review || !review.questions || review.questions.length < 2) {
      alert('No mixed review is available for this chapter yet.');
      return;
    }
    await startAggregateReview(
      { mode: 'chapter', review_key: review.key, class_level: review.class_level, subject: review.subject, chapter: review.chapter },
      review.questions,
      'Chapter Mixed Review',
      null,
      false,
      0,
    );
  });
}

// ==========================================================================
// MIXED SUBJECT REVIEW — interleaved retrieval across subjects (no lazy
// dependency: topic MCQs live in the boot bundle).
// ==========================================================================
function openMixedReview() {
  if (typeof toast === 'function') toast('Mixed Review is coming soon while we finish the secure review flow.');
  return;
  const grade = (currentUser && currentUser.grade) || 1;
  const unlocked = AVYAAN_DATA.topics.filter(t => t.class_level <= grade && isTopicUnlocked(t));
  const pool = unlocked;

  // Keep the mix diverse: up to two topics per subject.
  const bySubject = {};
  pool.forEach(t => { (bySubject[t.subject] = bySubject[t.subject] || []).push(t); });
  const chosen = [];
  Object.keys(bySubject).forEach(s => {
    const tops = bySubject[s].slice().sort(() => Math.random() - 0.5).slice(0, 2);
    chosen.push(...tops);
  });

  const questions = [];
  for (const t of chosen) {
    for (const m of (t.mcqs || [])) {
      if (questions.length >= 10) break;
      questions.push({
        question: m.question,
        options: m.options,
        answer: m.answer,
        explanation: m.explanation,
        explanations: m.explanations || m.explanation,
        topicId: t.id,
        topicTitle: t.title
      });
    }
    if (questions.length >= 10) break;
  }
  if (questions.length < 4) {
    alert('Not enough topics available yet — master a few lessons first.');
    return;
  }
  // Fisher-Yates shuffle for interleaving
  for (let i = questions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [questions[i], questions[j]] = [questions[j], questions[i]];
  }

  startAggregateReview(
    { mode: 'mixed', class_level: grade },
    questions,
    'Mixed Subject Review',
    null,
    false,
    0,
  );
}

function renderReviewQuestion() {
  const container = document.getElementById('reviewContent');
  if (!container) return;
  const ctx = reviewContext || currentActiveTopic;
  const review = ctx ? getChapterReview(ctx) : null;
  const q = reviewQuestions[reviewIndex];
  if (!q) return;
  // Public lazy bundles intentionally omit answer keys.  A server session is
  // allowed to render because answer checking is delegated to the API.  A
  // local answerless fallback must remain blocked; otherwise every option
  // would silently be marked wrong.
  if (!reviewSession && !Number.isInteger(q.answer)) {
    const lessonButton = currentActiveTopic
      ? '<button class="btn" style="margin-top:0.8rem;" onclick="closeModal(\'reviewModal\'); switchLessonStep(5)">Open lesson quiz →</button>'
      : '';
    container.innerHTML = `
      <div role="status" style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:12px; padding:1.4rem; text-align:center; color:#1e3a8a;">
        <div style="font-size:2rem;">🔐</div>
        <h2 style="font-size:1.1rem; margin:0.5rem 0;">Sign in for secure review</h2>
        <p style="font-size:0.85rem; margin:0;">Aggregate review answer checking is kept on the server. Sign in to start this review; this public bundle contains the questions but not the answer key.</p>
        <button class="btn btn-primary" style="margin-top:0.8rem;" onclick="closeModal('reviewModal'); openLoginModal()">Sign in to continue →</button>
        ${lessonButton}
      </div>`;
    return;
  }
  const total = reviewQuestions.length;
  const topicMeta = AVYAAN_DATA.topics.find(t => t.id === (q.topicId || q.topic_id));
  const sourceTopicTitle = topicMeta?.title || q.topicTitle || q.topic_title || '';
  const bestKey = 'avyaan_review_best_' + (review ? review.key.replace(/[^A-Za-z0-9]/g, '_') : '');
  const best = parseInt(avyaanStorage.getItem(bestKey) || '0', 10);
  const contextLabel = ctx
    ? `Class ${escapeHtml(ctx.class_level)} · ${escapeHtml(ctx.subject)} · ${escapeHtml((ctx.chapter || '').replace(/^Chapter\s*\d+\s*—\s*/, ''))}`
    : '';

  container.innerHTML = `
    <div style="margin-bottom: 0.8rem;">
      <div style="display: flex; align-items: center; gap: 0.6rem;">
        <span style="font-size: 1.6rem;">🧩</span>
        <div>
          <h2 style="font-size: 1.2rem; font-weight: 800; color: var(--text-main); margin: 0;">${escapeHtml(reviewModeTitle)}</h2>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin: 0.1rem 0 0;">
            ${contextLabel}
          </p>
        </div>
        <div style="margin-left: auto; text-align: right;">
          ${reviewTimed ? `<div id="reviewTimer" style="font-size: 1rem; font-weight: 800; color: var(--text-main); font-variant-numeric: tabular-nums;">⏱ ${fmtTime(reviewTimeLeft)}</div>` : ''}
          <div style="font-size: 0.8rem; font-weight: 800; color: var(--accent-primary);">${reviewScore} / ${reviewIndex} correct</div>
          ${best > 0 ? `<div style="font-size: 0.68rem; color: var(--text-muted);">🏆 Best: ${best} / ${total}</div>` : ''}
        </div>
      </div>
      <div style="display: flex; gap: 4px; margin-top: 0.5rem;">
        ${reviewQuestions.map((_, i) => `<div style="flex: 1; height: 5px; border-radius: 3px; background: ${i < reviewIndex ? 'var(--accent-primary)' : i === reviewIndex ? '#93c5fd' : '#e2e8f0'};"></div>`).join('')}
      </div>
    </div>

    <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.2rem;">
      <div style="font-size: 0.7rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 0.4rem;">
        Question ${reviewIndex + 1} of ${total} ${sourceTopicTitle ? '· from “' + escapeHtml(sourceTopicTitle) + '”' : ''}
      </div>
          <div style="font-size: 1.02rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.9rem;">${escapeHtml(q.question || '')}</div>
          <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            ${(q.options || []).map((opt, oi) => `
          <button class="btn question-option" style="justify-content: flex-start; text-align: left; white-space: normal; font-size: 0.9rem; padding: 0.6rem 0.9rem;" onclick="checkReviewAnswer(this, ${oi}, ${reviewSession ? 'null' : Number(q.answer)})">
            <span style="display:inline-block; width: 22px; height: 22px; border-radius: 50%; border: 2px solid var(--accent-primary); color: var(--accent-primary); font-weight: 800; font-size: 0.75rem; text-align: center; line-height: 18px; margin-right: 0.5rem;">${String.fromCharCode(65 + oi)}</span>
            ${escapeHtml(opt)}
          </button>
        `).join('')}
      </div>
      <div id="reviewFeedback" style="margin-top: 0.9rem; font-size: 0.88rem; display: none;"></div>
    </div>
  `;
}

async function checkReviewAnswer(btnEl, selectedIdx, correctIdx) {
  if (btnEl && btnEl.dataset.answered) return;
  const q = reviewQuestions[reviewIndex];
  if (!q) return;
  if (reviewSession && reviewSession.id) {
    if (btnEl) btnEl.disabled = true;
    const result = await AvyaanAPI.logReviewAttempt(reviewSession.id, reviewIndex, selectedIdx);
    if (!result || typeof result.correct !== 'boolean') {
      if (btnEl) btnEl.disabled = false;
      const feedback = document.getElementById('reviewFeedback');
      if (feedback) {
        feedback.style.display = 'block';
        feedback.textContent = result?.detail || 'Secure review service is unavailable. Please try again.';
      }
      return;
    }
    if (result.correct) reviewScore++;
    if (btnEl) btnEl.dataset.answered = '1';
    revealReviewResult(result.correct_option_index, selectedIdx, false, result);
    return;
  }
  if (!Number.isInteger(correctIdx)) return;
  const isCorrect = selectedIdx === correctIdx;
  if (isCorrect) reviewScore++;
  if (btnEl) btnEl.dataset.answered = '1';
  revealReviewResult(correctIdx, selectedIdx, false);
}

function revealReviewResult(correctIdx, selectedIdx, timedOut, serverResult = null) {
  const q = reviewQuestions[reviewIndex];
  const container = document.getElementById('reviewContent');
  if (!q || !container) return;
  const buttons = container.querySelectorAll('.question-option');
  buttons.forEach((b, i) => {
    b.disabled = true;
    b.dataset.answered = '1';
    if (Number.isInteger(correctIdx) && i === correctIdx) {
      b.style.borderColor = '#059669';
      b.style.background = '#ecfdf5';
      b.style.color = '#059669';
    } else if (!timedOut && i === selectedIdx) {
      b.style.borderColor = '#dc2626';
      b.style.background = '#fef2f2';
      b.style.color = '#991b1b';
    }
  });
  const feedback = document.getElementById('reviewFeedback');
  if (!feedback) return;
  feedback.style.display = 'block';
  // Distractor-aware: prefer the explanation for the OPTION the learner chose.
  const perOption = Array.isArray(q.explanations) && selectedIdx >= 0 && q.explanations[selectedIdx]
    ? q.explanations[selectedIdx] : (serverResult?.explanation || q.explanation);
  const serverCorrect = serverResult && typeof serverResult.correct === 'boolean' ? serverResult.correct : null;
  const answerLabel = Number.isInteger(correctIdx) ? String.fromCharCode(65 + correctIdx) : '';
  feedback.innerHTML = (timedOut
    ? `<span style="font-weight: 800; color: #b45309;">⏰ Time's up! Submit the next question to continue; the answer remains protected.</span>`
    : ((serverCorrect === true || (!serverResult && selectedIdx === correctIdx))
      ? `<span style="font-weight: 800; color: #059669;">✓ Correct!</span>`
      : `<span style="font-weight: 800; color: #991b1b;">✗ Not quite${answerLabel ? ` — the right answer is ${answerLabel}.` : '.'}</span>`))
    + (perOption ? `<div style="margin-top: 0.3rem; color: var(--text-muted);">${escapeHtml(perOption)}</div>` : '')
    + `<button class="btn" style="margin-top: 0.8rem; background: var(--accent-primary); border-color: var(--accent-primary); color: #fff; font-weight: 700;" onclick="nextReviewQuestion()">${reviewIndex >= reviewQuestions.length - 1 ? '🏁 Finish Review' : 'Next Question ›'}</button>`;
}

function nextReviewQuestion() {
  const ctx = reviewContext || currentActiveTopic;
  const review = ctx ? getChapterReview(ctx) : null;
  const total = reviewQuestions.length;
  if (reviewIndex >= total - 1) {
    stopReviewTimer();
    const bestKey = 'avyaan_review_best_' + (review ? review.key.replace(/[^A-Za-z0-9]/g, '_') : '');
    const best = parseInt(avyaanStorage.getItem(bestKey) || '0', 10);
    if (reviewScore > best) avyaanStorage.setItem(bestKey, String(reviewScore));
    const pct = Math.round((reviewScore / total) * 100);
    const container = document.getElementById('reviewContent');
    const reviewRetryArg = review ? escapeHtml(JSON.stringify(review.key)) : "''";
    const timeUsed = reviewTimed ? ` · finished in ${fmtTime(reviewTimeLimitSeconds - Math.max(0, reviewTimeLeft))}` : '';
    container.innerHTML = `
      <div style="text-align: center; padding: 1.5rem;">
        <div style="font-size: 3rem;">${pct >= 80 ? '🏆' : pct >= 50 ? '🎉' : '💪'}</div>
        <h2 style="font-size: 1.3rem; font-weight: 800; color: var(--text-main); margin: 0.5rem 0 0.2rem;">${reviewTimed ? 'Board Prep complete!' : 'Review complete!'}</h2>
        <p style="font-size: 0.95rem; color: var(--text-muted);">You scored <strong>${reviewScore} / ${total}</strong> (${pct}%)${timeUsed} on the ${reviewTimed ? 'timed chapter quiz' : 'mixed chapter review'}.
        ${reviewScore > best ? ' <span style="color: #059669; font-weight: 700;">New best score! 🏅</span>' : best > 0 ? ` Best: ${best}.` : ''}</p>
        <div style="display: flex; gap: 0.6rem; justify-content: center; margin-top: 1rem;">
          <button class="btn" style="background: var(--accent-primary); border-color: var(--accent-primary); color: #fff; font-weight: 700;" onclick="closeModal('reviewModal')">Done</button>
              <button class="btn" onclick="${reviewTimed && reviewContext ? `startBoardPrep(${reviewRetryArg})` : 'openChapterReview()'}">🔁 Retry</button>
        </div>
      </div>
    `;
    return;
  }
  reviewIndex++;
  renderReviewQuestion();
  if (reviewTimed) startReviewTimer(reviewTimeLimitSeconds);
}

// ---- timed helpers (Board Prep) ----
function fmtTime(s) {
  const m = Math.floor(Math.max(0, s) / 60);
  const sec = Math.max(0, s) % 60;
  return m + ':' + String(sec).padStart(2, '0');
}

function startReviewTimer(secs) {
  stopReviewTimer();
  reviewTimeLeft = secs;
  reviewTimer = setInterval(() => {
    reviewTimeLeft--;
    const el = document.getElementById('reviewTimer');
    if (el) {
      el.textContent = '⏱ ' + fmtTime(Math.max(0, reviewTimeLeft));
      if (reviewTimeLeft <= 10) el.style.color = '#dc2626';
    }
    if (reviewTimeLeft <= 0) {
      stopReviewTimer();
      timeUpReview();
    }
  }, 1000);
}

function stopReviewTimer() {
  if (reviewTimer) { clearInterval(reviewTimer); reviewTimer = null; }
}

function timeUpReview() {
  const q = reviewQuestions[reviewIndex];
  if (!q) return;
  revealReviewResult(reviewSession ? null : q.answer, -1, true);
}

// ==========================================================================
// BOARD PREP — timed Class 9-10 chapter quiz sessions (exam-style practice)
// ==========================================================================
const SUBJECT_EMOJI = {
  'Mathematics': '📐', 'Physics': '⚛️', 'Chemistry': '🧪',
  'Biology': '🧬', 'Computer Science & AI': '🤖', 'Earth & Space': '🌍',
  'Science': '🔬'
};

let boardPrepBoardFilter = 'All';

// --------------------------------------------------------------------------
// Progress backup & restore — every localStorage learning key in one JSON file
// --------------------------------------------------------------------------
function collectProgressState() {
  const payload = {};
  const allowed = new Set(['avyaan_xp','avyaan_badges','avyaan_smart_scores','avyaan_review_queue','avyaan_daily_challenge','avyaan_estimations','avyaan_streak_data','avyaan_completed_topics','avyaan_solidified_topics']);
  for (let i = 0; i < avyaanStorage.length; i++) {
    const k = avyaanStorage.key(i);
    if (allowed.has(k) || (k && k.startsWith('avyaan_progress_'))) payload[k] = avyaanStorage.getItem(k);
  }
  return payload;
}


function exportProgress() {
  const payload = collectProgressState();
  const doc = JSON.stringify({
    app: 'avyaan',
    version: window.AVYAAN_CONTENT_VERSION || '',
    exported: new Date().toISOString(),
    scope: {
      account_id: currentUser?.account_id || currentUser?.id || null,
      child_id: currentUser?.child_id || currentUser?.id || null
    },
    data: payload
  }, null, 2);
  const blob = new Blob([doc], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'avyaan-progress.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importProgress() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.onchange = () => {
    const f = input.files && input.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const p = JSON.parse(reader.result);
        if (!p || p.app !== 'avyaan' || !p.data || typeof p.data !== 'object') {
          throw new Error('That file is not an Avyaan progress backup.');
        }
        const expectedChild = currentUser?.child_id || currentUser?.id || null;
        if (p.scope?.child_id && expectedChild && String(p.scope.child_id) !== String(expectedChild)) {
          throw new Error('This backup belongs to a different learner profile.');
        }
        const entries = Object.entries(p.data);
        if (!entries.length) throw new Error('The backup contains no progress data.');
        entries.forEach(([k, v]) => avyaanStorage.setItem(k, v));
        alert(`Progress restored (${entries.length} saved fields). Reloading…`);
        location.reload();
      } catch (e) {
        alert('Could not restore: ' + e.message);
      }
    };
    reader.readAsText(f);
  };
  input.click();
}

// --------------------------------------------------------------------------
// Family profiles — multiple children on one device, each with their own
// complete progress snapshot (name, grade, and every avyaan_* key). A parent
// saves each child's state as a named slot and switches between slots with
// one click. Snapshot-based, so it composes with backup/restore and cloud sync.
// --------------------------------------------------------------------------
function getFamilyProfiles() {
  try { return JSON.parse(avyaanStorage.getItem('avyaan_family_profiles') || '{}'); } catch (e) { return {}; }
}

function saveFamilyProfileSlot(name, grade) {
  const profiles = getFamilyProfiles();
  const id = 'child_' + Date.now().toString(36);
  profiles[id] = {
    id: id,
    name: name || ('Child ' + grade),
    grade: parseInt(grade, 10) || 1,
    savedAt: Date.now(),
    snapshot: collectProgressState()
  };
  avyaanStorage.setItem('avyaan_family_profiles', JSON.stringify(profiles));
  return id;
}

function updateFamilyProfileSlot(id) {
  const profiles = getFamilyProfiles();
  const p = profiles[id];
  if (!p) return;
  p.snapshot = collectProgressState();
  p.savedAt = Date.now();
  avyaanStorage.setItem('avyaan_family_profiles', JSON.stringify(profiles));
}

function loadFamilyProfileSlot(id) {
  const p = getFamilyProfiles()[id];
  if (!p || !p.snapshot || typeof p.snapshot !== 'object') return false;
  Object.entries(p.snapshot).forEach(([k, v]) => avyaanStorage.setItem(k, v));
  return true;
}

function deleteFamilyProfileSlot(id) {
  const profiles = getFamilyProfiles();
  delete profiles[id];
  avyaanStorage.setItem('avyaan_family_profiles', JSON.stringify(profiles));
}

// Class-wide snapshot: aggregate every saved child profile into one summary
// so a parent/teacher sees the whole family at a glance.
function summarizeProfileSnapshot(snap) {
  const completed = new Set(JSON.parse(snap['avyaan_completed_topics'] || '[]'));
  const xp = parseInt(snap['avyaan_xp'] || '0', 10);
  const streak = (JSON.parse(snap['avyaan_streak_data'] || '{}').count) || 0;
  const solid = new Set(JSON.parse(snap['avyaan_solidified_topics'] || '[]'));
  return { mastered: completed.size, xp: xp, streak: streak, solidified: solid.size };
}

function renderClassWideSummary() {
  const container = document.getElementById('classWideContent');
  if (!container) return;
  const profiles = Object.values(getFamilyProfiles()).sort((a, b) => a.grade - b.grade || b.savedAt - a.savedAt);
  if (!profiles.length) {
    container.innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem;">Save at least one child profile to see the class-wide view.</p>';
    return;
  }
  const rows = profiles.map(p => {
    const s = summarizeProfileSnapshot(p.snapshot);
    const total = AVYAAN_DATA.topics.filter(t => t.class_level === p.grade).length;
    const pct = total ? Math.round((s.mastered / total) * 100) : 0;
    return `<tr>
      <td style="font-weight:700;">${escapeHtml(p.name)} <span class="class-tag">C${p.grade}</span></td>
      <td>${s.mastered}/${total} · ${pct}%</td>
      <td>${s.xp} XP</td>
      <td>${s.streak}🔥</td>
      <td>${s.solidified} 🧠</td>
    </tr>`;
  }).join('');
  const totalMastered = profiles.reduce((acc, p) => acc + summarizeProfileSnapshot(p.snapshot).mastered, 0);
  const totalXp = profiles.reduce((acc, p) => acc + summarizeProfileSnapshot(p.snapshot).xp, 0);
  const totalSolid = profiles.reduce((acc, p) => acc + summarizeProfileSnapshot(p.snapshot).solidified, 0);
  container.innerHTML = `
    <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:0.5rem; margin-bottom:1rem;">
      <div style="background:#eff6ff; border-radius:10px; padding:0.7rem; text-align:center;">
        <div style="font-size:1.3rem; font-weight:900; color:#2563eb;">${profiles.length}</div>
        <div style="font-size:0.65rem; font-weight:700; color:#1e40af;">CHILDREN</div>
      </div>
      <div style="background:#ecfdf5; border-radius:10px; padding:0.7rem; text-align:center;">
        <div style="font-size:1.3rem; font-weight:900; color:#059669;">${totalMastered}</div>
        <div style="font-size:0.65rem; font-weight:700; color:#065f46;">TOPICS MASTERED</div>
      </div>
      <div style="background:#fef3c7; border-radius:10px; padding:0.7rem; text-align:center;">
        <div style="font-size:1.3rem; font-weight:900; color:#d97706;">${totalXp}</div>
        <div style="font-size:0.65rem; font-weight:700; color:#92400e;">TOTAL XP</div>
      </div>
    </div>
    <table style="width:100%; border-collapse:collapse; font-size:0.8rem;">
      <tr style="border-bottom:2px solid var(--border-color);">
        <th style="text-align:left; padding:0.3rem 0.4rem;">Child</th><th style="text-align:left;">Mastered</th>
        <th style="text-align:left;">XP</th><th style="text-align:left;">Streak</th><th style="text-align:left;">Solidified</th>
      </tr>${rows}
    </table>
    <p style="font-size:0.72rem; color:var(--text-muted); margin-top:0.6rem;">Across ${totalSolid} recall-proven 🧠 topics and ${totalMastered} mastered — the whole family at a glance. Snapshots refresh when a profile is saved.</p>
  `;
}

// Render the family-profile manager into the dashboard modal.
function renderFamilyProfilesPanel() {
  const container = document.getElementById('familyProfilesContent');
  if (!container) return;
  const profiles = getFamilyProfiles();
  const entries = Object.values(profiles).sort((a, b) => b.savedAt - a.savedAt);
  const currentName = currentUser ? currentUser.name : 'Guest';
  const currentGrade = currentUser && currentUser.grade ? currentUser.grade : '—';
  const teacherAllowed = !!currentUser && ['Teacher', 'Admin'].includes(String(currentUser.role || ''));

  const rows = entries.map(p => {
    const d = new Date(p.savedAt);
    const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return `
      <div style="display:flex; align-items:center; justify-content:space-between; gap:0.6rem; background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:10px; padding:0.7rem 0.9rem; margin-bottom:0.5rem;">
        <div style="display:flex; align-items:center; gap:0.7rem;">
          <span style="font-size:1.5rem;">👧</span>
          <div>
            <div style="font-weight:800; color:var(--text-main);">${escapeHtml(p.name)} <span class="class-tag">Class ${p.grade}</span></div>
            <div style="font-size:0.72rem; color:var(--text-muted);">Saved ${dateStr} · ${Object.keys(p.snapshot).length} data keys</div>
          </div>
        </div>
        <div style="display:flex; gap:0.4rem;">
          <button class="btn" style="font-size:0.7rem; padding:0.35rem 0.7rem; background:#2563eb; border-color:#2563eb; color:#fff; font-weight:700;" onclick="switchFamilyProfile('${p.id}')">Switch</button>
          <button class="btn" style="font-size:0.7rem; padding:0.35rem 0.6rem;" onclick="updateFamilyProfileSlot('${p.id}'); renderFamilyProfilesPanel()">Update</button>
          <button class="btn" style="font-size:0.7rem; padding:0.35rem 0.6rem; background:#fef2f2; border-color:#fecaca; color:#991b1b;" onclick="if(confirm('Delete this profile? Its saved progress is removed.')){deleteFamilyProfileSlot('${p.id}'); renderFamilyProfilesPanel();}">🗑</button>
        </div>
      </div>`;
  }).join('') || '<p style="color:var(--text-muted); font-size:0.85rem;">No child profiles yet — save the current setup as the first one below.</p>';

  container.innerHTML = `
    <div style="background:linear-gradient(135deg,#eff6ff,#f5f3ff); border:1px solid #c7d2fe; border-radius:12px; padding:1rem; margin-bottom:1rem;">
      <div style="font-weight:800; color:#312e81; font-size:1rem;">👨‍👩‍👧 One device, every child</div>
      <p style="font-size:0.82rem; color:#4b5563; margin:0.3rem 0 0.8rem;">Currently active: <b>${escapeHtml(currentName)}</b> (Class ${escapeHtml(currentGrade)}). Save this child's progress as a profile, then switch between children any time — each keeps their own XP, streak, mastery and reports.</p>
      <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
        <input id="familyProfileName" class="form-input" placeholder="Child's name" style="flex:1; min-width:140px; font-size:0.85rem;" value="${currentName === 'Guest' ? '' : escapeHtml(currentName)}">
        <select id="familyProfileGrade" class="form-input" style="width:auto; font-size:0.85rem;">
          ${Array.from({ length: 10 }, (_, i) => `<option value="${i + 1}" ${(currentUser && currentUser.grade) === i + 1 ? 'selected' : ''}>Class ${i + 1}</option>`).join('')}
        </select>
        <button class="btn" style="font-size:0.8rem; background:#2563eb; border-color:#2563eb; color:#fff; font-weight:800;" onclick="saveFamilyProfileSlot(document.getElementById('familyProfileName').value || ('Child ' + document.getElementById('familyProfileGrade').value), document.getElementById('familyProfileGrade').value); renderFamilyProfilesPanel();">💾 Save as profile</button>
      </div>
    </div>
    <h3 style="font-size:0.95rem; font-weight:800; color:var(--text-main); margin-bottom:0.6rem;">👩‍🏫 Class-wide view (all children)</h3>
    <div id="classWideContent"></div>
    ${teacherAllowed ? `
    <h3 style="font-size:0.95rem; font-weight:800; color:var(--text-main); margin:1rem 0 0.6rem;">👩‍🏫 Teacher tools — class roster</h3>
    <div style="font-size:0.78rem; color:var(--text-muted); margin-bottom:0.5rem;">Create a server-backed class, share the join link with students, then sync to see their mastery.</div>
    <div style="display:flex; gap:0.5rem; flex-wrap:wrap; align-items:center; margin-bottom:0.5rem;">
      <button class="btn" style="font-size:0.75rem; padding:0.4rem 0.8rem; background:#7c3aed; border-color:#7c3aed; color:#fff; font-weight:700;" onclick="createClass()">＋ Create class</button>
      ${myClassCode() ? `<code style="background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:6px; padding:0.3rem 0.6rem; font-size:0.8rem; color:#7c3aed; font-weight:800;">${escapeHtml(myClassCode())}</code>
      <button class="btn" style="font-size:0.72rem; padding:0.35rem 0.7rem;" onclick="navigator.clipboard && navigator.clipboard.writeText(avyaanStorage.getItem('avyaan_class_link') || ''); alert('Join link copied — share it with students.')">🔗 Copy join link</button>` : ''}
      <button class="btn" style="font-size:0.75rem; padding:0.4rem 0.8rem;" onclick="syncClassRoster()">🔄 Sync roster</button>
    </div>
    <div id="classRosterContent" style="margin-bottom:0.8rem;">${myClassCode() ? '<p style="font-size:0.78rem; color:var(--text-muted);">Press “Sync roster” to fetch students who joined <b>' + escapeHtml(myClassCode()) + '</b>.</p>' : ''}</div>
    ` : ''}
    <h3 style="font-size:0.95rem; font-weight:800; color:var(--text-main); margin:1rem 0 0.6rem;">Saved profiles</h3>
    ${rows}
    <p style="font-size:0.72rem; color:var(--text-muted); margin-top:0.8rem;">Switching restores that child's full snapshot and reloads the page. Tip: save the profile again after a session to keep it current.</p>
  `;
  renderClassWideSummary();
}

function switchFamilyProfile(id) {
  const p = getFamilyProfiles()[id];
  if (!p) return;
  closeModal('familyProfilesModal');
  if (loadFamilyProfileSlot(id)) {
    alert(`Switched to ${p.name} (Class ${p.grade}). Reloading…`);
    location.reload();
  } else {
    alert('Could not load that profile.');
  }
}

// --------------------------------------------------------------------------
// Teacher tools — class codes, join links and roster aggregation.
// A teacher creates a class code, shares the ?join= link; each child who
// opens it is assigned to the class on the server. The roster endpoint
// returns server-validated mastery and quiz summaries, never raw learner
// backup blobs or client-claimed XP.
// --------------------------------------------------------------------------
function myClassCode() {
  return avyaanStorage.getItem('avyaan_class_code') || '';
}

async function createClass() {
  const role = String(currentUser?.role || '').toLowerCase();
  if (!currentUser || currentUser.isGuest || !['teacher', 'admin'].includes(role)) {
    alert('A provisioned teacher account is required to create a server-backed class.');
    return;
  }
  const result = await AvyaanAPI.createClass(currentUser.grade || currentUser.enrolled_class || 1);
  if (!result || result.status !== 'success' || !result.class_code) {
    alert((result && result.detail) || 'Class service is unavailable. Please try again.');
    return;
  }
  const code = result.class_code;
  avyaanStorage.setItem('avyaan_class_code', code);
  const link = location.origin + location.pathname + '?join=' + encodeURIComponent(code);
  avyaanStorage.setItem('avyaan_class_link', link);
  renderFamilyProfilesPanel();
  alert('🎒 Class ready!\n\nCode: ' + code +
    '\n\nShare this join link with students (they need a registered account):\n' + link +
    '\n\nAfter they open it and sync once, your roster below fills in.');
}

async function syncClassRoster() {
  const code = myClassCode();
  const container = document.getElementById('classRosterContent');
  if (!code) {
    if (container) container.innerHTML = '<p style="color:var(--text-muted); font-size:0.8rem;">Create a class first — the roster needs a class code.</p>';
    return;
  }
  if (container) container.innerHTML = '<p style="font-size:0.8rem; color:var(--text-muted);">Syncing roster…</p>';
  const roster = await AvyaanAPI.fetchClassRoster(code);
  if (!roster || !roster.students) {
    if (container) container.innerHTML = '<p style="font-size:0.8rem; color:#b91c1c;">Roster unavailable — the cloud endpoint must be reachable and students must have synced after joining.</p>';
    return;
  }
  const rows = roster.students.map(s => {
    const sum = s;
    return `<tr>
      <td style="padding:5px 6px; border-bottom:1px solid var(--border-color); font-weight:700;">${escapeHtml(sum.name || 'Learner')}</td>
      <td style="padding:5px 6px; border-bottom:1px solid var(--border-color);">Class ${escapeHtml(sum.grade || 1)}</td>
      <td style="padding:5px 6px; border-bottom:1px solid var(--border-color);">${sum.mastered || 0}/${sum.total_topics || 0} (${sum.mastery_pct || 0}%)</td>
      <td style="padding:5px 6px; border-bottom:1px solid var(--border-color);">${sum.quiz_accuracy_pct == null ? '—' : sum.quiz_accuracy_pct + '%'}</td>
      <td style="padding:5px 6px; border-bottom:1px solid var(--border-color);">${sum.quiz_attempts || 0}</td>
      <td style="padding:5px 6px; border-bottom:1px solid var(--border-color);">${escapeHtml(sum.last_active_date || '—')}</td>
    </tr>`;
  }).join('');
  const totalMastered = roster.students.reduce((sum, st) => sum + (Number(st.mastered) || 0), 0);
  container.innerHTML = `
    <div style="font-size:0.78rem; color:var(--text-muted); margin-bottom:0.5rem;">${roster.students.length} student(s) · ${totalMastered} total topics mastered across the class</div>
    <table style="width:100%; border-collapse:collapse; font-size:0.78rem;">
      <tr style="text-align:left;">
        <th style="padding:4px 6px; border-bottom:2px solid var(--border-color);">Student</th>
        <th style="padding:4px 6px; border-bottom:2px solid var(--border-color);">Class</th>
        <th style="padding:4px 6px; border-bottom:2px solid var(--border-color);">Verified mastery</th>
        <th style="padding:4px 6px; border-bottom:2px solid var(--border-color);">Quiz accuracy</th>
        <th style="padding:4px 6px; border-bottom:2px solid var(--border-color);">Attempts</th>
        <th style="padding:4px 6px; border-bottom:2px solid var(--border-color);">Last active</th>
      </tr>
      ${rows}
    </table>`;
}

// Handle ?join=CLASSCODE deep links: attach this child's account to the class.
function joinClassFromLink() {
  const m = location.search.match(/[?&]join=([A-Za-z0-9-]+)/);
  if (!m) return;
  const code = m[1];
  const user = JSON.parse(avyaanStorage.getItem('avyaan_user') || '{}');
  if (!user.id || user.isGuest) return; // joining needs a real account
  if (myClassCode() === code) return;
  avyaanStorage.setItem('avyaan_class_code', code);
  AvyaanAPI.joinClass(code).then(res => {
    if (!res || res.status !== 'success') {
      avyaanStorage.removeItem('avyaan_class_code');
      if (typeof toast === 'function') toast(res?.detail || 'This class link is not active.');
    }
  });
  // The next auto-sync (or this immediate one) tags the cloud blob with the code.
  setTimeout(() => syncProgressToCloud(), 600);
  setTimeout(() => {
    alert('🎒 Joined class ' + code + '! Your progress will appear in the teacher\'s roster after the next cloud sync.');
  }, 1000);
}

// --------------------------------------------------------------------------
// Cloud sync — progress survives device changes when a backend is connected.
// Works silently: if the user isn't logged in or the endpoint isn't deployed,
// sync is a no-op and the local device stays the source of truth. The parent
// sees a small status line next to Backup/Restore.
// --------------------------------------------------------------------------
function buildProgressBlob() {
  return JSON.stringify({
    app: 'avyaan',
    version: window.AVYAAN_CONTENT_VERSION || '',
    savedAt: Date.now(),
    scope: {
      account_id: currentUser?.account_id || currentUser?.id || null,
      child_id: currentUser?.child_id || currentUser?.id || null
    },
    data: collectProgressState()
  });
}

async function syncProgressToCloud() {
  const user = JSON.parse(avyaanStorage.getItem('avyaan_user') || '{}');
  if (!user.id || user.isGuest) return null;
  if (!window.AvyaanAPI || !AvyaanAPI.getToken()) return null;
  const blob = buildProgressBlob();
  const res = await AvyaanAPI.pushProgressBlob(blob);
  if (res) avyaanStorage.setItem('avyaan_last_cloud_sync', String(Date.now()));
  return res;
}

async function restoreFromCloud() {
  const user = JSON.parse(avyaanStorage.getItem('avyaan_user') || '{}');
  if (!user.id || user.isGuest) return;
  if (!window.AvyaanAPI || !AvyaanAPI.getToken()) return;
  const remote = await AvyaanAPI.pullProgressBlob();
  if (!remote) return;
  try {
    const p = JSON.parse(remote);
    if (!p || p.app !== 'avyaan' || !p.data) return;
    const expectedChild = currentUser?.child_id || currentUser?.id || null;
    if (p.scope?.child_id && expectedChild && String(p.scope.child_id) !== String(expectedChild)) {
      console.warn('[Avyaan] ignored cloud progress for a different learner scope');
      return false;
    }
    // Only restore when the cloud copy is newer than the local last-sync marker
    const lastLocal = parseInt(avyaanStorage.getItem('avyaan_last_cloud_sync') || '0', 10);
    if (p.savedAt && p.savedAt > lastLocal) {
      Object.entries(p.data).forEach(([k, v]) => avyaanStorage.setItem(k, v));
      avyaanStorage.setItem('avyaan_last_cloud_sync', String(p.savedAt || Date.now()));
      return true; // caller decides whether to reload
    }
  } catch (e) { /* ignore malformed cloud blob */ }
  return false;
}

// Debounced auto-sync: at most one push every 30 s, so quiz loops don't spam.
let cloudSyncTimer = null;
function scheduleCloudSync() {
  if (cloudSyncTimer) return;
  cloudSyncTimer = setTimeout(() => {
    cloudSyncTimer = null;
    syncProgressToCloud();
  }, 30000);
}

function cloudSyncStatusLine() {
  const last = avyaanStorage.getItem('avyaan_last_cloud_sync');
  if (!last) return '';
  const mins = Math.floor((Date.now() - parseInt(last, 10)) / 60000);
  const ago = mins < 1 ? 'just now' : mins < 60 ? mins + 'm ago' : Math.floor(mins / 60) + 'h ago';
  return `<div style="font-size: 0.7rem; color: #059669; margin-top: 0.35rem;">☁️ Cloud sync active · last synced ${ago}</div>`;
}

// Dark mode toggle — overrides the OS preference, persisted per device
function toggleTheme() {
  const root = document.documentElement;
  root.setAttribute('data-theme', 'light');
  avyaanStorage.setItem('avyaan_theme', 'light');
}

function syncThemeToggle() {
  const root = document.documentElement;
  root.setAttribute('data-theme', 'light');
  avyaanStorage.setItem('avyaan_theme', 'light');
}

function getBoardPrepChapters() {
  if (!AVYAAN_DATA.reviews) return [];
  const seen = new Set();
  const list = [];
  for (const r of AVYAAN_DATA.reviews) {
    if (r.class_level !== 9 && r.class_level !== 10) continue;
    if (!r.questions || r.questions.length < 4) continue;
    if (boardPrepBoardFilter !== 'All') {
      const tags = r.boards || ['NCERT / CBSE'];
      if (!tags.some(t => t.toLowerCase().includes(boardPrepBoardFilter.toLowerCase()))) continue;
    }
    const key = r.class_level + '|' + r.subject + '|' + r.chapter;
    if (seen.has(key)) continue;
    seen.add(key);
    list.push(r);
  }
  list.sort((a, b) => a.class_level - b.class_level || a.subject.localeCompare(b.subject) || a.chapter.localeCompare(b.chapter));
  return list;
}

function openBoardPrep() {
  loadLazy('reviews', renderBoardPrep);
}

function renderBoardPrep() {
  const chapters = getBoardPrepChapters();
  const container = document.getElementById('boardPrepContent');
  if (!container) return;
  const current = currentActiveTopic;
  const boardOptions = ['All', 'NCERT / CBSE', 'ICSE'];
  let html = `
    <div style="margin-bottom: 1rem;">
      <h2 style="font-size: 1.25rem; font-weight: 800; color: var(--text-main); margin: 0;">🎯 Board Prep — timed practice</h2>
      <p style="font-size: 0.82rem; color: var(--text-muted); margin: 0.25rem 0 0;">Exam-style timed quizzes for Classes 9–10. 5 minutes per chapter; the timer keeps every question honest.</p>
      <div style="margin-top: 0.6rem; display: flex; align-items: center; gap: 0.5rem;">
        <label style="font-size: 0.8rem; font-weight: 700; color: var(--text-main);">Board:</label>
        <select onchange="boardPrepBoardFilter=this.value; renderBoardPrep();" style="padding: 0.35rem 0.6rem; border: 1px solid var(--border-color); border-radius: 8px; font-size: 0.82rem; background: var(--bg-card);">
          ${boardOptions.map(o => `<option value="${o}" ${o === boardPrepBoardFilter ? 'selected' : ''}>${o === 'All' ? 'All boards' : o}</option>`).join('')}
        </select>
        <span style="font-size: 0.75rem; color: var(--text-muted);">${chapters.length} chapter quizzes</span>
      </div>
    </div>
    <div style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 55vh; overflow-y: auto; padding-right: 0.3rem;">`;
  for (const ch of chapters) {
    const chapName = (ch.chapter || '').replace(/^Chapter\s*\d+\s*—\s*/, '');
    const isCurrent = current && current.class_level === ch.class_level && current.subject === ch.subject && current.chapter === (ch.chapter || '');
    const tags = ch.boards || ['NCERT / CBSE'];
    const chips = tags.map(t => `<span style="font-size: 0.62rem; font-weight: 800; padding: 0.1rem 0.45rem; border-radius: 999px; background: ${t.includes('ICSE') ? '#fdf2f8' : '#eff6ff'}; color: ${t.includes('ICSE') ? '#be185d' : '#1d4ed8'}; border: 1px solid ${t.includes('ICSE') ? '#fbcfe8' : '#bfdbfe'};">${t.replace('NCERT / ', '')}</span>`).join(' ');
    html += `
      <div style="display: flex; align-items: center; gap: 0.8rem; background: ${isCurrent ? '#eff6ff' : '#f8fafc'}; border: 1px solid ${isCurrent ? '#bfdbfe' : 'var(--border-color)'}; border-radius: 12px; padding: 0.7rem 0.9rem;">
        <span style="font-size: 1.4rem;">${SUBJECT_EMOJI[ch.subject] || '📘'}</span>
        <div style="flex: 1; min-width: 0;">
          <div style="font-size: 0.9rem; font-weight: 800; color: var(--text-main);">${ch.subject} · Class ${ch.class_level} — ${chapName}</div>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.15rem;">${ch.questions.length} questions · 5:00 ⏱ &nbsp;${chips}</div>
        </div>
        <button class="btn" style="background: #0f172a; border-color: var(--text-main); color: #fff; font-weight: 700; flex-shrink: 0;" onclick="startBoardPrep('${ch.key.replace(/'/g, "\\'")}')">▶ Start</button>
      </div>`;
  }
  html += `</div>`;
  if (chapters.length === 0) {
    html = '<p style="color: var(--text-muted);">No Class 9–10 chapter quizzes are available yet.</p>';
  }
  container.innerHTML = html;
  openModal('boardPrepModal');
}

function startBoardPrep(reviewKey) {
  loadLazy('reviews', async () => {
    const r = AVYAAN_DATA.reviews.find(x => x.key === reviewKey);
    if (!r || !r.questions || r.questions.length < 2) {
      alert('No quiz is available for this chapter yet.');
      return;
    }
    await startAggregateReview(
      { mode: 'board', review_key: r.key, class_level: r.class_level, subject: r.subject, chapter: r.chapter },
      r.questions,
      'Board Prep — Timed Quiz',
      { class_level: r.class_level, subject: r.subject, chapter: r.chapter },
      true,
      5 * 60,
    );
    closeModal('boardPrepModal');
  });
}

// ==========================================================================
// PRINT WORKSHEET — school-friendly printable handout for a topic
// ==========================================================================
function printWorksheet() {
  const t = currentActiveTopic;
  if (!t) return;
  const seeIt = t.seeIt || {};
  const schoolForm = t.schoolForm || {};
  const whyItWorks = t.whyItWorks || {};
  const workedExample = t.workedExample || {};
  const quiz = (t.mcqs && t.mcqs.length ? t.mcqs : [t.tryIt]).filter(Boolean).slice(0, 3);
  const experiment = t.experiment || {};

  const letter = (label) => `<div class="answer-line">${label}: <span class="line"></span></div>`;
  const quizHtml = quiz.length ? quiz.map((q, i) => `
    <div class="quiz-item">
      <p class="quiz-q"><strong>Q${i + 1}.</strong> ${q.question}</p>
      ${(q.options || []).map((opt, oi) => `
        <label class="quiz-opt"><span class="opt-letter">${String.fromCharCode(65 + oi)}</span> ${opt}</label>
      `).join('')}
    </div>
  `).join('') : '';

  const w = window.open('', '_blank', 'width=820,height=1050');
  if (!w) return;
  w.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Worksheet: ${t.title}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: var(--text-main); margin: 0; padding: 28px; font-size: 13px; }
  .ws-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0f172a; padding-bottom: 10px; margin-bottom: 14px; }
  .ws-title { font-size: 22px; font-weight: 800; }
  .ws-meta { font-size: 12px; color: var(--text-muted); margin-top: 4px; }
  .ws-id { text-align: right; font-size: 11px; color: var(--text-dim); }
  .name-line { display: flex; gap: 40px; margin-bottom: 14px; font-weight: 700; }
  .name-line span { border-bottom: 1px solid #0f172a; flex: 1; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; margin: 16px 0 6px; color: #1e293b; }
  p { margin: 4px 0; }
  .box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; margin-top: 4px; }
  .steps li { margin: 3px 0; }
  .answer-line { margin: 10px 0; }
  .line { display: inline-block; width: 78%; border-bottom: 1px dotted #94a3b8; }
  .quiz-item { margin: 12px 0; }
  .quiz-opt { display: block; margin: 4px 0 4px 18px; }
  .opt-letter { display: inline-block; width: 16px; height: 16px; border: 1px solid #334155; border-radius: 3px; text-align: center; font-size: 10px; font-weight: 700; margin-right: 6px; }
  .experiment ol { margin: 4px 0 4px 18px; }
  .ws-footer { margin-top: 22px; border-top: 1px solid #cbd5e1; padding-top: 8px; font-size: 10px; color: var(--text-dim); text-align: center; }
  @media print { body { padding: 12px; } }
</style>
</head>
<body>
  <div class="ws-header">
    <div>
      <div class="ws-title">${t.emoji} ${t.title}</div>
      <div class="ws-meta">${t.subject} · ${t.class_band} · Avyaan STEM Worksheet${t.chapter ? ` · 📖 ${t.chapter.replace(/^Chapter\s*\d+\s*—\s*/, '')}` : ''}</div>
    </div>
    <div class="ws-id">Worksheet<br>${t.id}</div>
  </div>

  <div class="name-line"><span></span><span></span></div>
  <div style="display:flex; gap:40px; margin-bottom:6px;"><div style="font-size:11px; color:#64748b;">Name</div><div style="font-size:11px; color:#64748b;">Date</div></div>

  <p><strong>About this topic:</strong> ${t.summary}</p>
  ${t.outcome ? `<p><strong>By the end of this lesson you can…</strong> ${t.outcome.replace(/^You can\s+/i, '')}</p>` : ''}

  <h2>1. Predict</h2>
  <p><strong>Question:</strong> ${seeIt.prompt || 'What do you think will happen?'}</p>
  ${letter('My prediction')}
  ${letter('Why I think so')}

  <h2>2. Formula / School Form</h2>
  ${schoolForm.expression ? `<div class="box"><strong>${schoolForm.expression}</strong></div>` : `<div class="box">No number formula — explain the idea behind ${t.title} in your own words.</div>`}
  ${letter('In my own words')}

  <h2>3. Why It Works</h2>
  <div class="box">${whyItWorks.text || t.summary}</div>
  ${letter('One thing I learned')}

  <h2>4. Worked Example</h2>
  <div class="box">
    <p><strong>${workedExample.problem || 'Explain ' + t.title + ' in your own words.'}</strong></p>
    ${workedExample.steps && workedExample.steps.length ? `<ol class="steps">${workedExample.steps.map(s => `<li>${s}</li>`).join('')}</ol>` : ''}
  </div>
  ${letter('My attempt')}

  <h2>5. Quiz</h2>
  ${quizHtml || '<p>No quiz questions available.</p>'}

  <h2>6. Hands-On Activity</h2>
  ${experiment.steps && experiment.steps.length ? `<div class="box experiment"><ol>${experiment.steps.map(s => `<li>${s}</li>`).join('')}</ol></div>` : '<p>No activity.</p>'}
  ${letter('What I observed')}

  <div class="ws-footer">Generated by Avyaan STEM for Class 1–10 · Practice one page a day, little by little!</div>
</body>
</html>`);
  w.document.close();
  w.focus();
  setTimeout(() => { try { w.print(); } catch (e) {} }, 350);
}

// ==========================================================================
// PROGRESS SHARE-CARD — canvas-generated achievement card + Web Share
// ==========================================================================
function generateShareCard() {
  const studentName = currentUser ? currentUser.name : 'Guest';
  const level = getUserLevel();
  const streakData = JSON.parse(avyaanStorage.getItem('avyaan_streak_data') || '{}');
  const mastered = completedTopicIds.size;
  const total = AVYAAN_DATA.topics.length;
  const pct = total ? Math.round((mastered / total) * 100) : 0;
  // A few of the most recently mastered topic emojis for the card
  const recentEmojis = getActivityLog()
    .filter(a => a.type === 'mastered')
    .slice(-6)
    .map(a => a.emoji);

  const W = 1080, H = 1350;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');

  // Gradient background
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#6d28d9');
  grad.addColorStop(0.5, '#7c3aed');
  grad.addColorStop(1, '#1d4ed8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Decorative circles
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(W * 0.85, H * 0.12, 220, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(W * 0.1, H * 0.85, 180, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(W * 0.9, H * 0.7, 90, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 44px Segoe UI, Arial, sans-serif';
  ctx.fillText('A  Avyaan', 70, 110);
  ctx.font = '400 30px Segoe UI, Arial, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText('Interactive STEM · Classes 1–10', 70, 165);

  // Big progress ring
  const cx = W / 2, cy = 500, R = 260;
  ctx.lineWidth = 44;
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#fbbf24';
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + (pct / 100) * Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 1;
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 96px Segoe UI, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(pct + '%', cx, cy - 20);
  ctx.font = '500 34px Segoe UI, Arial, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillText('of the curriculum mastered', cx, cy + 50);
  ctx.textAlign = 'left';

  // Stats row
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 52px Segoe UI, Arial, sans-serif';
  const stats = [
    [String(mastered), 'Topics mastered'],
    [String(streakData.count || 0) + '🔥', 'Day streak'],
    [String(userXP), 'Total XP'],
    [level.icon, level.name]
  ];
  const colW = W / 4;
  stats.forEach((s, i) => {
    const x = colW * i + colW / 2;
    ctx.textAlign = 'center';
    ctx.fillText(s[0], x, 930);
    ctx.font = '400 30px Segoe UI, Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText(s[1], x, 985);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 52px Segoe UI, Arial, sans-serif';
    ctx.textAlign = 'left';
  });

  // Recent topic emojis as a "medal row"
  const emojis = recentEmojis.length ? recentEmojis : ['🍎', '📐', '🔬'];
  ctx.font = '64px Segoe UI, Arial, sans-serif';
  ctx.textAlign = 'center';
  const startX = (W - emojis.length * 90) / 2;
  emojis.forEach((e, i) => ctx.fillText(e, startX + i * 90, 1110));
  ctx.textAlign = 'left';

  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '400 30px Segoe UI, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(studentName + ' · ' + level.icon + ' ' + level.name, W / 2, 1200);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '400 26px Segoe UI, Arial, sans-serif';
  ctx.fillText('Keep exploring — every lesson counts!', W / 2, 1250);
  ctx.textAlign = 'left';

  c.toBlob(async function (blob) {
    if (!blob) return;
    const file = new File([blob], 'avyaan-progress.png', { type: 'image/png' });
    // Try the native Web Share API first (mobile)
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'My Avyaan progress', text: 'I mastered ' + mastered + ' STEM topics (' + pct + '%) on Avyaan!' });
        return;
      } catch (e) { /* user cancelled or share failed — fall through to download */ }
    }
    // Fallback: download the PNG
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'avyaan-progress.png';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }, 'image/png');
}

// ==========================================================================
// GUARDIAN WEEKLY REPORT — printable digest of progress + weak areas
// ==========================================================================
// Builds the full printable weekly-report HTML. Shared by the print window
// (openWeeklyReport) and email delivery (emailWeeklyReport), so what the
// parent receives in email is exactly what prints.
function buildWeeklyReportHtml() {
  const all = AVYAAN_DATA.topics;
  const studentName = currentUser ? currentUser.name : 'Guest';
  const safeStudentName = escapeHtml(studentName);
  const grade = currentUser && currentUser.grade ? currentUser.grade : '—';
  const level = getUserLevel();
  const streakData = JSON.parse(avyaanStorage.getItem('avyaan_streak_data') || '{}');

  const now = Date.now();
  const weekStart = now - 7 * 86400000;
  const fmt = (ts) => new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const weekLabel = `${fmt(weekStart)} – ${fmt(now)}`;

  // --- Reconstruct this week's activity from the activity log ---
  const log = getActivityLog().filter(a => a.ts >= weekStart);
  const masteredThisWeek = log.filter(a => a.type === 'mastered');
  const challengeWins = log.filter(a => a.type === 'daily-challenge');
  const estimations = log.filter(a => a.type === 'estimation');
  const predictions = log.filter(a => a.type === 'prediction');
  const selfAssessed = log.filter(a => a.type && a.type.startsWith('self-assessed'));

  // --- Number sense: average estimation accuracy this week vs last week ---
  const estAll = safeStorageJSON('avyaan_estimations', {});
  const prevStart = weekStart - 7 * 86400000;
  const estThisWeek = Object.values(estAll).filter(r => r && r.timestamp >= weekStart && typeof r.accuracy === 'number');
  const estPrevWeek = Object.values(estAll).filter(r => r && r.timestamp >= prevStart && r.timestamp < weekStart && typeof r.accuracy === 'number');
  const avgAcc = (arr) => {
    const m = avgOf(arr, r => r.accuracy);
    return m == null ? null : Math.round(m * 100);
  };
  const accNow = avgAcc(estThisWeek);
  const accPrev = avgAcc(estPrevWeek);
  const numSenseTrend = (accNow != null && accPrev != null)
    ? (accNow - accPrev >= 2 ? '↑' : accNow - accPrev <= -2 ? '↓' : '→') : '';

  // XP earned this week — activity-based awards + exact quiz XP from session records
  // (badge XP is a meta-achievement without a topic, surfaced via the Badges stat)
  const xpMap = { 'mastered': 50, 'daily-challenge': 100, 'estimation': 5, 'prediction': 10 };
  const quizSessions = JSON.parse(avyaanStorage.getItem('avyaan_quiz_sessions') || '[]');
  const quizSessionsThisWeek = quizSessions.filter(s => s && s.ts >= weekStart);
  const quizXpThisWeek = quizSessionsThisWeek.reduce((s, x) => s + (x.correct * 20) + (x.wrong * 5), 0);
  const xpEst = log.reduce((s, a) => s + (xpMap[a.type] || 0), 0) + quizXpThisWeek;
  const assessments = JSON.parse(avyaanStorage.getItem('avyaan_self_assessments') || '{}');

  // --- Daily activity strip: last 7 days ---
  const dayLabel = (ts) => new Date(ts).toLocaleDateString('en-IN', { weekday: 'short' });
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = now - i * 86400000;
    const dayEnd = dayStart + 86400000;
    const dayEvents = log.filter(a => a.ts >= dayStart && a.ts < dayEnd);
    const studied = new Set(dayEvents.map(a => a.topicId).filter(Boolean));
    days.push({
      label: dayLabel(dayStart),
      date: fmt(dayStart),
      count: studied.size,
      mastered: dayEvents.filter(a => a.type === 'mastered').length
    });
  }
  const activeDays = days.filter(d => d.count > 0).length;
  const dayStrip = days.map(d => `
    <div class="day-cell ${d.count > 0 ? 'day-active' : 'day-idle'}">
      <div class="day-label">${d.label}</div>
      <div class="day-date">${d.date}</div>
      <div class="day-count">${d.count > 0 ? d.count + ' studied' : '—'}</div>
      ${d.mastered > 0 ? `<div class="day-mastered">✓ ${d.mastered}</div>` : ''}
    </div>
  `).join('');

  // --- Covered this week: every topic with any activity, with its status ---
  const coveredIds = new Set();
  log.forEach(a => { if (a.topicId) coveredIds.add(a.topicId); });
  const lastTsFor = (id) => Math.max(0, ...log.filter(x => x.topicId === id).map(x => x.ts));
  const coveredTopics = Array.from(coveredIds)
    .map(id => all.find(t => t.id === id))
    .filter(Boolean)
    .sort((a, b) => lastTsFor(b.id) - lastTsFor(a.id));
  const statusOf = (t) => {
    if (isSolidified(t.id)) return ['🧠', 'Solidified'];
    if (completedTopicIds.has(t.id)) return ['✅', 'Mastered'];
    const rating = (assessments[t.id] || {}).rating;
    if (rating === 'no' || rating === 'almost') return ['🔁', 'Reviewing'];
    return ['📖', 'In progress'];
  };
  const coveredRows = coveredTopics.map(t => {
    const [icon, status] = statusOf(t);
    const chapter = t.chapter ? t.chapter.replace(/^Chapter\s*\d+\s*—\s*/, '') : '';
    return `<tr><td>${t.emoji} ${t.title}</td><td>${topicDisplaySubject(t)}</td><td>Class ${t.class_level}</td><td>${chapter}</td><td>${icon} ${status}</td><td>${fmt(lastTsFor(t.id))}</td></tr>`;
  }).join('');
  const coveredCount = coveredTopics.length;
  const reviewingCount = coveredTopics.filter(t => statusOf(t)[1] === 'Reviewing').length;

  // --- Coverage trends: per-topic week-over-week activity + stagnation ---
  // Pure classification lives in app_core (computeTopicTrends); this block
  // just feeds it the live state and renders the rows.
  const fullLog = getActivityLog();
  const topicsById = {};
  all.forEach(t => { topicsById[t.id] = t; });
  const trends = computeTopicTrends(fullLog, {
    topicsById: topicsById,
    completed: completedTopicIds,
    assessments: assessments,
    dueReviewIds: new Set(getTopicsDueForReview()),
    weekStart: weekStart,
    prevStart: prevStart
  });
  const trendRows = trends.trendTopics.slice(0, 12).map(x => `
    <tr>
      <td>${x.topic.emoji} ${x.topic.title}</td>
      <td>${topicDisplaySubject(x.topic)} · Class ${x.topic.class_level}</td>
      <td>${x.thisWeekN}</td>
      <td>${x.lastWeekN}</td>
      <td title="${x.trendTitle}">${x.trend}</td>
      <td>${x.statusIcon} ${x.status}</td>
      <td>${x.thisWeekN > 0 ? 'this week' : fmt(x.lastTs)}</td>
    </tr>`).join('');
  const masteredLastWeek = trends.masteredLastWeek;
  const activeLastWeek = trends.activeLastWeek;
  const stagnantCount = trends.stagnantCount;
  const trendHidden = trends.totalTopics > 12;

  // --- Weak areas: honest self-ratings of "no" / "almost" + topics due for review ---
  const weakIds = new Set();
  Object.entries(assessments).forEach(([id, rec]) => {
    if (rec && (rec.rating === 'no' || rec.rating === 'almost')) weakIds.add(id);
  });
  getTopicsDueForReview().forEach(id => weakIds.add(id));
  const weakTopics = Array.from(weakIds)
    .map(id => all.find(t => t.id === id))
    .filter(Boolean)
    .sort((a, b) => (getSmartScore(a.id) - getSmartScore(b.id)) || (a.class_level - b.class_level))
    .slice(0, 8);

  // --- Per-subject activity this week (studied vs mastered), display-aware ---
  const subjectCounts = {};      // mastered
  const subjectStudied = {};     // any activity
  masteredThisWeek.forEach(a => {
    const disp = displaySubject(a.subject, a.classLevel);
    subjectCounts[disp] = (subjectCounts[disp] || 0) + 1;
  });
  log.forEach(a => {
    if (!a.subject) return;
    const disp = displaySubject(a.subject, a.classLevel);
    subjectStudied[disp] = (subjectStudied[disp] || 0) + 1;
  });
  const subjectRows = Object.keys(subjectStudied)
    .sort((a, b) => (subjectStudied[b] - subjectStudied[a]))
    .map(s => `<tr><td>${s}</td><td>${subjectCounts[s] || 0} mastered · ${subjectStudied[s]} studied</td></tr>`).join('');

  // --- This week's mastered topics (with chapters) ---
  const masteredRows = masteredThisWeek.slice().reverse().map(a => {
    const topic = all.find(t => t.id === a.topicId);
    if (!topic) return '';
    const chapter = topic.chapter ? topic.chapter.replace(/^Chapter\s*\d+\s*—\s*/, '') : '';
    return `<tr><td>${topic.emoji} ${topic.title}</td><td>${topicDisplaySubject(topic)}</td><td>Class ${topic.class_level}</td><td>${chapter}</td><td>${fmt(a.ts)}</td></tr>`;
  }).join('');

  const weakRows = weakTopics.map(t => {
    const rating = assessments[t.id] ? assessments[t.id].rating : 'due for review';
    const ratingTxt = rating === 'no' ? 'Not yet' : rating === 'almost' ? 'Almost there' : rating;
    return `<tr><td>${t.emoji} ${t.title}</td><td>${t.subject} · Class ${t.class_level}</td><td>${ratingTxt}</td></tr>`;
  }).join('');

  // --- Recurring misconceptions: same myth hit 2+ times this week ---
  const misconLog = getMisconceptionLog();
  const misconByTopic = {};
  misconLog.forEach(m => {
    if (m.ts < weekStart) return;
    misconByTopic[m.topicId] = misconByTopic[m.topicId] || { count: 0, myth: m.myth, title: m.title, emoji: m.emoji, lastTs: 0 };
    misconByTopic[m.topicId].count += 1;
    misconByTopic[m.topicId].lastTs = Math.max(misconByTopic[m.topicId].lastTs, m.ts);
  });
  const misconRows = Object.values(misconByTopic)
    .filter(m => m.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
    .map(m => `<tr><td>${m.emoji} ${m.title}</td><td>${m.count}× this week</td><td>${m.myth}</td></tr>`).join('');

  // --- Focus for next week: top three weak topics with a concrete next step ---
  const focusRows = weakTopics.slice(0, 3).map(t => {
    const rating = assessments[t.id] ? assessments[t.id].rating : 'due for review';
    const hint = rating === 'no'
      ? 'Re-read Step 3 · Why It Works, then retry the quiz'
      : rating === 'almost'
        ? 'Do the Chapter Review to lock it in'
        : 'Complete the spaced review when it comes due';
    return `<tr><td>${t.emoji} ${t.title}</td><td>${t.subject} · Class ${t.class_level}</td><td style="color:#1d4ed8;">${hint}</td></tr>`;
  }).join('');

  // --- Concept mastery: group the child's studied topics into concept
  // families and show which are strong vs which need work (assessment + due).
  const conceptAgg = {};
  coveredTopics.forEach(t => {
    const c = topicConcept(t);
    conceptAgg[c] = conceptAgg[c] || { mastered: 0, weak: 0, total: 0 };
    conceptAgg[c].total += 1;
    if (completedTopicIds.has(t.id)) conceptAgg[c].mastered += 1;
    if (weakIds.has(t.id)) conceptAgg[c].weak += 1;
  });
  const conceptRows = Object.entries(conceptAgg)
    .sort((a, b) => (b[1].weak - a[1].weak) || (b[1].total - a[1].total))
    .slice(0, 8)
    .map(([c, s]) => `<tr><td><b>${c}</b></td><td>${s.mastered} mastered · ${s.total} studied</td><td>${s.weak > 0 ? '<span class="weak">' + s.weak + ' need work</span>' : '<span style="color:#059669;">strong ✅</span>'}</td></tr>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Weekly Report: ${safeStudentName}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: var(--text-main); margin: 0; padding: 32px; font-size: 13px; }
  .rpt-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
  .rpt-title { font-size: 24px; font-weight: 800; }
  .rpt-sub { font-size: 12px; color: var(--text-muted); margin-top: 4px; }
  .rpt-logo { font-size: 11px; color: var(--text-dim); text-align: right; }
  .stat-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin: 14px 0 20px; }
  .stat { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 12px; text-align: center; }
  .stat b { display: block; font-size: 20px; color: #1d4ed8; }
  .stat span { font-size: 10px; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.04em; }
  .day-strip { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; margin: 10px 0 4px; }
  .day-cell { border: 1px solid var(--border-color); border-radius: 8px; padding: 8px 6px; text-align: center; }
  .day-active { background: var(--accent-primary-light); border-color: #bfdbfe; }
  .day-idle { background: var(--bg-secondary); color: #94a3b8; }
  .day-label { font-size: 11px; font-weight: 800; }
  .day-date { font-size: 9px; color: var(--text-dim); margin: 2px 0; }
  .day-count { font-size: 12px; font-weight: 800; color: #1d4ed8; }
  .day-mastered { font-size: 9px; font-weight: 700; color: #059669; margin-top: 2px; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.06em; margin: 20px 0 6px; color: #1e293b; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-dim); border-bottom: 1px solid #cbd5e1; padding: 5px 6px; }
  td { padding: 6px; border-bottom: 1px solid #e2e8f0; }
  .weak { color: #b91c1c; }
  .sig-line { display: flex; gap: 60px; margin-top: 34px; }
  .sig { flex: 1; border-top: 1px solid #94a3b8; padding-top: 6px; font-size: 11px; color: var(--text-dim); text-align: center; }
  .foot { margin-top: 18px; border-top: 1px solid #cbd5e1; padding-top: 8px; font-size: 10px; color: var(--text-dim); text-align: center; }
</style>
</head>
<body>
  <div class="rpt-header">
    <div>
      <div class="rpt-title">📊 Avyaan Weekly Progress Report</div>
      <div class="rpt-sub">${safeStudentName} · Class ${grade} · ${level.icon} ${level.name} · Week of ${weekLabel}</div>
    </div>
    <div class="rpt-logo">Generated by Avyaan STEM<br>smaraze.com · Classes 1–10</div>
  </div>

  <div class="stat-grid">
    <div class="stat"><b>${coveredCount}</b><span>Topics covered</span></div>
    <div class="stat"><b>${masteredThisWeek.length}</b><span>Mastered this week</span></div>
    <div class="stat"><b>${xpEst}</b><span>XP earned</span></div>
    <div class="stat"><b>${quizSessionsThisWeek.length}</b><span>Quizzes done</span></div>
    <div class="stat"><b>${streakData.count || 0}🔥</b><span>Day streak</span></div>
    <div class="stat"><b>${activeDays} / 7</b><span>Days active</span></div>
    <div class="stat"><b>${accNow != null ? accNow + '% ' + numSenseTrend : '—'}</b><span>Number sense ${accNow != null ? '· ' + estimations.length + ' guesses' : '(try the 🔎 estimation challenge)'}</span></div>
    <div class="stat"><b>${predictions.length}</b><span>Predictions made</span></div>
    <div class="stat"><b>${earnedBadges.size}</b><span>Badges earned</span></div>
    <div class="stat"><b>${solidifiedTopicIds.size}</b><span>🧠 Solidified (recall-proven)</span></div>
  </div>

  <h2>Day-by-day activity</h2>
  <div class="day-strip">${dayStrip}</div>
  <p style="font-size:10px; color:#64748b; margin:2px 0 0;">Topics studied per day (any lesson, quiz or review). ${reviewingCount ? reviewingCount + ' topic(s) are still being reviewed.' : ''}</p>

  <h2>What was covered this week</h2>
  ${coveredRows ? `<table><tr><th>Topic</th><th>Subject</th><th>Class</th><th>Chapter</th><th>Status</th><th>Last activity</th></tr>${coveredRows}</table>` : '<p style="color:#64748b;">Nothing studied this week yet — pick any topic to start.</p>'}

  <h2>📈 Coverage trends by topic</h2>
  <p style="font-size:11px; margin:2px 0 6px; color:#334155;">
    This week: <b>${masteredThisWeek.length} mastered</b> (${masteredLastWeek} last week) ·
    <b>${coveredCount} topics studied</b> (${activeLastWeek} last week) ·
    <b style="color:#b91c1c;">${stagnantCount} topic(s) untouched this week</b>.
    ↑ busier · ↓ quieter · 🛑 stagnant · 🆕 newly mastered.
  </p>
  ${trendRows ? `<table><tr><th>Topic</th><th>Where</th><th>This week</th><th>Last week</th><th>Trend</th><th>Status</th><th>Last active</th></tr>${trendRows}</table>${trendHidden ? `<p style="font-size:10px; color:#64748b;">Showing the 12 most active topics — ${trendTopics.length - 12} more in the full history.</p>` : ''}` : '<p style="color:#64748b;">No topic history yet — activity will appear here as topics are studied.</p>'}

  <h2>What was mastered this week</h2>
  ${masteredRows ? `<table><tr><th>Topic</th><th>Subject</th><th>Class</th><th>Chapter</th><th>Date</th></tr>${masteredRows}</table>` : '<p style="color:#64748b;">No lessons mastered this week yet — little by little, every day counts.</p>'}

  <h2>Activity by subject</h2>
  ${subjectRows ? `<table><tr><th>Subject</th><th>Lessons mastered</th></tr>${subjectRows}</table>` : '<p style="color:#64748b;">No activity logged this week.</p>'}

  <h2>🧭 Concept mastery</h2>
  <p style="font-size:11px; margin:2px 0 6px; color:#334155;">Topics grouped by concept — spot the family of ideas that's strong and the one that needs attention.</p>
  ${conceptRows ? `<table><tr><th>Concept</th><th>Mastered</th><th>Health</th></tr>${conceptRows}</table>` : '<p style="color:#64748b;">Study a few topics this week and concept insights appear here.</p>'}

  <h2 class="weak">⚠ Areas needing attention</h2>
  ${weakRows ? `<table><tr><th>Topic</th><th>Where</th><th>Status</th></tr>${weakRows}</table>` : '<p style="color:#059669;">No weak areas this week — keep it up! 🌟</p>'}

  <h2>🧠 Recurring misconceptions</h2>
  ${misconRows ? `<table><tr><th>Topic</th><th>This week</th><th>The misunderstanding</th></tr>${misconRows}</table><p style="font-size:10px; color:#64748b;">Shown when the same misconception is hit 2+ times in one week — the flashcard in the lesson corrects it.</p>` : '<p style="color:#64748b;">No recurring misconceptions this week — misunderstandings are being resolved. 🎉</p>'}

  <h2>🎯 Focus for next week</h2>
  ${focusRows ? `<table><tr><th>Topic</th><th>Where</th><th>Suggested next step</th></tr>${focusRows}</table>` : '<p style="color:#64748b;">No focus topics — try something new next week. 🌱</p>'}

  <div class="sig-line"><div class="sig">Parent / Guardian</div><div class="sig">Teacher</div><div class="sig">Student</div></div>

  <div class="foot">Avyaan STEM — Interactive learning for Classes 1–10 · Share this report with parents or teachers</div>
</body>
</html>`;
}

function openWeeklyReport() {
  const html = buildWeeklyReportHtml();
  const w = window.open('', '_blank', 'width=860,height=1080');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { try { w.print(); } catch (e) {} }, 350);
}

// 📧 Email the weekly report. Two paths: a mailto: link (universal — works
// with the device's mail app) plus, when signed in with a real account, a
// backend queue that delivers the full styled report and remembers the
// subscription for future weeks.
function emailWeeklyReport() {
  const html = buildWeeklyReportHtml();
  const studentName = currentUser ? currentUser.name : 'Guest';
  const subject = `Avyaan Weekly Report — ${studentName} (${new Date().toLocaleDateString('en-IN')})`;
  // Plain-text digest for the mail client body (styles don't survive mailto).
  const plain = html
    .replace(/<style>[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1400);
  const mailto = 'mailto:?subject=' + encodeURIComponent(subject) +
    '&body=' + encodeURIComponent('Avyaan weekly progress report for ' + studentName +
      '\n\n' + plain + '\n\n— Generated by Avyaan STEM (smaraze.com)');
  // Fire-and-forget backend queue; only when we know the parent's address.
  queueWeeklyReportEmail(subject, html);
  window.location.href = mailto;
}

async function queueWeeklyReportEmail(subject, bodyHtml) {
  const user = JSON.parse(avyaanStorage.getItem('avyaan_user') || '{}');
  if (!user.id || user.isGuest) return;
  if (!window.AvyaanAPI || !AvyaanAPI.getToken()) return;
  const parentEmail = avyaanStorage.getItem('avyaan_parent_email') || user.email || '';
  if (!parentEmail) return;
  const report = await AvyaanAPI.createServerReport(user.id);
  const res = report && report.report_id ? await AvyaanAPI.queueReportEmail(report.report_id, parentEmail, subject) : null;
  if (res) avyaanStorage.setItem('avyaan_report_email_queued', String(Date.now()));
}

// Weekly-email subscription — "on" queues this week's report now and marks
// the account for future auto-queued reports.
function toggleWeeklyEmailSubscription() {
  const wasOn = avyaanStorage.getItem('avyaan_weekly_email_subscribed') === 'on';
  const nowOn = !wasOn;
  avyaanStorage.setItem('avyaan_weekly_email_subscribed', nowOn ? 'on' : 'off');
  if (nowOn) {
    queueWeeklyReportEmail(
      `Avyaan Weekly Report — ${currentUser ? currentUser.name : 'Guest'}`,
      buildWeeklyReportHtml()
    );
    alert('📧 Weekly reports on! This week\'s report is queued for ' +
      (avyaanStorage.getItem('avyaan_parent_email') || 'your registered email') + '.');
  }
  const btn = document.getElementById('weeklyEmailToggle');
  if (btn) btn.textContent = nowOn ? '✓ Weekly email ON' : '📧 Weekly email OFF';
}

// --------------------------------------------------------------------------
// Parent portal — a separate, grown-up view for the parent account. The
// child's app stays exactly as it is; the parent gets their own dashboard,
// report sharing, and (later) consent controls. Registering as a parent
// creates the child as the active learner and saves a family profile slot.
// --------------------------------------------------------------------------
function getParentProfile() {
  try { return JSON.parse(avyaanStorage.getItem('avyaan_parent_profile') || 'null'); }
  catch (e) { return null; }
}

function openParentDashboard() {
  renderParentDashboard();
  openModal('parentDashModal');
}

// Snapshot stats shared by the parent dashboard cards. `src` is either the
// live app (localStorage) or a saved family-profile snapshot.
function childStatsFrom(src) {
  const parseArr = (k) => { try { return new Set(JSON.parse(src[k] || '[]')); } catch (e) { return new Set(); } };
  const completed = parseArr('avyaan_completed_topics');
  const solidified = parseArr('avyaan_solidified_topics');
  const xp = parseInt(src['avyaan_user_xp'] || '0', 10) || 0;
  let streak = 0, level = { name: 'Explorer', icon: '🧭' };
  try { streak = (JSON.parse(src['avyaan_streak_data'] || '{}').count) || 0; } catch (e) {}
  try { level = getUserLevelForXP(xp); } catch (e) {}
  let name = '', grade = '';
  try { const u = JSON.parse(src['avyaan_user'] || '{}'); name = u.name || ''; grade = u.grade || ''; } catch (e) {}
  return { name, grade, mastered: completed.size, solidified: solidified.size, xp, streak, level, totalTopics: AVYAAN_DATA.topics.length };
}

async function renderParentDashboard() {
  const container = document.getElementById('parentDashContent');
  if (!container) return;

  const isLoggedIn = currentUser && !currentUser.isGuest;
  const isParent = isLoggedIn && currentUser.role === 'Parent';
  const isStudent = isLoggedIn && (currentUser.role === 'Student' || !currentUser.role);

  // Case 1: Logged in as Parent (authoritative child supervision)
  if (isParent && window.AvyaanAPI && AvyaanAPI.getToken()) {
    container.innerHTML = `
      <div style="text-align:center; padding:1.5rem 1rem;">
        <p style="color:var(--text-muted); font-size:0.9rem;">Loading linked children and academic reports...</p>
      </div>`;
    try {
      const childrenData = await AvyaanAPI.getLinkedChildren();
      const children = (childrenData && childrenData.children) ? childrenData.children : [];

      let childSelectorHtml = '';
      let summaryHtml = '';

      if (children.length === 0) {
        summaryHtml = `
          <div style="background:#f8fafc; border:1px dashed #cbd5e1; border-radius:12px; padding:1.5rem; text-align:center; margin:1rem 0;">
            <span style="font-size:2rem;">🧒</span>
            <h3 style="font-size:1.1rem; margin:0.4rem 0 0.2rem; color:var(--text-main);">No Child Account Linked Yet</h3>
            <p style="font-size:0.82rem; color:var(--text-muted); max-width:400px; margin:0 auto 1rem;">
              Ask your child to log into Avyaan, open their Parent View, and click <b>Generate Linking Code</b>.
            </p>
          </div>`;
      } else {
        const activeChildId = window._activeParentChildId || children[0].id;
        window._activeParentChildId = activeChildId;

        const summary = await AvyaanAPI.getChildSummary(activeChildId);

        childSelectorHtml = `
          <div style="display:flex; gap:0.5rem; overflow-x:auto; padding-bottom:0.5rem; margin-bottom:1rem;">
            ${children.map(ch => `
              <button class="btn btn-sm ${ch.id === activeChildId ? 'btn-primary' : ''}" style="border-radius:20px; padding:0.35rem 0.9rem; font-size:0.8rem;" onclick="window._activeParentChildId='${escapeHtml(ch.id)}'; renderParentDashboard();">
                ${escapeHtml(ch.name || 'Child')} (Class ${escapeHtml(ch.enrolled_class || 1)})
              </button>
            `).join('')}
          </div>`;

        if (summary && summary.status === 'success') {
          const ch = summary.child || {};
          const m = summary.metrics || {};
          const comp = m.mastered_in_class != null ? m.mastered_in_class : (summary.completed_lessons || 0);
          const tot = m.total_class_topics != null ? m.total_class_topics : (summary.total_topics_in_class || 1);
          const pct = m.class_completion_pct != null ? m.class_completion_pct : (Math.round((comp / tot) * 100));
          const childName = ch.name || summary.child_name || 'Child';
          const childClass = ch.enrolled_class || summary.enrolled_class || 1;
          const bandName = ch.band_name || summary.subscription_band || 'Free';
          const streak = m.streak_days != null ? m.streak_days : (summary.streak || 0);
          const quizAcc = m.quiz_accuracy_pct != null ? m.quiz_accuracy_pct : (summary.quiz_accuracy_percent || 0);
          const quizAtt = m.total_quiz_attempts != null ? m.total_quiz_attempts : (summary.quiz_attempts || 0);
          const studyTime = m.estimated_study_minutes != null ? m.estimated_study_minutes : (summary.estimated_learning_time_minutes || 0);
          const tips = summary.parent_tips || summary.tips || [];

          const subjectRows = Array.isArray(summary.subject_breakdown)
            ? summary.subject_breakdown
            : Object.entries(summary.subject_breakdown || {}).map(([subject, mastered]) => ({ subject, mastered, total: mastered, percentage: Math.min(100, mastered * 5) }));
          const subjBars = subjectRows.map(row => `
            <div style="margin-bottom:0.4rem;">
              <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--text-muted);">
                <span>${escapeHtml(row.subject || 'Subject')}</span>
                <span>${row.mastered || 0}/${row.total || 0} completed</span>
              </div>
              <div style="background:#e2e8f0; height:6px; border-radius:3px; overflow:hidden; margin-top:2px;">
                <div style="background:#2563eb; height:100%; width:${Math.min(100, row.percentage || 0)}%;"></div>
              </div>
            </div>
          `).join('');
          const weakHtml = (summary.weak_areas && summary.weak_areas.length)
            ? summary.weak_areas.map(w => `<li style="font-size:0.8rem; color:#b91c1c; margin-bottom:0.25rem;"><b>${escapeHtml(w.topic_title || w.title || w.topic_id || w.id || 'Topic')}</b> (Accuracy: ${escapeHtml(w.accuracy ?? w.accuracy_pct ?? 0)}%)</li>`).join('')
            : '<p style="font-size:0.8rem; color:#059669; margin:0;">✅ Strong grasp across all attempted concepts!</p>';

          const tipsHtml = tips.length
            ? tips.map(t => `<li style="font-size:0.8rem; color:#1e293b; margin-bottom:0.35rem;">${escapeHtml(t)}</li>`).join('')
            : '';

          summaryHtml = `
            <div style="background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:12px; padding:1.2rem; margin-bottom:1rem;">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.8rem;">
                <div>
                  <h3 style="margin:0; font-size:1.1rem; color:var(--text-main); font-weight:800;">${escapeHtml(childName)}</h3>
                  <p style="margin:0.2rem 0 0; font-size:0.78rem; color:var(--text-muted);">
                    Class ${escapeHtml(childClass)} · Plan: <b style="text-transform:uppercase; color:#2563eb;">${escapeHtml(bandName)}</b> · ${escapeHtml(streak)}🔥 day streak
                  </p>
                </div>
                <div style="text-align:right;">
                  <span style="font-size:1.2rem; font-weight:800; color:#2563eb;">${pct}%</span>
                  <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Class Mastery</div>
                </div>
              </div>

              <div style="background:#e2e8f0; height:8px; border-radius:4px; overflow:hidden; margin-bottom:1rem;">
                <div style="background:#2563eb; height:100%; width:${pct}%;"></div>
              </div>

              <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:0.6rem; margin-bottom:1rem;">
                <div style="background:#fff; border:1px solid var(--border-color); border-radius:8px; padding:0.6rem; text-align:center;">
                  <div style="font-size:1.1rem; font-weight:800; color:var(--text-main);">${comp}/${tot}</div>
                  <div style="font-size:0.7rem; color:var(--text-muted);">Lessons Finished</div>
                </div>
                <div style="background:#fff; border:1px solid var(--border-color); border-radius:8px; padding:0.6rem; text-align:center;">
                  <div style="font-size:1.1rem; font-weight:800; color:#059669;">${quizAcc}%</div>
                  <div style="font-size:0.7rem; color:var(--text-muted);">Quiz Accuracy (${quizAtt} attempts)</div>
                </div>
                <div style="background:#fff; border:1px solid var(--border-color); border-radius:8px; padding:0.6rem; text-align:center;">
                  <div style="font-size:1.1rem; font-weight:800; color:#ea580c;">${studyTime} min</div>
                  <div style="font-size:0.7rem; color:var(--text-muted);">Estimated Study Time</div>
                </div>
              </div>

              <div style="margin-top:1rem;">
                <h4 style="font-size:0.85rem; margin:0 0 0.5rem; color:var(--text-main);">Subject Progress</h4>
                ${subjBars}
              </div>

              <div style="margin-top:1rem; background:#fef2f2; border:1px solid #fecaca; border-radius:8px; padding:0.8rem;">
                <h4 style="font-size:0.82rem; margin:0 0 0.4rem; color:#991b1b;">🎯 Focus Areas & Recommended Revision</h4>
                <ul style="margin:0; padding-left:1.2rem;">${weakHtml}</ul>
              </div>

              ${tipsHtml ? `
              <div style="margin-top:0.8rem; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:0.8rem;">
                <h4 style="font-size:0.82rem; margin:0 0 0.4rem; color:#166534;">💡 Educator Tips for Class ${childClass}</h4>
                <ul style="margin:0; padding-left:1.2rem;">${tipsHtml}</ul>
              </div>` : ''}
            </div>
          `;
        } else {
          summaryHtml = `
            <div style="background:#fffbeb; border:1px solid #fcd34d; border-radius:12px; padding:1rem; margin-bottom:1rem;">
              <h3 style="font-size:0.95rem; margin:0 0 0.35rem; color:#92400e;">Report access is waiting for verification</h3>
              <p style="font-size:0.8rem; color:#78350f; margin:0;">${escapeHtml(summary?.detail || 'An independent parent/guardian verification is required before learner reports can be viewed.')}</p>
            </div>`;
        }
      }

      container.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:1rem;">
          <div style="display:flex; align-items:center; gap:0.7rem;">
            <span style="font-size:1.8rem;">👨‍👩‍👧</span>
            <div>
              <h2 style="font-size:1.25rem; font-weight:800; color:var(--text-main); margin:0;">Parent Portal</h2>
              <p style="font-size:0.8rem; color:var(--text-muted); margin:0.15rem 0 0;">Welcome, ${escapeHtml(currentUser.name)} · Parent-linked supervision</p>
            </div>
          </div>
        </div>

        ${childSelectorHtml}
        ${summaryHtml}

        <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:12px; padding:0.9rem 1rem; margin-top:1rem;">
          <h4 style="font-size:0.88rem; font-weight:700; margin:0 0 0.3rem; color:var(--text-main);">ðŸ§’ Create a learner profile</h4>
          <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
            <input type="text" id="parentChildNameInput" class="form-input" placeholder="First name or nickname" maxlength="80" style="max-width:220px;">
            <select id="parentChildClassInput" class="form-input" style="max-width:130px;"><option value="1">Class 1</option><option value="2">Class 2</option><option value="3">Class 3</option><option value="4">Class 4</option><option value="5">Class 5</option><option value="6">Class 6</option><option value="7">Class 7</option><option value="8">Class 8</option><option value="9">Class 9</option><option value="10">Class 10</option></select>
            <button class="btn btn-primary btn-sm" onclick="handleParentCreateChildSubmit()">Create profile</button>
          </div>
          <div id="parentCreateChildMsg" style="font-size:0.78rem; margin-top:0.4rem;"></div>
        </div>

        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:0.9rem 1rem; margin-top:1rem;">
          <h4 style="font-size:0.88rem; font-weight:700; margin:0 0 0.3rem; color:var(--text-main);">🔗 Link a Child with One-Time Code</h4>
          <p style="font-size:0.75rem; color:var(--text-muted); margin:0 0 0.6rem;">Enter the 6-character code generated on your child's device:</p>
          <div style="display:flex; gap:0.5rem;">
            <input type="text" id="parentLinkCodeInput" class="form-input" placeholder="e.g. AV-4892" style="text-transform:uppercase; font-weight:700; max-width:180px;" maxlength="10">
            <button class="btn btn-primary btn-sm" onclick="handleParentLinkChildSubmit()">Link Child</button>
          </div>
          <div id="parentLinkMsg" style="font-size:0.78rem; margin-top:0.4rem; display:none;"></div>
        </div>
      `;
      return;
    } catch (err) {
      console.error('Failed to load parent portal:', err);
    }
  }

  // Case 2: Logged in as Student (generate linking code)
  if (isStudent) {
    const liveSrc = collectProgressState();
    const live = childStatsFrom(liveSrc);
    container.innerHTML = `
      <div style="display:flex; align-items:center; gap:0.8rem; margin-bottom:1rem;">
        <span style="font-size:1.8rem;">👨‍👩‍👧</span>
        <div>
          <h2 style="font-size:1.25rem; font-weight:800; color:var(--text-main); margin:0;">Parent & Guardian Connection</h2>
          <p style="font-size:0.8rem; color:var(--text-muted); margin:0.15rem 0 0;">
            Share your learning progress with your parent safely.
          </p>
        </div>
      </div>

      <div style="background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:12px; padding:1.2rem; margin-bottom:1rem;">
        <h3 style="font-size:1rem; font-weight:700; margin:0 0 0.4rem; color:var(--text-main);">Generate Parent Linking Code</h3>
        <p style="font-size:0.8rem; color:var(--text-muted); line-height:1.4; margin:0 0 1rem;">
          Generate a secure, one-time 6-character code valid for 15 minutes. Your parent enters this in their Avyaan Parent Portal to view your curriculum reports.
        </p>

        <div id="studentLinkingCodeBox" style="text-align:center; padding:1rem; background:#fff; border:2px dashed #cbd5e1; border-radius:8px; margin-bottom:1rem;">
          <button class="btn btn-primary" onclick="handleGenerateLinkingCode()">🔑 Generate 15-Minute Code</button>
        </div>

        <div style="display:flex; gap:0.9rem; font-size:0.8rem; color:var(--text-muted); border-top:1px solid var(--border-color); padding-top:0.8rem;">
          <span>Class: <b>${currentUser.grade}</b></span>
          <span>XP: <b>${live.xp}</b></span>
          <span>Topics Mastered: <b>${live.mastered}</b></span>
        </div>
      </div>
    `;
    return;
  }

  // Case 3: Guest / Not Logged In
  container.innerHTML = `
    <div style="display:flex; align-items:center; gap:0.8rem; margin-bottom:1rem;">
      <span style="font-size:1.8rem;">👨‍👩‍👧</span>
      <div>
        <h2 style="font-size:1.25rem; font-weight:800; color:var(--text-main); margin:0;">Avyaan Parent Portal</h2>
        <p style="font-size:0.8rem; color:var(--text-muted); margin:0.15rem 0 0;">Supervise learning, review mastery, and support STEM curiosity.</p>
      </div>
    </div>
    <div style="background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:12px; padding:1.5rem; text-align:center;">
      <p style="font-size:0.9rem; color:var(--text-main); margin-bottom:1.2rem;">
        Log in or register with a <b>Parent</b> account to supervise your children, view aggregate weekly reports, and set screen-time controls.
      </p>
      <div style="display:flex; gap:0.6rem; justify-content:center;">
        <button class="btn btn-primary" onclick="closeModal('parentDashModal'); openLoginModal();">Log In</button>
        <button class="btn" onclick="closeModal('parentDashModal'); openLoginModal(); showAuthTab('register');">Create Parent Account</button>
      </div>
    </div>
  `;
}

async function handleGenerateLinkingCode() {
  const box = document.getElementById('studentLinkingCodeBox');
  if (!box) return;
  box.innerHTML = '<span style="color:var(--text-muted);">Generating secure code...</span>';
  const res = await AvyaanAPI.generateLinkingCode();
  if (res && res.code) {
    box.innerHTML = `
      <div style="font-size:0.8rem; color:#059669; font-weight:700; margin-bottom:0.4rem;">Code Generated Successfully!</div>
      <div style="font-size:2rem; font-weight:900; letter-spacing:4px; color:#2563eb; font-family:monospace; margin:0.3rem 0;">
        ${res.code}
      </div>
      <div style="font-size:0.75rem; color:var(--text-muted);">
        Expires in 15 minutes. Give this code to your parent.
      </div>
    `;
  } else {
    box.innerHTML = `
      <div style="color:#b91c1c; font-size:0.8rem; margin-bottom:0.5rem;">${escapeHtml((res && res.detail) || 'Failed to generate code.')}</div>
      <button class="btn btn-sm btn-primary" onclick="handleGenerateLinkingCode()">Try Again</button>
    `;
  }
}

async function handleParentCreateChildSubmit() {
  const name = document.getElementById('parentChildNameInput')?.value.trim();
  const level = Number(document.getElementById('parentChildClassInput')?.value || 1);
  const msg = document.getElementById('parentCreateChildMsg');
  if (!msg) return;
  if (!name) { msg.style.color = '#b91c1c'; msg.textContent = 'Enter a first name or nickname.'; return; }
  msg.style.color = 'var(--text-muted)'; msg.textContent = 'Creating secure learner profileâ€¦';
  const res = await AvyaanAPI.createChild(name, level);
  if (res && res.status === 'success') {
    msg.style.color = '#059669'; msg.textContent = 'Profile created. Opening learner switcherâ€¦';
    window._activeParentChildId = res.child?.id || null;
    setTimeout(() => renderParentDashboard(), 500);
  } else {
    msg.style.color = '#b91c1c'; msg.textContent = (res && res.detail) || 'Could not create profile. Please retry.';
  }
}

async function handleParentLinkChildSubmit() {
  const input = document.getElementById('parentLinkCodeInput');
  const msg = document.getElementById('parentLinkMsg');
  if (!input || !msg) return;
  const code = input.value.trim().toUpperCase();
  if (!code) {
    msg.style.display = 'block';
    msg.style.color = '#b91c1c';
    msg.textContent = 'Please enter a linking code.';
    return;
  }
  msg.style.display = 'block';
  msg.style.color = 'var(--text-muted)';
  msg.textContent = 'Verifying and establishing link...';

  const res = await AvyaanAPI.linkChild(code);
  if (res && res.status === 'success') {
    msg.style.color = '#059669';
    const linkedChild = res.child || {};
    msg.textContent = `✓ Linked with ${linkedChild.name || res.child_name || "child"} (Class ${linkedChild.enrolled_class || res.child_enrolled_class || "—"})!`;
    setTimeout(() => {
      renderParentDashboard();
    }, 1200);
  } else {
    msg.style.color = '#b91c1c';
    msg.textContent = (res && res.detail) || 'Failed to link child. Check the code and try again.';
  }
}

function openAdminDashboard() {
  renderAdminDashboard();
  openModal('adminDashModal');
}

async function renderAdminDashboard() {
  const container = document.getElementById('adminDashContent');
  if (!container) return;

  if (!currentUser || currentUser.role !== 'Admin') {
    container.innerHTML = `
      <div style="text-align:center; padding:2rem;">
        <span style="font-size:2.5rem;">🔒</span>
        <h3 style="color:#b91c1c; margin:0.6rem 0;">Access Denied</h3>
        <p style="color:var(--text-muted); font-size:0.85rem;">This portal requires verified administrative authorization.</p>
        <button class="btn btn-sm" onclick="closeModal('adminDashModal')">Close</button>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div style="text-align:center; padding:2rem;">
      <p style="color:var(--text-muted);">Fetching server telemetry, financial metrics, and DPDP compliance logs...</p>
    </div>`;

  const data = await AvyaanAPI.getAdminMetrics();
  if (!data || data.status !== 'success') {
    container.innerHTML = `
      <div style="text-align:center; padding:2rem;">
        <h3 style="color:#b91c1c;">Telemetry Offline</h3>
        <p style="color:var(--text-muted); font-size:0.85rem;">${escapeHtml((data && data.detail) || 'Failed to retrieve administrative metrics.')}</p>
        <button class="btn btn-sm" onclick="renderAdminDashboard()">Retry</button>
      </div>`;
    return;
  }

  const u = data.users || {};
  const roles = u.by_role || {};
  const classes = u.by_class || {};
  const activeToday = u.active_today || 0;
  const learn = data.learning || {};
  const fin = data.payments || {};
  const statusCounts = fin.status_counts || {};
  const dpdp = data.governance_and_safety || {};
  const ops = data.operational_health || {};

  const classBars = Object.entries(classes).map(([c, count]) => `
    <div style="display:flex; align-items:center; gap:0.5rem; font-size:0.75rem; margin-bottom:0.25rem;">
      <span style="width:50px; font-weight:600;">Class ${c}</span>
      <div style="flex:1; background:#e2e8f0; height:8px; border-radius:4px; overflow:hidden;">
        <div style="background:#2563eb; height:100%; width:${Math.min(100, count * 10)}%;"></div>
      </div>
      <span style="width:30px; text-align:right; font-weight:700;">${count}</span>
    </div>
  `).join('');

  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.2rem; border-bottom:1px solid var(--border-color); padding-bottom:0.8rem;">
      <div>
        <h2 style="font-size:1.3rem; font-weight:800; color:var(--text-main); margin:0;">🛡️ Avyaan Administration & Telemetry</h2>
        <p style="font-size:0.78rem; color:var(--text-muted); margin:0.2rem 0 0;">Real-time governance, revenue audit, and DPDP telemetry</p>
      </div>
      <button class="btn btn-sm" onclick="renderAdminDashboard()">🔄 Refresh</button>
    </div>

    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:0.7rem; margin-bottom:1.2rem;">
      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:0.8rem; text-align:center;">
        <div style="font-size:1.4rem; font-weight:800; color:#2563eb;">${u.total || 0}</div>
        <div style="font-size:0.72rem; color:var(--text-muted); text-transform:uppercase;">Total Users</div>
      </div>
      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:0.8rem; text-align:center;">
        <div style="font-size:1.4rem; font-weight:800; color:#059669;">₹${fin.total_revenue_inr || 0}</div>
        <div style="font-size:0.72rem; color:var(--text-muted); text-transform:uppercase;">Net Revenue</div>
      </div>
      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:0.8rem; text-align:center;">
        <div style="font-size:1.4rem; font-weight:800; color:#7c3aed;">${learn.global_quiz_accuracy_pct || 0}%</div>
        <div style="font-size:0.72rem; color:var(--text-muted); text-transform:uppercase;">Avg Quiz Accuracy</div>
      </div>
      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:0.8rem; text-align:center;">
        <div style="font-size:1.4rem; font-weight:800; color:#d97706;">${activeToday}</div>
        <div style="font-size:0.72rem; color:var(--text-muted); text-transform:uppercase;">Active Today</div>
      </div>
    </div>

    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:1rem; margin-bottom:1.2rem;">
      <div style="background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:12px; padding:1rem;">
        <h4 style="font-size:0.88rem; font-weight:700; margin:0 0 0.6rem; color:var(--text-main);">Learners by Class Level</h4>
        ${classBars}
        <div style="margin-top:0.8rem; pt:0.6rem; border-top:1px solid var(--border-color); font-size:0.75rem; color:var(--text-muted); display:flex; gap:0.8rem; flex-wrap:wrap;">
          <span>Students: <b>${roles.Student || 0}</b></span>
          <span>Parents: <b>${roles.Parent || 0}</b></span>
          <span>Teachers: <b>${roles.Teacher || 0}</b></span>
          <span>Admins: <b>${roles.Admin || 0}</b></span>
        </div>
      </div>

      <div style="background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:12px; padding:1rem;">
        <h4 style="font-size:0.88rem; font-weight:700; margin:0 0 0.6rem; color:var(--text-main);">Razorpay Order Reconciliation</h4>
        <div style="display:flex; flex-direction:column; gap:0.4rem; font-size:0.78rem;">
          <div style="display:flex; justify-content:space-between; padding:0.3rem 0; border-bottom:1px solid var(--border-color);">
            <span>Net Settlements:</span>
            <b style="color:#059669;">${statusCounts.paid || 0} (₹${fin.total_revenue_inr || 0})</b>
          </div>
          <div style="display:flex; justify-content:space-between; padding:0.3rem 0; border-bottom:1px solid var(--border-color);">
            <span>Pending Orders:</span>
            <b style="color:#d97706;">${statusCounts.created || 0}</b>
          </div>
          <div style="display:flex; justify-content:space-between; padding:0.3rem 0; border-bottom:1px solid var(--border-color);">
            <span>Failed Orders:</span>
            <b style="color:#b91c1c;">${statusCounts.failed || 0}</b>
          </div>
          <div style="display:flex; justify-content:space-between; padding:0.3rem 0; border-bottom:1px solid var(--border-color);">
            <span>Refunds Processed:</span>
            <b>${statusCounts.refunded || 0} (₹${fin.refunded_revenue_inr || 0})</b>
          </div>
          <div style="display:flex; justify-content:space-between; padding:0.3rem 0;">
            <span>Active Paid Subscriptions:</span>
            <b style="color:#2563eb;">${u.by_subscription && u.by_subscription.active_paid || 0}</b>
          </div>
        </div>
      </div>
    </div>

    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:1rem;">
      <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:12px; padding:1rem;">
        <h4 style="font-size:0.88rem; font-weight:700; margin:0 0 0.5rem; color:#166534;">🔒 DPDP & Parental Governance</h4>
        <div style="font-size:0.78rem; color:#14532d; display:flex; flex-direction:column; gap:0.3rem;">
          <div>Parent-Child Links: <b>${dpdp.parent_child_links || 0}</b></div>
          <div>Parental Consent Records: <b>${dpdp.total_consent_records || 0}</b></div>
          <div>Independently Verified Minors: <b>${dpdp.parent_verified || 0}</b></div>
          <div>Under-18 Learner Declarations: <b>${dpdp.under_18_declared || 0}</b></div>
        </div>
      </div>

      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:1rem;">
        <h4 style="font-size:0.88rem; font-weight:700; margin:0 0 0.5rem; color:var(--text-main);">⚙️ Operational & Database Health</h4>
        <div style="font-size:0.78rem; color:var(--text-muted); display:flex; flex-direction:column; gap:0.3rem;">
          <div>Database: <b style="color:#059669;">${ops.database_file || 'avyaan.db'}</b> (${ops.wal_mode ? 'WAL Mode' : 'Online'})</div>
          <div>Database Size: <b>${ops.database_size_mb || 0} MB</b></div>
          <div>Content Registry: <b>713 Lessons (Classes 1–10)</b></div>
        </div>
      </div>
    </div>
  `;
}

// Share the weekly report as a time-limited link (backend) or a downloadable
// HTML file (offline fallback) — the same artifact either way.
async function shareWeeklyReport() {
  const html = buildWeeklyReportHtml();
  const studentName = currentUser ? currentUser.name : 'Guest';
  const title = `Avyaan Weekly Report — ${studentName}`;
  const user = JSON.parse(avyaanStorage.getItem('avyaan_user') || '{}');
  if (user.id && !user.isGuest && window.AvyaanAPI && AvyaanAPI.getToken()) {
    const report = await AvyaanAPI.createServerReport(user.id);
    const res = report && report.report_id ? await AvyaanAPI.createReportShare(report.report_id, title) : null;
    if (res && res.url) {
      const url = location.origin + '/api' + res.url;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try { await navigator.clipboard.writeText(url); } catch (e) { /* clipboard blocked */ }
      }
      alert('🔗 Report link created and copied!\n\n' + url +
        '\n\nThis link expires in 30 days. Anyone with the link can view this week\'s report.');
      return;
    }
  }
  // Offline fallback: download the report as a self-contained HTML file.
  try {
    const blob = new Blob([html], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'Avyaan-Weekly-Report.html';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    alert('📄 Report downloaded — share the file with anyone.');
  } catch (e) {
    alert('Could not share the report here — use the print window instead.');
  }
}

// --------------------------------------------------------------------------
// Healthy screen time — a gentle, parent-controlled cap. Active learning time
// (a lesson or review modal open, page visible) accumulates in 30 s ticks;
// when today's total hits the cap (default 20 min), a break screen appears
// with today's learning summary and the choice to stop or take 5 more minutes.
// The cap lives in the Parent View, so it's a grown-up setting, not a child one.
// --------------------------------------------------------------------------
const SCREEN_TIME_DEFAULT_MIN = 20;
const SCREEN_TIME_TICK_SEC = 30;

function getScreenTimeCapMin() {
  const v = parseInt(avyaanStorage.getItem('avyaan_screen_time_min') || '', 10);
  return v > 0 ? v : SCREEN_TIME_DEFAULT_MIN;
}

function screenTimeDayKey() { return new Date().toISOString().slice(0, 10); }

function getTodayScreenSeconds() {
  try {
    const d = JSON.parse(avyaanStorage.getItem('avyaan_screen_time_usage') || '{}');
    return d.date === screenTimeDayKey() ? (d.seconds || 0) : 0;
  } catch (e) { return 0; }
}

function addScreenSeconds(sec) {
  let d = {};
  try { d = JSON.parse(avyaanStorage.getItem('avyaan_screen_time_usage') || '{}'); } catch (e) {}
  const date = screenTimeDayKey();
  const seconds = (d.date === date ? (d.seconds || 0) : 0) + sec;
  avyaanStorage.setItem('avyaan_screen_time_usage', JSON.stringify({ date: date, seconds: seconds }));
  if (seconds >= getScreenTimeCapMin() * 60 && !sessionStorage.getItem('avyaan_break_shown_today')) {
    sessionStorage.setItem('avyaan_break_shown_today', '1');
    showBreakScreen();
  }
  return seconds;
}

function showBreakScreen() {
  const log = getActivityLog().filter(a => {
    try { return new Date(a.ts).toISOString().slice(0, 10) === screenTimeDayKey(); } catch (e) { return false; }
  });
  const topicsToday = new Set(log.map(a => a.topicId).filter(Boolean)).size;
  const masteredToday = log.filter(a => a.type === 'mastered').length;
  const minutes = Math.round(getTodayScreenSeconds() / 60);
  const container = document.getElementById('breakContent');
  if (!container) return;
  container.innerHTML = `
    <div style="text-align:center; padding:0.6rem 0;">
      <div style="font-size:3rem;">🌿</div>
      <h2 style="font-size:1.2rem; font-weight:800; color:var(--text-main); margin:0.4rem 0;">Time for a break!</h2>
      <p style="font-size:0.85rem; color:var(--text-muted); margin:0.2rem 0 0.9rem;">You learned for ${minutes} minutes today — that's a great session. Your brain grows when you rest. 🧠✨</p>
      <div style="display:flex; gap:0.6rem; justify-content:center; margin-bottom:1rem;">
        <div style="background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:10px; padding:0.5rem 0.9rem;"><b style="display:block; font-size:1.1rem; color:#1d4ed8;">${topicsToday}</b><span style="font-size:0.68rem; color:var(--text-dim);">topics today</span></div>
        <div style="background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:10px; padding:0.5rem 0.9rem;"><b style="display:block; font-size:1.1rem; color:#059669;">${masteredToday}</b><span style="font-size:0.68rem; color:var(--text-dim);">mastered</span></div>
      </div>
      <div style="display:flex; gap:0.6rem; justify-content:center;">
        <button class="btn btn-primary" style="font-size:0.85rem; padding:0.5rem 1.2rem;" onclick="breakScreenDone(false)">🏏 Take a break</button>
        <button class="btn" style="font-size:0.85rem; padding:0.5rem 1.2rem;" onclick="breakScreenDone(true)">⏱ 5 more minutes</button>
      </div>
      <p style="font-size:0.68rem; color:var(--text-dim); margin-top:0.8rem;">Limit set by your parent · ${getScreenTimeCapMin()} min/day</p>
    </div>
  `;
  openModal('breakModal');
}

function breakScreenDone(extend) {
  closeModal('breakModal');
  if (extend) {
    // Credit 5 more minutes: rewind today's usage so the next cap hit re-triggers.
    avyaanStorage.setItem('avyaan_screen_time_usage', JSON.stringify({
      date: screenTimeDayKey(), seconds: Math.max(0, getTodayScreenSeconds() - 5 * 60)
    }));
    sessionStorage.removeItem('avyaan_break_shown_today');
  } else {
    // End the sitting: close any open lesson/review and the daily session.
    closeModal('detailModal');
    closeModal('reviewModal');
    try { if (typeof endDailySession === 'function') endDailySession(); } catch (e) {}
    if (typeof dailySession !== 'undefined' && dailySession) dailySession = null;
  }
}

function setScreenTimeCap(min) {
  avyaanStorage.setItem('avyaan_screen_time_min', String(min));
  const lbl = document.getElementById('screenTimeCapLabel');
  if (lbl) lbl.textContent = min + ' minutes/day';
}

// Timer: ticks only while a lesson/review modal is actually open and the tab
// is visible — time in the app, not time the tab sits in the background.
setInterval(() => {
  const open = ['detailModal', 'reviewModal'].some(id => {
    const el = document.getElementById(id);
    return el && el.classList.contains('active');
  });
  if (open && document.visibilityState === 'visible') addScreenSeconds(SCREEN_TIME_TICK_SEC);
}, SCREEN_TIME_TICK_SEC * 1000);

// --------------------------------------------------------------------------
// Exam-ready countdown — pick a subject + exam date, get a day-by-day plan
// built from the same data the app already tracks (mastered, weak, due).
// New topics are front-loaded; the last days before the exam are review-heavy,
// and "Exam mode" runs a timed mixed quiz over the whole plan.
// --------------------------------------------------------------------------
function getExamPlan() {
  try { return JSON.parse(avyaanStorage.getItem('avyaan_exam_plan') || 'null'); }
  catch (e) { return null; }
}

function examSubjectsForGrade() {
  return (subjectsForGrade(currentUser && currentUser.grade) || []).filter(s => s !== 'Mathematics' || true);
}

function renderExamPlan() {
  const container = document.getElementById('examPlanContent');
  if (!container) return;
  const plan = getExamPlan();
  if (!plan) {
    const subs = subjectsForGrade(currentUser && currentUser.grade) || ['Mathematics', 'Science', 'Computer Science & AI', 'Earth & Space'];
    const today = new Date();
    const defaultDate = new Date(today.getTime() + 30 * 86400000).toISOString().slice(0, 10);
    container.innerHTML = `
      <h2 style="font-size:1.2rem; font-weight:800; color:var(--text-main); margin:0 0 0.2rem;">🎯 My Exams</h2>
      <p style="font-size:0.82rem; color:var(--text-muted); margin:0 0 1rem;">Pick a subject and exam date — Avyaan builds a day-by-day plan: new topics first, weak topics reviewed, and a timed exam-mode quiz near the end.</p>
      <div class="form-group">
        <label for="examNameInput">Exam name</label>
        <input id="examNameInput" class="form-input" placeholder="e.g. Maths Term 1" value="">
      </div>
      <div class="form-group">
        <label for="examSubjectSelect">Subject</label>
        <select id="examSubjectSelect" class="form-input" style="cursor:pointer;">
          ${subs.map(s => `<option value="${s}">${s}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label for="examDateInput">Exam date</label>
        <input type="date" id="examDateInput" class="form-input" value="${defaultDate}">
      </div>
      <button class="btn btn-primary" style="width:100%; justify-content:center; font-weight:800; margin-top:0.4rem;" onclick="createExamPlan()">📅 Build my plan</button>
    `;
    return;
  }
  const todayIdx = Math.min(plan.days.length - 1, Math.max(0, Math.floor((Date.now() - plan.createdAt) / 86400000)));
  const todayDay = plan.days[todayIdx];
  const todayTopics = todayDay.topicIds.map(id => AVYAAN_DATA.topics.find(t => t.id === id)).filter(Boolean);
  const dateStr = new Date(plan.examDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const dayList = plan.days.map((d, i) => {
    const ds = new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    const n = d.topicIds.length;
    return `<div style="display:flex; justify-content:space-between; align-items:center; padding:0.35rem 0.5rem; border-radius:8px; ${i === todayIdx ? 'background:#eff6ff; border:1px solid #bfdbfe;' : 'border:1px solid transparent;'}">
      <span style="font-size:0.78rem; ${i === todayIdx ? 'color:#1d4ed8; font-weight:800;' : 'color:var(--text-muted);'}">Day ${d.day} · ${ds}${i === todayIdx ? ' · TODAY' : ''}</span>
      <span style="font-size:0.72rem; color:var(--text-dim);">${n} topic${n === 1 ? '' : 's'}</span>
    </div>`;
  }).join('');
  container.innerHTML = `
    <div style="display:flex; align-items:center; gap:0.8rem; margin-bottom:0.8rem;">
      <span style="font-size:1.8rem;">🎯</span>
      <div style="flex:1;">
        <h2 style="font-size:1.2rem; font-weight:800; color:var(--text-main); margin:0;">${escapeHtml(plan.name || 'Exam plan')}</h2>
        <p style="font-size:0.8rem; color:var(--text-muted); margin:0.15rem 0 0;">${plan.subject} · Class ${plan.classLevel} · exam ${dateStr} · ${plan.days.length} days</p>
      </div>
      <button class="btn" style="font-size:0.7rem; padding:0.3rem 0.6rem;" onclick="clearExamPlan(); renderExamPlan()">✕ New plan</button>
    </div>
    <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:10px; padding:0.7rem 0.9rem; margin-bottom:0.8rem;">
      <div style="font-size:0.8rem; color:#1e3a8a; font-weight:700;">Day ${todayDay.day} — ${todayTopics.map(t => `${t.emoji} ${t.title}`).join(' · ') || 'rest day — review anything from the plan'}</div>
      <div style="display:flex; gap:0.5rem; margin-top:0.6rem;">
        <button class="btn btn-primary" style="font-size:0.78rem; padding:0.4rem 0.9rem;" onclick="studyTodayTopics()">📖 Study today</button>
        <button class="btn" style="font-size:0.78rem; padding:0.4rem 0.9rem;" onclick="startExamMode()">⏱ Exam mode quiz</button>
      </div>
    </div>
    <div style="max-height:260px; overflow-y:auto;">${dayList}</div>
  `;
}

function createExamPlan() {
  const name = (document.getElementById('examNameInput').value || '').trim() || 'Exam plan';
  const subject = document.getElementById('examSubjectSelect').value;
  const examDate = new Date(document.getElementById('examDateInput').value + 'T12:00:00');
  if (isNaN(examDate.getTime())) { alert('Please pick an exam date.'); return; }
  if (examDate.getTime() < Date.now()) { alert('The exam date must be in the future.'); return; }
  const grade = currentUser && currentUser.grade ? currentUser.grade : 1;
  // Resolve display subjects to underlying data subjects (Science → P/C/B).
  const subjects = subject === 'Science' ? ['Physics', 'Chemistry', 'Biology'] : [subject];
  const mastered = new Set(completedTopicIds);
  const weakIds = new Set();
  try {
    const assessments = JSON.parse(avyaanStorage.getItem('avyaan_self_assessments') || '{}');
    Object.entries(assessments).forEach(([id, rec]) => { if (rec && (rec.rating === 'no' || rec.rating === 'almost')) weakIds.add(id); });
  } catch (e) {}
  const dueIds = new Set(getTopicsDueForReview());
  const result = buildExamPlan(AVYAAN_DATA.topics, {
    classLevel: grade, subjects: subjects, examDate: examDate.getTime(),
    mastered: mastered, weakIds: weakIds, dueIds: dueIds, dailyBudget: 3
  });
  if (result.totalTopics === 0) { alert('No topics found for that subject and class — try another subject.'); return; }
  const plan = { name, subject, classLevel: grade, examDate: examDate.getTime(), createdAt: Date.now(), days: result.days };
  avyaanStorage.setItem('avyaan_exam_plan', JSON.stringify(plan));
  renderExamPlan();
  alert(`🎯 ${name} plan built — ${result.days.length} days, ${result.newCount} new + ${result.weakCount} weak + ${result.reviewCount} review topics.`);
}

function clearExamPlan() {
  avyaanStorage.removeItem('avyaan_exam_plan');
}

function studyTodayTopics() {
  const plan = getExamPlan();
  if (!plan) return;
  const todayIdx = Math.min(plan.days.length - 1, Math.max(0, Math.floor((Date.now() - plan.createdAt) / 86400000)));
  const first = plan.days[todayIdx].topicIds.map(id => AVYAAN_DATA.topics.find(t => t.id === id)).find(Boolean);
  if (first) { closeModal('examPlanModal'); openTopicDetail(first.id); }
}

function startExamMode() {
  const plan = getExamPlan();
  if (!plan) return;
  const planned = new Set(plan.days.flatMap(d => d.topicIds));
  const pool = AVYAAN_DATA.topics.filter(t => planned.has(t.id));
  if (!pool.length) { alert('No topics in the plan yet.'); return; }
  const questions = [];
  for (const t of pool) {
    for (const m of (t.mcqs || [])) {
      if (questions.length >= 15) break;
      questions.push({
        question: m.question, options: m.options, answer: m.answer,
        explanation: m.explanation, explanations: m.explanations || m.explanation,
        topicId: t.id, topicTitle: t.title
      });
    }
    if (questions.length >= 15) break;
  }
  if (questions.length < 4) { alert('Not enough quiz questions in the plan yet.'); return; }
  for (let i = questions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [questions[i], questions[j]] = [questions[j], questions[i]];
  }
  closeModal('examPlanModal');
  const examClass = Number(currentUser?.grade || currentUser?.enrolled_class || plan.classLevel || 1);
  startAggregateReview(
    { mode: 'exam', class_level: examClass, subject: plan.subject, topic_ids: pool.map(topic => topic.id) },
    questions,
    `🎯 Exam Mode — ${plan.subject}`,
    null,
    true,
    10 * 60,
  );
}

// Compact countdown card for the curated landing.
function examPlanCard() {
  const plan = getExamPlan();
  if (!plan) return '';
  const todayIdx = Math.min(plan.days.length - 1, Math.max(0, Math.floor((Date.now() - plan.createdAt) / 86400000)));
  const daysLeft = Math.max(0, plan.days.length - todayIdx - 1);
  const todays = plan.days[todayIdx].topicIds.map(id => AVYAAN_DATA.topics.find(t => t.id === id)).filter(Boolean);
  const dateStr = new Date(plan.examDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return `
    <div class="exam-plan-card" onclick="openModal('examPlanModal')" style="cursor:pointer;">
      <div style="display:flex; align-items:center; gap:0.8rem; flex-wrap:wrap;">
        <span style="font-size:1.7rem;">🎯</span>
        <div style="flex:1; min-width:200px;">
          <div style="font-weight:800; color:var(--text-main);">${escapeHtml(plan.name || 'Exam plan')} · ${escapeHtml(plan.subject || '')}</div>
          <div style="font-size:0.78rem; color:var(--text-muted);">Exam ${dateStr} · ${daysLeft === 0 ? 'today or soon!' : daysLeft + ' day' + (daysLeft === 1 ? '' : 's') + ' left'} · Day ${todayIdx + 1}</div>
        </div>
        <div style="font-size:0.82rem; color:#1d4ed8; font-weight:700;">${todays.length ? todays.map(t => t.emoji + ' ' + t.title).join(' · ') : 'Rest day'}</div>
        <span class="btn btn-primary" style="font-size:0.78rem; padding:0.4rem 0.9rem;">Study →</span>
      </div>
    </div>
  `;
}

// --------------------------------------------------------------------------
// Privacy & consent (DPDP) — plain-language control of what the app stores.
// Local controls always work; when signed in with a real account and the
// backend is reachable, consent choices also sync to the consent service.
// --------------------------------------------------------------------------
const PRIVACY_KEYS = [
  ['avyaan_user', 'Account (name, class, email)'],
  ['avyaan_xp', 'XP and level'],
  ['avyaan_streak_data', 'Daily streak'],
  ['avyaan_completed_topics', 'Lessons mastered'],
  ['avyaan_solidified_topics', 'Recall-proven lessons'],
  ['avyaan_self_assessments', 'Self-ratings ("I get it / not yet")'],
  ['avyaan_review_queue', 'Spaced-review schedule'],
  ['avyaan_activity_log', 'Study history (what was opened when)'],
  ['avyaan_misconceptions', 'Misconception coaching log'],
  ['avyaan_quiz_sessions', 'Quiz scores'],
  ['avyaan_estimations', 'Number-sense guesses'],
  ['avyaan_screen_time_usage', 'Daily screen-time total'],
  ['avyaan_daily_challenge', 'Daily challenge state'],
  ['avyaan_family_profiles', 'Saved child profiles']
];

async function renderPrivacyPanel() {
  const container = document.getElementById('privacyContent');
  if (!container) return;
  const user = JSON.parse(avyaanStorage.getItem('avyaan_user') || '{}');
  const safeUserName = escapeHtml(user.name || 'Guest');
  const keysFound = PRIVACY_KEYS.filter(([k]) => avyaanStorage.getItem(k) !== null);
  const parent = getParentProfile();

  // Best-effort backend consent status (signed in only).
  let backendLine = '<p style="font-size:0.75rem; color:var(--text-muted);">Stored on this device only (no account linked yet).</p>';
  let analyticsOn = avyaanStorage.getItem('avyaan_consent_analytics') !== 'no';
  if (user.id && !user.isGuest && window.AvyaanAPI && AvyaanAPI.getToken()) {
    const st = await AvyaanAPI.getConsentStatus();
    if (st) {
      analyticsOn = !!st.layer_analytics;
       backendLine = `<p style="font-size:0.75rem; color:var(--text-muted);">Linked to your account · consent v${escapeHtml(st.consent_version || 'unknown')}${st.requires_reconsent ? ' · <b style="color:#b91c1c;">update needed</b>' : ''}${st.parent_verified ? ' · independently verified' : ' · independent parent verification pending'}</p>`;
    }
  }

  container.innerHTML = `
    <h2 style="font-size:1.2rem; font-weight:800; color:var(--text-main); margin:0 0 0.3rem;">🔒 Privacy & consent</h2>
    <p style="font-size:0.8rem; color:var(--text-muted); margin:0 0 1rem;">In plain language: Avyaan stores your child's learning progress so lessons, reviews and reports keep working. It never sells data, never shows ads, and you can erase everything here.</p>
    ${backendLine}

    <h3 style="font-size:0.9rem; font-weight:800; color:var(--text-main); margin:1rem 0 0.4rem;">What's stored on this device</h3>
    <div style="font-size:0.78rem; color:var(--text-muted);">${keysFound.map(([k, label]) => `<div style="padding:0.25rem 0;">• ${label}</div>`).join('')}</div>

    <h3 style="font-size:0.9rem; font-weight:800; color:var(--text-main); margin:1rem 0 0.4rem;">Consent choices</h3>
    <div style="background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:10px; padding:0.7rem 0.9rem; margin-bottom:0.5rem;">
      <label style="display:flex; align-items:center; gap:0.6rem; cursor:pointer;">
        <input type="checkbox" id="privacyAnalytics" ${analyticsOn ? 'checked' : ''} onchange="setConsentAnalytics(this.checked)" style="width:1rem; height:1rem;">
        <span style="font-size:0.83rem;"><b>Analytics</b> — anonymous usage patterns used to improve lessons (no names, no addresses).</span>
      </label>
    </div>
    <div style="background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:10px; padding:0.7rem 0.9rem;">
      <label style="display:flex; align-items:center; gap:0.6rem; cursor:pointer;">
        <input type="checkbox" id="privacyVoice" disabled style="width:1rem; height:1rem;">
        <span style="font-size:0.83rem;"><b>Voice</b> — not used. We have no audio features, so nothing is recorded.</span>
      </label>
    </div>

    <h3 style="font-size:0.9rem; font-weight:800; color:var(--text-main); margin:1.2rem 0 0.4rem;">Your rights (DPDP, 2023)</h3>
    <ul style="font-size:0.78rem; color:var(--text-muted); margin:0; padding-left:1.1rem; line-height:1.7;">
      <li><b>Access</b> — everything above is on this device; export it anytime with Backup.</li>
      <li><b>Withdraw</b> — turn off analytics below, or erase everything with the button.</li>
      <li><b>Parental consent</b> — children under 18 require a parent's consent (${parent ? 'linked to ' + escapeHtml(parent.name) : 'set up when you register as a parent'}).</li>
    </ul>

    <div style="display:flex; gap:0.6rem; flex-wrap:wrap; margin-top:1rem;">
      <button class="btn" style="font-size:0.8rem; padding:0.45rem 1rem;" onclick="exportProgress()">💾 Export my data</button>
      <button class="btn" style="font-size:0.8rem; padding:0.45rem 1rem; background:#fef2f2; border-color:#fecaca; color:#991b1b;" onclick="withdrawAllData()">🗑 Erase everything</button>
    </div>
    <p style="font-size:0.68rem; color:var(--text-dim); margin-top:0.9rem;">Erasing removes all Avyaan data from this device${user.id && !user.isGuest ? ' and requests erasure from our cloud' : ''}. This cannot be undone.</p>
  `;
}

async function setConsentAnalytics(on) {
  avyaanStorage.setItem('avyaan_consent_analytics', on ? 'yes' : 'no');
  const user = JSON.parse(avyaanStorage.getItem('avyaan_user') || '{}');
  if (user.id && !user.isGuest && window.AvyaanAPI && AvyaanAPI.getToken()) {
    const res = await AvyaanAPI.updateConsent(on ? { withdraw_analytics: false } : { withdraw_analytics: true });
    if (!res) {
      avyaanStorage.setItem('avyaan_consent_analytics', on ? 'no' : 'yes');
      alert('Consent could not be synced. Your device preference was kept, but cloud consent was not changed.');
    } else if (res.status === 'withdrawn') console.info('[Avyaan] analytics consent withdrawn');
  }
}

async function withdrawAllData() {
  if (!confirm('Erase ALL Avyaan data on this device? This removes progress, XP, reports and profiles. This cannot be undone.')) return;
  const user = JSON.parse(avyaanStorage.getItem('avyaan_user') || '{}');
  let cloudStatus = 'not requested';
  if (user.id && !user.isGuest && window.AvyaanAPI && AvyaanAPI.getToken()) {
    try {
      const res = await AvyaanAPI.updateConsent({ withdraw_all: true });
      cloudStatus = res ? (res.status || res.job_status || 'requested') : 'failed';
    } catch (e) { cloudStatus = 'failed'; }
  }
  // Clear only this account's active learner and account-scoped device data.
  // Other signed-in families on a shared browser are left untouched.
  if (window.avyaanStorage) {
    avyaanStorage.clearLearnerScope();
    avyaanStorage.clearAccountScope();
  }
  closeModal('privacyModal');
  const cloudMessage = cloudStatus === 'failed' ? ' Device data was cleared, but cloud deletion could not be confirmed. Please retry from a signed-in device.' : (cloudStatus === 'requested' || cloudStatus === 'running' || cloudStatus === 'pending' ? ' Cloud deletion was requested and may take a short time to complete.' : '');
  alert('Device data cleared.' + cloudMessage + ' The page will reload.');
  location.reload();
}

// Modal Helper Functions — with accessible focus management
let lastFocusedElement = null;

function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  lastFocusedElement = document.activeElement;
  el.classList.add('active');
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.removeAttribute('aria-hidden');

  // Render dynamic content for gamification modals
  if (id === 'achievementsModal') renderAchievementPanel();
  if (id === 'knowledgeMapModal') renderKnowledgeMap();
  if (id === 'coverageModal') renderCoverage();
  if (id === 'vocabModal') renderVocabPanel();
  if (id === 'pathModal') renderPathModal();
  if (id === 'dashboardModal') renderDashboard();
  if (id === 'parentDashModal') renderParentDashboard();
  if (id === 'privacyModal') renderPrivacyPanel();
  if (id === 'examPlanModal') renderExamPlan();

  // Give every dialog an accessible name, including dynamically rendered
  // panels whose heading is created only after the modal opens.
  const heading = el.querySelector('.modal-card h1, .modal-card h2, .modal-card h3');
  if (heading) {
    if (!heading.id) heading.id = id + 'Title';
    el.setAttribute('aria-labelledby', heading.id);
  }
  enhanceInteractiveSemantics(el);

  // Move focus into the modal (classList.add made it visible synchronously)
  const card = el.querySelector('.modal-card');
  const focusables = card ? card.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') : [];
  const target = focusables[0] || card || el;
  if (target && typeof target.focus === 'function') {
    try { target.focus({ preventScroll: true }); } catch (e) { try { target.focus(); } catch (_) {} }
  }
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  if (id === 'detailModal' || id === 'reviewModal' || id === 'boardPrepModal') stopReading();
  if (id === 'reviewModal') stopReviewTimer();
  el.classList.remove('active');
  // Guided daily session: closing the current session topic advances to the
  // next one (the dock's End button nulls the session first, so this only
  // fires for natural navigation).
  if (id === 'detailModal' && dailySession && currentActiveTopic &&
      dailySession.queue[dailySession.idx] && dailySession.queue[dailySession.idx].id === currentActiveTopic.id) {
    setTimeout(() => advanceDailySession(), 0);
  }
  // Move focus out BEFORE hiding, so aria-hidden never blocks a focused descendant
  if (lastFocusedElement && typeof lastFocusedElement.focus === 'function' && el.contains(document.activeElement)) {
    lastFocusedElement.focus();
  }
  el.setAttribute('aria-hidden', 'true');
}

function openLoginModal() {
  openModal('loginModal');
}

// Toggle mobile nav panel
function toggleMobileNav() {
  const panel = document.getElementById('mobileNavPanel');
  if (panel) {
    const open = panel.classList.toggle('active');
    panel.setAttribute('aria-hidden', String(!open));
    const trigger = document.querySelector('.nav-hamburger');
    if (trigger) trigger.setAttribute('aria-expanded', String(open));
  }
}

// Toggle user dropdown menu
function toggleUserMenu() {
  const dd = document.getElementById('userDropdown');
  if (dd) {
    const open = dd.classList.toggle('active');
    const trigger = document.getElementById('userMenuTrigger');
    if (trigger) trigger.setAttribute('aria-expanded', String(open));
    dd.setAttribute('aria-hidden', String(!open));
  }
}

// Close user dropdown when clicking outside
document.addEventListener('click', function(e) {
  const wrap = document.getElementById('userMenuTrigger');
  const dd = document.getElementById('userDropdown');
  if (dd && dd.classList.contains('active') && wrap && !wrap.contains(e.target)) {
    dd.classList.remove('active');
    if (wrap) wrap.setAttribute('aria-expanded', 'false');
    dd.setAttribute('aria-hidden', 'true');
  }
});

// Many learning surfaces are intentionally card-shaped, but a pointer-only
// div is inaccessible to keyboard and switch users. Promote those existing
// click targets to named, focusable button-like controls without changing
// their trusted inline action handlers.
function enhanceInteractiveSemantics(root = document) {
  const selector = '[onclick]';
  root.querySelectorAll(selector).forEach(el => {
    if (['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'SUMMARY'].includes(el.tagName)) return;
    if (el.classList.contains('user-dropdown') || el.classList.contains('modal-overlay')) return;
    el.setAttribute('data-keyboard-action', 'true');
    if (!el.hasAttribute('role')) el.setAttribute('role', 'button');
    if (!el.hasAttribute('tabindex') && el.getAttribute('aria-hidden') !== 'true') el.setAttribute('tabindex', '0');
  });
}

// ==========================================================================
// KEYBOARD NAVIGATION — Escape closes any modal, Tab is trapped inside,
// Arrow keys navigate lesson steps when the detail modal is open
// ==========================================================================
function getActiveModal() {
  const modals = document.querySelectorAll('.modal-overlay.active');
  return modals.length ? modals[modals.length - 1] : null;
}

let searchHighlightIdx = -1;

document.addEventListener('keydown', function(e) {
  const detailModal = document.getElementById('detailModal');
  const detailOpen = detailModal && detailModal.classList.contains('active');
  const activeModal = getActiveModal();
  const searchInput = document.getElementById('searchInput');

  // Search box keyboard UX: arrows move through results, Enter opens the
  // highlighted one, Escape clears and blurs.
  if (searchInput && document.activeElement === searchInput && !activeModal) {
    const cards = [...document.querySelectorAll('#cardsGrid [onclick*="openTopicDetail"]')];
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!cards.length) return;
      e.preventDefault();
      if (e.key === 'ArrowDown') searchHighlightIdx = Math.min(searchHighlightIdx + 1, cards.length - 1);
      else searchHighlightIdx = Math.max(searchHighlightIdx - 1, 0);
      cards.forEach((c, i) => {
        c.style.outline = i === searchHighlightIdx ? '3px solid var(--accent-primary)' : '';
        c.style.outlineOffset = i === searchHighlightIdx ? '2px' : '';
      });
      if (cards[searchHighlightIdx]) cards[searchHighlightIdx].scrollIntoView({ block: 'nearest' });
      return;
    }
    if (e.key === 'Enter') {
      if (searchHighlightIdx >= 0 && cards[searchHighlightIdx]) {
        e.preventDefault();
        cards[searchHighlightIdx].click();
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      searchInput.value = '';
      searchHighlightIdx = -1;
      renderGrid();
      searchInput.blur();
      return;
    }
  }

  // Don't interfere with typing or native control keyboard behavior.
  if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(e.target.tagName)) return;

  // Enter and Space activate promoted card controls just like a native button.
  if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('[data-keyboard-action]')) {
    e.preventDefault();
    e.target.closest('[data-keyboard-action]').click();
    return;
  }

  // '/' focuses the search box from anywhere (not while typing)
  if (e.key === '/' && !activeModal) {
    e.preventDefault();
    if (searchInput) { searchInput.focus(); searchInput.select(); }
    return;
  }

  // Escape: close the topmost open modal
  if (e.key === 'Escape') {
    if (activeModal) {
      e.preventDefault();
      closeModal(activeModal.id);
    }
    return;
  }

  // Focus trap: keep Tab inside the active modal
  if (e.key === 'Tab' && activeModal) {
    const focusables = activeModal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusables.length) {
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    return;
  }

  // Arrow keys: navigate lesson steps only when the detail modal is open
  if (detailOpen) {
    if (e.key === 'ArrowLeft' && currentActiveStep > 0) {
      e.preventDefault();
      switchLessonStep(currentActiveStep - 1);
    } else if (e.key === 'ArrowRight' && currentActiveStep < 5) {
      e.preventDefault();
      switchLessonStep(currentActiveStep + 1);
    }
  }
});

// ==========================================================================
// CRASH RESILIENCE — a runtime error never leaves a silent white screen.
// First uncaught error/unhandled rejection shows a friendly recovery panel
// with Reload, Restore-from-backup, and Keep-learning (dismiss) actions.
// ==========================================================================
let crashPanelShown = false;

function showCrashPanel(message) {
  if (crashPanelShown) return;
  crashPanelShown = true;
  try {
    const msg = String((message || 'Something went wrong.') + '').slice(0, 200);
    const div = document.createElement('div');
    div.id = 'crashPanel';
    div.setAttribute('role', 'alertdialog');
    div.setAttribute('aria-modal', 'true');
    div.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,0.55);display:flex;align-items:center;justify-content:center;padding:1rem;';
    div.innerHTML = `
      <div style="background:#fff;border-radius:16px;max-width:420px;width:100%;padding:1.5rem;box-shadow:0 20px 50px rgba(0,0,0,0.3);font-family:Inter,system-ui,sans-serif;">
        <div style="font-size:1.3rem;font-weight:800;color:#1e293b;margin-bottom:0.4rem;">😅 Oops — something went wrong</div>
        <p style="margin:0 0 1rem;font-size:0.9rem;color:#475569;line-height:1.5;">
          A small hiccup interrupted the lesson. Your progress is saved on this device.
          <span style="display:block;margin-top:0.5rem;font-size:0.75rem;color:#94a3b8;word-break:break-word;">${msg.replace(/[<>]/g, c => c === '<' ? '&lt;' : '&gt;')}</span>
        </p>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
          <button class="btn" style="flex:1;background:#2563eb;border-color:#2563eb;color:#fff;font-weight:700;" onclick="location.reload()">🔄 Reload</button>
          <button class="btn" style="flex:1;background:#f1f5f9;border-color:#cbd5e1;color:#334155;font-weight:700;" onclick="document.getElementById('crashPanel').remove();crashPanelShown=false;importProgress()">💾 Restore backup</button>
          <button class="btn" style="flex:1;background:#f8fafc;border-color:#e2e8f0;color:#64748b;font-weight:700;" onclick="document.getElementById('crashPanel').remove();crashPanelShown=false">Continue</button>
        </div>
      </div>`;
    document.body.appendChild(div);
    const btn = div.querySelector('button');
    if (btn) btn.focus();
  } catch (e) { /* the panel itself must never throw */ }
}

window.addEventListener('error', function (e) {
  showCrashPanel(e && e.message ? e.message : 'A script error occurred.');
});
window.addEventListener('unhandledrejection', function (e) {
  const r = e && e.reason;
  showCrashPanel(r && r.message ? r.message : 'An asynchronous task failed.');
});
