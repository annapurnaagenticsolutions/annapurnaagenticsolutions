/* ==========================================================================
   Avyaan STEM REST API Client Wrapper v2
   Handles all async communication with FastAPI Backend.
   Uses short-lived JWT auth tokens in development and HttpOnly cookie
   sessions in production.
   ========================================================================== */

const AvyaanAPI = {
  baseUrl: '/api',

  // Get the bearer token when available; cookie-mode sessions use a sentinel
  // because the real token is intentionally unreadable by JavaScript.
  getToken() {
    avyaanStorage.removeItem('avyaan_token');
    const token = sessionStorage.getItem('avyaan_token');
    if (token) return token;
    // Cookie-mode sessions are intentionally not readable by JavaScript. A
    // non-secret sentinel keeps existing UI guards working while authHeaders
    // omits the bearer header and relies on the HttpOnly cookie.
    return sessionStorage.getItem('avyaan_cookie_session') === '1' ? '__cookie_session__' : null;
  },

  // Read the non-secret double-submit CSRF cookie used with HttpOnly auth
  // sessions.  The session cookie itself remains inaccessible to JavaScript.
  csrfToken() {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(/(?:^|;)\s*avyaan_csrf=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  },

  // Set/remove JWT token for this browser session.
  setToken(token, authMode = null) {
    if (token) {
      sessionStorage.setItem('avyaan_token', token);
      sessionStorage.removeItem('avyaan_cookie_session');
    } else {
      sessionStorage.removeItem('avyaan_token');
      if (authMode === 'cookie') sessionStorage.setItem('avyaan_cookie_session', '1');
      else sessionStorage.removeItem('avyaan_cookie_session');
      avyaanStorage.removeItem('avyaan_token');
    }
  },
  // Build auth headers
  authHeaders(extra = {}) {
    const token = this.getToken();
    const headers = { 'Content-Type': 'application/json', ...extra };
    if (token && token !== '__cookie_session__') {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const csrf = this.csrfToken();
    if (csrf) headers['X-CSRF-Token'] = csrf;
    return headers;
  },

  // Register a new account with authoritative enrolled class and role
  async register(name, email, password, enrolledClass = 1, role = 'Student') {
    try {
      const res = await fetch(`${this.baseUrl}/auth/register`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          enrolled_class: parseInt(enrolledClass, 10) || 1,
          role: role || 'Student'
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        this.setToken(data.user.token, data.auth_mode);
        avyaanStorage.setItem('avyaan_user', JSON.stringify(data.user));
      }
      return data;
    } catch (e) {
      console.error('API Register Error:', e);
      return { status: 'error', detail: e.message };
    }
  },

  // Login with email + password
  async login(email, password) {
    try {
      const res = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.status === 'success') {
        this.setToken(data.user.token, data.auth_mode);
        avyaanStorage.setItem('avyaan_user', JSON.stringify(data.user));
      }
      return data;
    } catch (e) {
      console.error('API Login Error:', e);
      return { status: 'error', detail: e.message };
    }
  },

  // Request a single-use password recovery link. The API deliberately returns
  // a generic response so account existence is never disclosed.
  async forgotPassword(email) {
    try {
      const res = await fetch(`${this.baseUrl}/auth/forgot-password`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: String(email || '').trim().toLowerCase() })
      });
      const data = await res.json().catch(() => ({}));
      return { ...data, ok: res.ok };
    } catch (e) {
      return { status: 'error', detail: e.message, ok: false };
    }
  },

  // Consume a recovery token and revoke all prior sessions on the server.
  async resetPassword(token, password) {
    try {
      const res = await fetch(`${this.baseUrl}/auth/reset-password`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: String(token || ''), password: String(password || '') })
      });
      const data = await res.json().catch(() => ({}));
      return { ...data, ok: res.ok };
    } catch (e) {
      return { status: 'error', detail: e.message, ok: false };
    }
  },
  // Logout — clear token
  logout() {
    const token = this.getToken();
    const headers = token && token !== '__cookie_session__' ? { Authorization: `Bearer ${token}` } : {};
    const csrf = this.csrfToken();
    if (csrf) headers['X-CSRF-Token'] = csrf;
    fetch(`${this.baseUrl}/auth/logout`, { method: 'POST', credentials: 'include', headers, keepalive: true }).catch(() => {});
    this.setToken(null);
    avyaanStorage.removeItem('avyaan_user');
    avyaanStorage.removeItem('avyaan_completed_topics');
  },

  // Revoke every active account session, including other devices.
  async logoutAll() {
    try {
      const res = await fetch(`${this.baseUrl}/auth/logout-all`, {
        method: 'POST',
        headers: this.authHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        this.setToken(null);
        avyaanStorage.removeItem('avyaan_user');
        avyaanStorage.removeItem('avyaan_completed_topics');
      }
      return data;
    } catch (e) {
      return { status: 'error', detail: e.message };
    }
  },

  // Get current user profile (validates token)
  async getMe() {
    try {
      const res = await fetch(`${this.baseUrl}/auth/me`, { credentials: 'include', headers: this.authHeaders() });
      if (!res.ok) return null;
      const data = await res.json();
      return data.user;
    } catch (e) {
      return null;
    }
  },

  // Fetch topics with filtering & entitlement
  async getTopics(classLevel = 'all', subject = 'all', search = '', labId = 'all') {
    try {
      const params = new URLSearchParams({
        class_level: classLevel,
        subject: subject,
        search: search,
        lab_id: labId,
      });
      const res = await fetch(`${this.baseUrl}/topics?${params}`, { headers: this.authHeaders() });
      if (!res.ok) {
        if (res.status === 401) { this.logout(); return []; }
        return [];
      }
      const data = await res.json();
      return data.topics || [];
    } catch (e) {
      console.warn('API getTopics error:', e);
      return [];
    }
  },

  // Get available pricing plans
  async getPlans() {
    try {
      const res = await fetch(`${this.baseUrl}/payments/plans`);
      if (!res.ok) return { plans: [], error: `Pricing request failed (${res.status})` };
      return await res.json();
    } catch (e) {
      return { plans: [], error: e.message };
    }
  },

  // Create a payment order for a class band and duration
  async createOrder(duration = '1y', band = null, idempotencyKey = null) {
    try {
      const body = { duration: duration || '1y' };
      if (band) body.band = band;
      const res = await fetch(`${this.baseUrl}/payments/create-order`, {
        method: 'POST',
        headers: this.authHeaders(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
        body: JSON.stringify(body)
      });
      return await res.json();
    } catch (e) {
      console.error('API createOrder error:', e);
      return { status: 'error', detail: e.message };
    }
  },

  // Verify a payment with Razorpay order_id, payment_id, and signature
  async verifyPayment(orderId, paymentId, signature) {
    try {
      const res = await fetch(`${this.baseUrl}/payments/verify`, {
        method: 'POST',
        headers: this.authHeaders(),
        body: JSON.stringify({ order_id: orderId, payment_id: paymentId, signature })
      });
      const data = await res.json();
      if (data.status === 'success') {
        if (data.token) this.setToken(data.token);
        else if (data.auth_mode === 'cookie') this.setToken(null, 'cookie');
        const stored = JSON.parse(avyaanStorage.getItem('avyaan_user') || '{}');
        stored.tier = data.tier || data.new_tier || stored.tier;
        stored.subscription_band = data.band || stored.subscription_band;
        stored.subscription_duration = data.subscription_duration || stored.subscription_duration;
        stored.subscription_expires_at = data.subscription_expires_at || stored.subscription_expires_at;
        avyaanStorage.setItem('avyaan_user', JSON.stringify(stored));
      }
      return data;
    } catch (e) {
      console.error('API verifyPayment error:', e);
      return { status: 'error', detail: e.message };
    }
  },

  // Check entitlement for a specific content item
  async checkEntitlement(contentId) {
    try {
      const res = await fetch(`${this.baseUrl}/entitlement/check?content_id=${contentId}`, {
        headers: this.authHeaders()
      });
      return await res.json();
    } catch (e) {
      return { allowed: false, error: e.message };
    }
  },

  // Mark topic as mastered
  async markMastered(contentId, quizSessionId = null) {
    try {
      const res = await fetch(`${this.baseUrl}/progress/master`, {
        method: 'POST',
        headers: this.authHeaders(),
        body: JSON.stringify({ content_id: contentId, ...(quizSessionId ? { quiz_session_id: quizSessionId } : {}) })
      });
      return await res.json();
    } catch (e) {
      console.warn('API markMastered error:', e);
      return null;
    }
  },

  // Remove a server-recorded mastery mark for the authenticated learner.
  async unmarkMastered(contentId) {
    try {
      const res = await fetch(`${this.baseUrl}/progress/unmaster`, {
        method: 'POST',
        headers: this.authHeaders(),
        body: JSON.stringify({ content_id: contentId })
      });
      return await res.json();
    } catch (e) {
      console.warn('API unmarkMastered error:', e);
      return null;
    }
  },

  // Start a short-lived server-bound quiz session. The response contains only
  // question text/options; answer keys stay in the API's trusted registry.
  async createQuizSession(contentId) {
    try {
      const res = await fetch(`${this.baseUrl}/quiz/sessions`, {
        method: 'POST',
        headers: this.authHeaders(),
        body: JSON.stringify({ content_id: contentId })
      });
      const data = await res.json();
      if (!res.ok) return { status: 'error', detail: data?.detail || `Quiz session failed (${res.status})` };
      return data;
    } catch (e) {
      return { status: 'error', detail: e.message };
    }
  },

  // Start a server-bound aggregate review (chapter, board, mixed, or exam).
  // The response contains question text/options only; source mappings and
  // answer keys remain in the server-side quiz session.
  async createReviewSession(selector = {}) {
    try {
      const res = await fetch(`${this.baseUrl}/quiz/review-sessions`, {
        method: 'POST',
        headers: this.authHeaders(),
        body: JSON.stringify(selector || {})
      });
      const data = await res.json();
      if (!res.ok) return { status: 'error', detail: data?.detail || `Review session failed (${res.status})` };
      return data;
    } catch (e) {
      return { status: 'error', detail: e.message };
    }
  },

  // Evaluate one answer in an aggregate review session.
  async logReviewAttempt(reviewSessionId, questionIndex, selectedIdx) {
    try {
      const res = await fetch(`${this.baseUrl}/quiz/review-evaluate`, {
        method: 'POST',
        headers: this.authHeaders(),
        body: JSON.stringify({
          review_session_id: reviewSessionId,
          question_index: questionIndex,
          selected_option_index: selectedIdx,
        })
      });
      return await res.json();
    } catch (e) {
      return { status: 'error', detail: e.message };
    }
  },

  // Get user progress
  async getProgress() {
    try {
      const user = JSON.parse(avyaanStorage.getItem('avyaan_user') || '{}');
      if (!user.id) return null;
      const res = await fetch(`${this.baseUrl}/progress/${user.id}`, { headers: this.authHeaders() });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  // Log a quiz attempt
  async logQuizAttempt(contentId, questionIndex, selectedIdx, selectedText, quizSessionId = null) {
    try {
      const res = await fetch(`${this.baseUrl}/quiz/evaluate`, {
        method: 'POST',
        headers: this.authHeaders(),
        body: JSON.stringify({
          content_id: contentId,
          question_index: questionIndex,
          selected_option_index: selectedIdx,
          ...(quizSessionId ? { quiz_session_id: quizSessionId } : {}),
          selected_option_text: selectedText,
        })
      });
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  // Get topic detail with full metadata
  async getTopicDetail(contentId) {
    try {
      const res = await fetch(`${this.baseUrl}/topics/${contentId}`, { headers: this.authHeaders() });
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  // Get personalized recommendations
  async getRecommendations() {
    try {
      const res = await fetch(`${this.baseUrl}/topics/recommendations/next`, { headers: this.authHeaders() });
      return await res.json();
    } catch (e) {
      return { recommendations: [] };
    }
  },

  // Get due reviews (spaced repetition)
  async getDueReviews() {
    try {
      const res = await fetch(`${this.baseUrl}/review/due`, { headers: this.authHeaders() });
      return await res.json();
    } catch (e) {
      return { due_count: 0, reviews: [] };
    }
  },

  // Mark a topic as reviewed (spaced repetition)
  async markReviewed(contentId) {
    try {
      const res = await fetch(`${this.baseUrl}/review/mark?content_id=${contentId}`, {
        method: 'POST',
        headers: this.authHeaders()
      });
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  // Sync lab progress (from postMessage bridge)
  async syncLabProgress(labId, completedLessonIds, lastVisitedLesson) {
    try {
      const res = await fetch(`${this.baseUrl}/review/sync-lab-progress`, {
        method: 'POST',
        headers: this.authHeaders(),
        body: JSON.stringify({
          lab_id: labId,
          completed_lesson_ids: completedLessonIds,
          last_visited_lesson: lastVisitedLesson,
        })
      });
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  // Push the full local progress blob to the cloud (JWT required).
  // Silent no-op when offline or when the endpoint isn't deployed yet.
  async pushProgressBlob(blob) {
    try {
      const user = JSON.parse(avyaanStorage.getItem('avyaan_user') || '{}');
      if (!user.id || !this.getToken()) return null;
      const body = { user_id: user.id, blob: blob };
      // Class code rides the same push so the teacher roster sees this child.
      const classCode = avyaanStorage.getItem('avyaan_class_code');
      if (classCode) body.class_code = classCode;
      const res = await fetch(`${this.baseUrl}/progress/blob`, {
        method: 'PUT',
        headers: this.authHeaders(),
        body: JSON.stringify(body)
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  // Fetch the cloud progress blob (JWT required). Returns null when there
  // is nothing stored or the endpoint isn't deployed yet.
  async pullProgressBlob() {
    try {
      const user = JSON.parse(avyaanStorage.getItem('avyaan_user') || '{}');
      if (!user.id || !this.getToken()) return null;
      const res = await fetch(`${this.baseUrl}/progress/blob/${user.id}`, {
        headers: this.authHeaders()
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data && data.blob ? data.blob : null;
    } catch (e) {
      return null;
    }
  },

  async joinClass(classCode) {
    try {
      const res = await fetch(`${this.baseUrl}/progress/join-class`, { method: 'POST', headers: this.authHeaders(), body: JSON.stringify({ class_code: String(classCode).trim() }) });
      return await res.json();
    } catch (e) { return { status: 'error', detail: e.message }; }
  },

  async createClass(grade = null) {
    try {
      const res = await fetch(`${this.baseUrl}/progress/create-class`, {
        method: 'POST',
        headers: this.authHeaders(),
        body: JSON.stringify(grade ? { grade: parseInt(grade, 10) } : {}),
      });
      return await res.json();
    } catch (e) { return { status: 'error', detail: e.message }; }
  },

  // Fetch every student blob tagged with a class code (teacher roster view).
  // Blobs stay opaque — the frontend aggregates them. Null when offline.
  async fetchClassRoster(classCode) {
    try {
      if (!classCode || !this.getToken()) return null;
      const res = await fetch(`${this.baseUrl}/progress/roster/${encodeURIComponent(classCode)}`, {
        headers: this.authHeaders()
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  // Queue a server-generated parent report for email delivery.
  async queueReportEmail(reportId, email, subject) {
    try {
      if (!reportId || !email || !this.getToken()) return null;
      const res = await fetch(`${this.baseUrl}/progress/report-email`, {
        method: 'POST', headers: this.authHeaders(),
        body: JSON.stringify({ report_id: reportId, email: email, subject: subject })
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) { return null; }
  },

  async getTopicContent(topicId) {
    try {
      if (!topicId || !this.getToken()) return null;
      const res = await fetch(`${this.baseUrl}/topics/${encodeURIComponent(topicId)}/content`, { headers: this.authHeaders() });
      if (!res.ok) {
        let detail = '';
        try { detail = (await res.json())?.detail || ''; } catch (e) { /* non-JSON error */ }
        return { __error: true, status: res.status, detail };
      }
      return await res.json();
    } catch (e) { return null; }
  },

  async createServerReport(childId, periodStart = null, periodEnd = null, parentNote = null) {
    try {
      if (!childId || !this.getToken()) return null;
      const res = await fetch(`${this.baseUrl}/progress/reports`, {
        method: 'POST', headers: this.authHeaders(),
        body: JSON.stringify({ child_id: childId, period_start: periodStart, period_end: periodEnd, parent_note: parentNote })
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) { return null; }
  },

  async createReportShare(reportId, title) {
    try {
      if (!reportId || !this.getToken()) return null;
      const res = await fetch(`${this.baseUrl}/progress/report-share`, {
        method: 'POST', headers: this.authHeaders(),
        body: JSON.stringify({ report_id: reportId, title: title })
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) { return null; }
  },


  // DPDP consent status (backend). Null when offline / not deployed.
  async getConsentStatus() {
    try {
      if (!this.getToken()) return null;
      const res = await fetch(`${this.baseUrl}/consent/status`, { headers: this.authHeaders() });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  // DPDP consent update / withdrawal (backend). Best-effort.
  async updateConsent(payload) {
    try {
      if (!this.getToken()) return null;
      const res = await fetch(`${this.baseUrl}/consent/update`, {
        method: 'PATCH',
        headers: this.authHeaders(),
        body: JSON.stringify(payload)
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  // ── Parent Portal Methods ──────────────────────────────────────────────────
  // Generate a one-time 15-minute linking code for the child
  async generateLinkingCode() {
    try {
      const res = await fetch(`${this.baseUrl}/parent/generate-code`, {
        method: 'POST',
        headers: this.authHeaders()
      });
      return await res.json();
    } catch (e) {
      return { status: 'error', detail: e.message };
    }
  },

  // Link a child account using the one-time code (Parent role)
  async linkChild(code) {
    try {
      const res = await fetch(`${this.baseUrl}/parent/link`, {
        method: 'POST',
        headers: this.authHeaders(),
        body: JSON.stringify({ code: String(code).trim().toUpperCase() })
      });
      return await res.json();
    } catch (e) {
      return { status: 'error', detail: e.message };
    }
  },

  // Create a child profile owned by the authenticated parent.
  async createChild(displayName, classLevel, avatar = null) {
    try {
      const res = await fetch(this.baseUrl + '/parent/children', {
        method: 'POST', headers: this.authHeaders(),
        body: JSON.stringify({ display_name: String(displayName || '').trim(), class_level: Number(classLevel), avatar })
      });
      if (!res.ok) return { status: 'error', detail: (await res.json().catch(() => ({}))).detail || 'Could not create child' };
      return await res.json();
    } catch (e) { return { status: 'error', detail: e.message }; }
  },

  // List all linked children for this parent
  async getLinkedChildren() {
    try {
      const res = await fetch(`${this.baseUrl}/parent/children`, {
        headers: this.authHeaders()
      });
      if (!res.ok) return { children: [] };
      return await res.json();
    } catch (e) {
      return { children: [] };
    }
  },

  async revokeGuardianRelationship(childId) {
    try {
      const res = await fetch(this.baseUrl + '/parent/relationships/' + encodeURIComponent(childId) + '/revoke', {
        method: 'POST', headers: this.authHeaders()
      });
      if (!res.ok) return { status: 'error', detail: (await res.json().catch(() => ({}))).detail || 'Could not revoke relationship' };
      return await res.json();
    } catch (e) { return { status: 'error', detail: e.message }; }
  },

  // Server-side aggregated learning summary for a linked child
  async getChildSummary(childId) {
    try {
      const res = await fetch(`${this.baseUrl}/parent/child/${encodeURIComponent(childId)}/summary`, {
        headers: this.authHeaders()
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { status: 'error', detail: err.detail || 'Could not retrieve child summary' };
      }
      return await res.json();
    } catch (e) {
      return { status: 'error', detail: e.message };
    }
  },

  // ── Admin Oversight Methods ────────────────────────────────────────────────
  // Get aggregated platform metrics (Admin role required)
  async getAdminMetrics() {
    try {
      const res = await fetch(`${this.baseUrl}/admin/metrics`, {
        headers: this.authHeaders()
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { status: 'error', detail: err.detail || 'Unauthorized' };
      }
      return await res.json();
    } catch (e) {
      return { status: 'error', detail: e.message };
    }
  }
};

