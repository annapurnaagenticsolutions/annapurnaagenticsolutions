/* ==========================================================================
   Avyaan app core — pure, dependency-free logic.

   Shared by the browser app (classic script loaded BEFORE app.js) and the
   node unit-test suite (tools/test_app_logic.js). Keeping this file free of
   DOM/localStorage means the logic can be tested without a browser and
   reused wherever needed.

   Everything here is a global on window (browser) / globalThis (node), plus
   a module.exports guard for `require` in tests.
   ========================================================================== */
(function (global) {
  'use strict';

  // Common kid-style misspellings, corrected before scoring so search still
  // finds the lesson ('fration' -> fraction, 'angel' -> angle).
  global.SEARCH_ALIASES = {
    'fration': 'fraction', 'fractons': 'fraction',
    'angel': 'angle', 'angels': 'angle', 'tringle': 'triangle',
    'trignometry': 'trigonometry', 'eqation': 'equation', 'equtions': 'equation',
    'probalility': 'probability', 'probabillity': 'probability',
    'geomatry': 'geometry', 'geometri': 'geometry', 'perimiter': 'perimeter',
    'diametre': 'diameter',
    'fiziks': 'physics', 'chemestry': 'chemistry', 'chemitry': 'chemistry',
    'biologee': 'biology', 'elektricity': 'electricity', 'electrisity': 'electricity',
    'magnetisim': 'magnetism', 'graviy': 'gravity', 'gravety': 'gravity',
    'multiplcation': 'multiplication', 'substraction': 'subtraction',
    'devision': 'division', 'multaply': 'multiply', 'multyply': 'multiply',
    'dicimal': 'decimal', 'persentage': 'percentage', 'precentage': 'percentage',
    'symmitry': 'symmetry', 'symmetric': 'symmetry', 'mirrow': 'mirror',
    'shadowz': 'shadow', 'sund': 'sound', 'vibration': 'vibrations',
    'momentom': 'momentum', 'gravitational': 'gravity', 'moleculs': 'molecules',
    'atoms': 'atom', 'planets': 'planet', 'coardinats': 'coordinates',
  };

  // Levenshtein edit distance (capped at 99 when strings differ by > 2 chars).
  global.editDistance = function (a, b) {
    if (Math.abs(a.length - b.length) > 2) return 99;
    const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) dp[i][0] = i;
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
      }
    }
    return dp[a.length][b.length];
  };

  // Typo-tolerant search score: exact substring wins, then word prefixes,
  // then a small Levenshtein score against title words (query >= 3 chars).
  global.scoreTopicSearch = function (t, query, haystack) {
    const title = (t.title || '').toLowerCase();
    const titleWords = title.split(/[^a-z0-9]+/).filter(w => w.length > 1);
    let score = 0;
    const tokens = query.split(/\s+/).map(tok => global.SEARCH_ALIASES[tok] || tok);
    for (const token of tokens) {
      if (!token) continue;
      if (haystack.includes(token)) { score += 100; continue; }
      if (titleWords.some(w => w.startsWith(token))) { score += 40; continue; }
      if (token.length >= 3 && titleWords.some(w => w.length >= 3 && global.editDistance(w, token) <= 2)) {
        score += 25;
        continue;
      }
    }
    return score;
  };

  // Estimation accuracy: 1 - relative error, clamped to [0, 1].
  global.estimateAccuracy = function (guess, targetValue) {
    if (!(targetValue > 0) || !isFinite(guess)) return null;
    return Math.max(0, 1 - Math.abs(guess - targetValue) / targetValue);
  };

  // Mean of arr.map(pick); null for an empty array.
  global.avgOf = function (arr, pick) {
    if (!arr || !arr.length) return null;
    let sum = 0;
    for (const x of arr) sum += pick ? pick(x) : x;
    return sum / arr.length;
  };

  // Did-you-mean: topics whose titles are within 3 edits of EVERY query token
  // (after aliasing), ranked by closeness. Returns up to `limit` topic objects.
  global.buildDidYouMean = function (query, topics, limit) {
    const tokens = (query || '').toLowerCase().split(/\s+/)
      .map(t => global.SEARCH_ALIASES[t] || t).filter(Boolean);
    if (!tokens.length || !topics || !topics.length) return [];
    const scored = [];
    for (const t of topics) {
      const title = (t.title || '').toLowerCase();
      const words = title.split(/[^a-z0-9]+/).filter(w => w.length > 1);
      let best = 0;
      let ok = true;
      for (const tok of tokens) {
        let d = 99;
        for (const w of words) {
          const x = global.editDistance(w, tok);
          if (x < d) d = x;
        }
        if (d <= 3) {
          if (4 - d > best) best = 4 - d;
        } else {
          ok = false;
          break;
        }
      }
      if (ok && best > 0) scored.push({ t: t, score: best });
    }
    scored.sort((a, b) => b.score - a.score || a.t.title.localeCompare(b.t.title));
    return scored.slice(0, limit || 5).map(s => s.t);
  };

  // --------------------------------------------------------------------------
  // Weekly coverage trends — per-topic week-over-week activity for the parent
  // report. Pure: classification only; the caller supplies state and rendering.
  //   log: [{ topicId, type, ts }]  (any time range; capped by caller)
  //   ctx: { topicsById, completed, assessments, dueReviewIds,
  //          weekStart, prevStart }
  // Returns { trendTopics (sorted, capped), masteredLastWeek, activeLastWeek,
  //            stagnantCount, totalTopics }.
  // --------------------------------------------------------------------------
  global.computeTopicTrends = function (log, ctx) {
    const lastSeen = {};
    log.forEach(a => {
      if (a.topicId) lastSeen[a.topicId] = Math.max(lastSeen[a.topicId] || 0, a.ts);
    });
    const trendTopics = [];
    Object.keys(lastSeen).forEach(id => {
      const t = ctx.topicsById[id];
      if (!t) return;
      const ev = log.filter(x => x.topicId === id);
      const thisWeekN = ev.filter(x => x.ts >= ctx.weekStart).length;
      const lastWeekN = ev.filter(x => x.ts >= ctx.prevStart && x.ts < ctx.weekStart).length;
      const mastered = ctx.completed.has(id);
      const rating = ctx.assessments[id] ? ctx.assessments[id].rating : null;
      const dueReview = ctx.dueReviewIds.has(id);
      let status, statusIcon;
      if (mastered) { status = 'Mastered'; statusIcon = '✅'; }
      else if (rating === 'no' || rating === 'almost' || dueReview) { status = 'Reviewing'; statusIcon = '🔁'; }
      else { status = 'In progress'; statusIcon = '📖'; }
      let trend, trendTitle;
      if (mastered && thisWeekN > 0) { trend = '🆕'; trendTitle = 'Newly mastered this week'; }
      else if (mastered) { trend = '✓'; trendTitle = 'Mastered — no further activity needed this week'; }
      else if (thisWeekN === 0 && lastWeekN > 0) { trend = '🛑'; trendTitle = 'Stagnant — touched last week, nothing this week'; }
      else if (thisWeekN > lastWeekN) { trend = '↑'; trendTitle = 'More active than last week (' + thisWeekN + ' vs ' + lastWeekN + ')'; }
      else if (thisWeekN < lastWeekN) { trend = '↓'; trendTitle = 'Less active than last week (' + thisWeekN + ' vs ' + lastWeekN + ')'; }
      else if (thisWeekN > 0) { trend = '→'; trendTitle = 'Steady activity'; }
      else { trend = '·'; trendTitle = 'No activity in the last two weeks'; }
      trendTopics.push({ topic: t, thisWeekN: thisWeekN, lastWeekN: lastWeekN,
        lastTs: lastSeen[id], status: status, statusIcon: statusIcon,
        trend: trend, trendTitle: trendTitle });
    });
    trendTopics.sort((a, b) => (b.thisWeekN - a.thisWeekN) || (b.lastWeekN - a.lastWeekN) || (b.lastTs - a.lastTs));
    const masteredLastWeek = log.filter(a => a.type === 'mastered' && a.ts >= ctx.prevStart && a.ts < ctx.weekStart).length;
    const activeLastWeek = new Set(log.filter(a => a.ts >= ctx.prevStart && a.ts < ctx.weekStart)
      .map(a => a.topicId).filter(Boolean)).size;
    const stagnantCount = trendTopics.filter(x => x.thisWeekN === 0 && x.status !== 'Mastered').length;
    return { trendTopics: trendTopics, masteredLastWeek: masteredLastWeek,
      activeLastWeek: activeLastWeek, stagnantCount: stagnantCount,
      totalTopics: trendTopics.length };
  };

  // Science grouping: for young classes (≤ 6) the school curriculum teaches one
  // "Science" subject, so Physics/Chemistry/Biology are shown as a single
  // subject in the UI. The raw per-topic subject stays intact in the data
  // (fact audit, board prep, and content tools all key on it) — this is purely
  // a display/filter abstraction.
  const SCIENCE_GROUP_MAX_CLASS = 6;
  const SCIENCE_RAW = ['Physics', 'Chemistry', 'Biology'];

  // Display name for a topic: "Science" for P/C/B topics up to the max class.
  global.displaySubject = function (subject, classLevel) {
    if (classLevel <= SCIENCE_GROUP_MAX_CLASS && SCIENCE_RAW.indexOf(subject) >= 0) return 'Science';
    return subject;
  };

  // Subject list a user of a given grade actually sees (chips, dashboard, paths).
  global.subjectsForGrade = function (grade) {
    if (grade <= SCIENCE_GROUP_MAX_CLASS) {
      return ['Mathematics', 'Science', 'Computer Science & AI', 'Earth & Space'];
    }
    return ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science & AI', 'Earth & Space'];
  };

  // Adaptive spaced review: given the previous review entry (or null) and
  // whether the recall was correct, return the next { reps, ease, intervalDays }.
  // Successful recalls grow the interval 1→2→4→8→16→30 days (× ease); a failed
  // recall resets reps to 0 and schedules a 1-day re-review.
  const SM2_INTERVALS = [1, 2, 4, 8, 16, 30];
  global.sm2Next = function (prev, correct) {
    const prevReps = (prev && prev.reps) || 0;
    const prevEase = (prev && prev.ease) || 2.5;
    if (correct === false) {
      return { reps: 0, ease: Math.max(1.3, prevEase - 0.2), intervalDays: 1, correct: false };
    }
    const reps = prevReps + 1;
    const ease = Math.min(2.8, prevEase + (prev && prev.correct ? 0.1 : 0));
    let intervalDays = SM2_INTERVALS[Math.min(reps - 1, SM2_INTERVALS.length - 1)];
    intervalDays = Math.round(intervalDays * ease);
    return { reps: reps, ease: ease, intervalDays: intervalDays, correct: true };
  };

  // Classify a topic into a concept family (e.g. "Fractions", "Forces &
  // Motion") using title keywords, with a chapter-name fallback so every
  // topic gets a concept. Pure and deterministic — the weekly report groups
  // by this to show "Fractions — adding strong, comparing needs work".
  const CONCEPT_RULES = [
    [/fraction|denominator|numerator|equivalent/, 'Fractions'],
    [/add|addition|plus|sum of|put together|join|altogether/, 'Addition & Subtraction'],
    [/subtract|minus|take away|difference|fewer|less than/, 'Addition & Subtraction'],
    [/multipl|times table|product|times |groups of/, 'Multiplication & Division'],
    [/divide|division|share equally|equal share|quotient/, 'Multiplication & Division'],
    [/place value|ones and tens|tens and ones|digit|expanded form|number line|ordering|comparing numbers|before after|bigger smaller|greater|less than|more than/, 'Numbers & Place Value'],
    [/decimal|tenth|hundredth|decimal point/, 'Decimals'],
    [/percent|percentage|out of 100/, 'Percentages'],
    [/ratio|proportion|unitary method/, 'Ratio & Proportion'],
    [/angle|triangle|square|rectangle|circle|shape|geometry|perimeter|area|symmetry|vertex|side/, 'Geometry & Shapes'],
    [/measure|length|height|centimetre|centimeter|metre|kilogram|litre|volume|cuboid/,'Measurement'],
    [/clock|time|hour|minute|am|pm|day of the week|calendar/, 'Time'],
    [/money|rupee|coin|price|cost|paisa|billing/, 'Money'],
    [/graph|chart|data|tally|pictograph/, 'Data & Graphs'],
    [/plant|leaf|root|flower|seed|photosynthesis|germinate/, 'Plants & Life'],
    [/animal|bird|fish|insect|habitat|food chain|amphibian|mammal/, 'Animals & Habitats'],
    [/human body|heart|lung|digest|skeleton|muscle|brain|tooth|sense/, 'Human Body'],
    [/force|push|pull|friction|gravity|magnet|magnetic/, 'Forces & Motion'],
    [/electric|circuit|current|battery|bulb/, 'Electricity'],
    [/light|shadow|reflection|mirror|transparent|opaque/, 'Light & Shadow'],
    [/sound|vibration|echo/, 'Sound'],
    [/heat|cold|temperature|hot|warm|freeze|melt|boil|evaporat/, 'Heat & Matter'],
    [/solid|liquid|gas|material|matter|dissolv|water/, 'Matter & Materials'],
    [/weather|season|rain|climate|monsoon/, 'Weather & Climate'],
    [/solar|planet|moon|star|space|earth|sky/, 'Space & Earth'],
    [/computer|keyboard|mouse|algorithm|code|program|ai |artificial|robot/, 'Computers & Coding'],
    [/health|hygiene|food group|clean|exercise|nutrition/, 'Health & Hygiene']
  ];
  global.topicConcept = function (t) {
    const hay = ((t.title || '') + ' ' + (t.summary || '')).toLowerCase();
    for (const [re, label] of CONCEPT_RULES) {
      if (re.test(hay)) return label;
    }
    const chapter = (t.chapter || '').replace(/^Chapter\s*\d+\s*—\s*/, '').trim();
    if (chapter) return chapter;
    return t.subject || 'General';
  };

  // Build a day-by-day exam study plan. Pure: topics + progress state in,
  // a day schedule out. New content is front-loaded (2 new + 1 review per
  // day by default) so the final days before the exam are review-heavy.
  global.buildExamPlan = function (topics, opts) {
    const today = Date.now();
    const daysUntil = Math.max(1, Math.min(60, Math.ceil((opts.examDate - today) / 86400000)));
    const budget = opts.dailyBudget || 3;
    const mastered = opts.mastered || new Set();
    const weakIds = opts.weakIds || new Set();
    const dueIds = opts.dueIds || new Set();
    // Subject may be a single string or (for Class 1–6) a display subject like
    // "Science" resolved to its underlying subjects by the caller.
    const subjects = opts.subjects || (opts.subject ? [opts.subject] : []);
    const pool = topics.filter(t => t.class_level === opts.classLevel && subjects.includes(t.subject));
    const notMastered = pool.filter(t => !mastered.has(t.id));
    const weak = pool.filter(t => mastered.has(t.id) && (weakIds.has(t.id) || dueIds.has(t.id)));
    const review = pool.filter(t => mastered.has(t.id) && !weakIds.has(t.id) && !dueIds.has(t.id));
    const days = [];
    let newIdx = 0, weakIdx = 0, revIdx = 0;
    const newPerDay = Math.min(2, budget);
    const revPerDay = Math.max(1, budget - newPerDay);
    for (let d = 0; d < daysUntil; d++) {
      const ids = [];
      for (let i = 0; i < newPerDay && newIdx < notMastered.length; i++) ids.push(notMastered[newIdx++].id);
      for (let i = 0; i < revPerDay; i++) {
        if (weakIdx < weak.length) ids.push(weak[weakIdx++].id);
        else if (revIdx < review.length) ids.push(review[revIdx++].id);
        else if (newIdx < notMastered.length) ids.push(notMastered[newIdx++].id);
      }
      days.push({ day: d + 1, date: today + d * 86400000, topicIds: ids });
    }
    return {
      days: days,
      totalTopics: pool.length,
      newCount: notMastered.length,
      weakCount: weak.length,
      reviewCount: review.length,
      daysUntil: daysUntil
    };
  };

  // Aggregate one student's opaque cloud progress blob into roster stats for
  // the teacher view. Pure: no DOM, no storage — a blob in, a summary out.
  global.summarizeRosterStudent = function (blob, userId, totalTopics) {
    let snap = {};
    try { const p = JSON.parse(blob); snap = (p && p.data) || {}; } catch (e) { /* opaque blob */ }
    const parseArr = (k) => { try { return new Set(JSON.parse(snap[k] || '[]')); } catch (e) { return new Set(); } };
    const completed = parseArr('avyaan_completed_topics');
    const solidified = parseArr('avyaan_solidified_topics');
    const xp = parseInt(snap['avyaan_user_xp'] || '0', 10) || 0;
    let streak = 0;
    try { streak = (JSON.parse(snap['avyaan_streak_data'] || '{}').count) || 0; } catch (e) {}
    let name = userId || 'Student', grade = '—';
    try {
      const u = JSON.parse(snap['avyaan_user'] || '{}');
      if (u.name) name = u.name;
      if (u.grade) grade = u.grade;
    } catch (e) {}
    const pct = totalTopics > 0 ? Math.round((completed.size / totalTopics) * 100) : 0;
    return { name: name, grade: grade, mastered: completed.size, solidified: solidified.size, xp: xp, streak: streak, pct: pct };
  };
})(typeof window !== 'undefined' ? window : globalThis);

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SEARCH_ALIASES: SEARCH_ALIASES,
    editDistance: editDistance,
    scoreTopicSearch: scoreTopicSearch,
    estimateAccuracy: estimateAccuracy,
    avgOf: avgOf,
    buildDidYouMean: buildDidYouMean,
    computeTopicTrends: computeTopicTrends,
    sm2Next: sm2Next,
    displaySubject: displaySubject,
    subjectsForGrade: subjectsForGrade,
    summarizeRosterStudent: summarizeRosterStudent,
    buildExamPlan: buildExamPlan,
    topicConcept: topicConcept,
  };
}
