/* ==========================================================================
   Avyaan STEM REST API Client Wrapper v2
   Handles all async communication with FastAPI Backend.
   Uses short-lived JWT auth tokens in development and HttpOnly cookie
   sessions in production.
   ========================================================================== */

const AvyaanAPI = {
  baseUrl: '/api',

  // Stable, user-safe error classification used by recoverable UI states.
  classifyError(status, detail = '') {
    const code = Number(status);
    const text = String(detail || '').toLowerCase();
    if (!navigator.onLine || code === 0) return 'offline';
    if (code === 404 || code === 501 || text.includes('feature_unavailable') || text.includes('not yet enabled') || text.includes('not enabled')) return 'feature_unavailable';
    if (code === 401 || text.includes('authentication') || text.includes('session')) return 'auth_expired';
    if (code === 402 || text.includes('payment pending')) return 'payment_pending';
    if (code === 403 && (text.includes('plan') || text.includes('included'))) return 'entitlement_required';
    if (code === 408 || code === 429 || code >= 500) return 'retryable';
    if (text.includes('quiz') && (text.includes('expired') || text.includes('unavailable'))) return 'quiz_unavailable';
    if (text.includes('content') || text.includes('lesson')) return 'content_unavailable';
    return 'request_failed';
  },
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

  // Bound every API request so login, paywall, lesson, and dashboard controls
  // cannot remain indefinitely stuck when the API origin or network stalls.
  async fetchWithTimeout(url, init = {}, timeoutMs = 12000) {
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const requestInit = { ...init };
    if (controller) requestInit.signal = controller.signal;
    const timer = setTimeout(() => controller && controller.abort(), timeoutMs);
    try {
      return await fetch(url, requestInit);
    } finally {
      clearTimeout(timer);
    }
  },
  // Shared assessment transport. Cookie-mode sessions require credentials on
  // every quiz/review request; the browser receives only safe response fields.
  async assessmentRequest(path, options = {}) {
    try {
      const res = await this.fetchWithTimeout(`${this.baseUrl}${path}`, {
        ...options,
        credentials: 'include',
        headers: this.authHeaders(options.headers || {})
      });
      const data = await res.json().catch(() => ({}));
      return { ...data, ok: res.ok, error_code: res.ok ? null : this.classifyError(res.status, data.detail) };
    } catch (e) {
      return { status: 'error', detail: 'The assessment service is temporarily unavailable. Please retry.', ok: false, error_code: 'offline' };
    }
  },

  // Shared JSON transport for authenticated and public API calls. Keeping
  // credentials on the request is required for HttpOnly cookie sessions; the
  // structured result lets callers distinguish deferred features, expired
  // sessions, entitlement denial, and transient outages.
  async requestJson(path, options = {}, fallback = {}) {
    try {
      const res = await this.fetchWithTimeout(`${this.baseUrl}${path}`, {
        ...options,
        credentials: 'include',
        headers: this.authHeaders(options.headers || {})
      });
      const data = await res.json().catch(() => ({}));
      return { ...fallback, ...data, ok: res.ok, error_code: res.ok ? null : this.classifyError(res.status, data.detail) };
    } catch (_) {
      return { ...fallback, status: 'error', ok: false, error_code: 'offline', detail: 'The service is temporarily unavailable. Please retry.' };
    }
  },
  // Register a new account with authoritative enrolled class and role
  async register(name, email, password, enrolledClass = 1, role = 'Student') {
    try {
      const res = await this.fetchWithTimeout(`${this.baseUrl}/auth/register`, {
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
      const res = await this.fetchWithTimeout(`${this.baseUrl}/auth/login`, {
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

    // Batch learning evidence. The browser sends only the allowlisted,
  // consent-gated event envelope; a collector may be unavailable during
  // local/static-only runs, in which case the caller keeps its local queue.
  async sendLearningEvents(events) {
    try {
      const safe = Array.isArray(events) ? events.slice(0, 20) : [];
      if (!safe.length) return { status: 'accepted', accepted: 0 };
      const res = await this.fetchWithTimeout(`${this.baseUrl}/learning-events`, {
        method: 'POST',
        credentials: 'include',
         headers: this.authHeaders(),
        body: JSON.stringify({ events: safe, consent: true })
      });
      const data = await res.json().catch(() => ({}));
      return { ...data, ok: res.ok, error_code: res.ok ? null : this.classifyError(res.status, data.detail) };
    } catch (e) {
      return { status: 'error', detail: 'Learning evidence is queued on this device.', ok: false, error_code: 'offline' };
    }
  },
// Request a single-use password recovery link. The API deliberately returns
  // a generic response so account existence is never disclosed.
  async forgotPassword(email) {
    try {
      const res = await this.fetchWithTimeout(`${this.baseUrl}/auth/forgot-password`, {
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
      const res = await this.fetchWithTimeout(`${this.baseUrl}/auth/reset-password`, {
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
    this.fetchWithTimeout(`${this.baseUrl}/auth/logout`, { method: 'POST', credentials: 'include', headers, keepalive: true }).catch(() => {});
    this.setToken(null);
    avyaanStorage.removeItem('avyaan_user');
    avyaanStorage.removeItem('avyaan_completed_topics');
  },

  // Revoke every active account session, including other devices.
  async logoutAll() {
    const data = await this.requestJson('/auth/logout-all', { method: 'POST' });
    if (data.ok && data.status === 'success') {
      this.setToken(null);
      avyaanStorage.removeItem('avyaan_user');
      avyaanStorage.removeItem('avyaan_completed_topics');
    }
    return data;
  },

  // Get current user profile (validates token)
  async getMe() {
    const data = await this.requestJson('/auth/me');
    return data.ok ? data.user : null;
  },

  // Fetch topics with filtering & entitlement
  async getTopics(classLevel = 'all', subject = 'all', search = '', labId = 'all') {
    const params = new URLSearchParams({ class_level: classLevel, subject, search, lab_id: labId });
    const data = await this.requestJson(`/topics?${params}`, {}, { topics: [] });
    if (data.error_code === 'auth_expired') this.logout();
    return data.ok ? (data.topics || []) : [];
  },

  // Get available pricing plans
  async getPlans() {
    const data = await this.requestJson('/payments/plans', {}, { plans: [] });
    return data.ok ? data : { ...data, error: data.detail || 'Pricing request failed.' };
  },

  // Create a payment order for a class band and duration
  async createOrder(duration = '1y', band = null, idempotencyKey = null) {
    const body = { duration: duration || '1y' };
    if (band) body.band = band;
    return this.requestJson('/payments/create-order', {
      method: 'POST',
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
      body: JSON.stringify(body)
    });
  },

  // Verify a payment with Razorpay order_id, payment_id, and signature
  async verifyPayment(orderId, paymentId, signature) {
    const data = await this.requestJson('/payments/verify', {
      method: 'POST',
      body: JSON.stringify({ order_id: orderId, payment_id: paymentId, signature })
    });
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
  },

  // Check entitlement for a specific content item
  async checkEntitlement(contentId) {
    return this.requestJson(`/entitlement/check?content_id=${encodeURIComponent(contentId)}`, {}, { allowed: false });
  },

  // Mark topic as mastered
  async markMastered(contentId, quizSessionId = null) {
    const data = await this.assessmentRequest('/progress/master', {
      method: 'POST',
      body: JSON.stringify({ content_id: contentId, ...(quizSessionId ? { quiz_session_id: quizSessionId } : {}) })
    });
    return data.ok ? data : { ...data, status: 'error' };
  },

  // Remove a server-recorded mastery mark for the authenticated learner.
  async unmarkMastered(contentId) {
    const data = await this.assessmentRequest('/progress/unmaster', {
      method: 'POST',
      body: JSON.stringify({ content_id: contentId })
    });
    return data.ok ? data : { ...data, status: 'error' };
  },

  // Start a short-lived server-bound quiz session. The response contains only
  // question text/options; answer keys stay in the API's trusted registry.
  async createQuizSession(contentId) {
    const data = await this.assessmentRequest('/quiz/sessions', {
      method: 'POST',
      body: JSON.stringify({ content_id: contentId })
    });
    if (!data.ok) return { ...data, status: 'error', detail: data.detail || 'Secure quiz is unavailable. Please retry.' };
    return data;
  },

  // Start a server-bound aggregate review (chapter, board, mixed, or exam).
  // The response contains question text/options only; source mappings and
  // answer keys remain in the server-side quiz session.
  async createReviewSession(selector = {}) {
    const data = await this.assessmentRequest('/quiz/review-sessions', {
      method: 'POST',
      body: JSON.stringify(selector || {})
    });
    if (!data.ok) return { ...data, status: 'error', detail: data.detail || 'Secure review is unavailable. Please retry.' };
    return data;
  },

  // Evaluate one answer in an aggregate review session.
  async logReviewAttempt(reviewSessionId, questionIndex, selectedIdx) {
    return this.assessmentRequest('/quiz/review-evaluate', {
      method: 'POST',
      body: JSON.stringify({
        review_session_id: reviewSessionId,
        question_index: questionIndex,
        selected_option_index: selectedIdx,
      })
    });
  },

  // Get user progress
  async getProgress() {
    const user = JSON.parse(avyaanStorage.getItem('avyaan_user') || '{}');
    if (!user.id) return null;
    const data = await this.requestJson(`/progress/${encodeURIComponent(user.id)}`);
    return data.ok ? data : null;
  },

  // Log a quiz attempt
  async logQuizAttempt(contentId, questionIndex, selectedIdx, selectedText, quizSessionId = null) {
    return this.assessmentRequest('/quiz/evaluate', {
      method: 'POST',
      body: JSON.stringify({
        content_id: contentId,
        question_index: questionIndex,
        selected_option_index: selectedIdx,
        ...(quizSessionId ? { quiz_session_id: quizSessionId } : {}),
        selected_option_text: selectedText,
      })
    });
  },

  // Get topic detail with full metadata
  async getTopicDetail(contentId) {
    return this.requestJson(`/topics/${encodeURIComponent(contentId)}`, {}, { topic: null });
  },

  // Get personalized recommendations
  async getRecommendations() {
    return this.requestJson('/topics/recommendations/next', {}, { recommendations: [] });
  },

  // Get due reviews (spaced repetition)
  async getDueReviews() {
    const data = await this.assessmentRequest('/review/due');
    return data.ok ? data : { due_count: 0, reviews: [], ...data };
  },

  // Mark a topic as reviewed (spaced repetition)
  async markReviewed(contentId, quizSessionId = null) {
    const query = `?content_id=${encodeURIComponent(contentId)}${quizSessionId ? `&quiz_session_id=${encodeURIComponent(quizSessionId)}` : ''}`;
    return this.assessmentRequest(`/review/mark${query}`, { method: 'POST' });
  },

  // Sync lab progress (from postMessage bridge)
  async syncLabProgress(labId, completedLessonIds, lastVisitedLesson) {
    return this.assessmentRequest('/review/sync-lab-progress', {
      method: 'POST',
      body: JSON.stringify({
        lab_id: labId,
        completed_lesson_ids: completedLessonIds,
        last_visited_lesson: lastVisitedLesson,
      })
    });
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
      const res = await this.fetchWithTimeout(`${this.baseUrl}/progress/blob`, {
        method: 'PUT',
        credentials: 'include',
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
      const res = await this.fetchWithTimeout(`${this.baseUrl}/progress/blob/${user.id}`, {
        credentials: 'include', headers: this.authHeaders()
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
      const res = await this.fetchWithTimeout(`${this.baseUrl}/progress/join-class`, { method: 'POST', credentials: 'include',
         headers: this.authHeaders(), body: JSON.stringify({ class_code: String(classCode).trim() }) });
      return await res.json();
    } catch (e) { return { status: 'error', detail: e.message }; }
  },

  async createClass(grade = null) {
    try {
      const res = await this.fetchWithTimeout(`${this.baseUrl}/progress/create-class`, {
        method: 'POST',
        credentials: 'include',
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
      const res = await this.fetchWithTimeout(`${this.baseUrl}/progress/roster/${encodeURIComponent(classCode)}`, {
        credentials: 'include', headers: this.authHeaders()
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
      const res = await this.fetchWithTimeout(`${this.baseUrl}/progress/report-email`, {
        method: 'POST', credentials: 'include',
         headers: this.authHeaders(),
        body: JSON.stringify({ report_id: reportId, email: email, subject: subject })
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) { return null; }
  },

  async getTopicContent(topicId) {
    try {
      if (!topicId || !this.getToken()) return null;
      const res = await this.fetchWithTimeout(`${this.baseUrl}/topics/${encodeURIComponent(topicId)}/content`, { credentials: 'include', headers: this.authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ...data, status: res.status, ok: false, error_code: this.classifyError(res.status, data.detail) };
      return { ...data, ok: true, error_code: null };
    } catch (e) { return null; }
  },

  async createServerReport(childId, periodStart = null, periodEnd = null, parentNote = null) {
    try {
      if (!childId || !this.getToken()) return null;
      const res = await this.fetchWithTimeout(`${this.baseUrl}/progress/reports`, {
        method: 'POST', credentials: 'include',
         headers: this.authHeaders(),
        body: JSON.stringify({ child_id: childId, period_start: periodStart, period_end: periodEnd, parent_note: parentNote })
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) { return null; }
  },

  async createReportShare(reportId, title) {
    try {
      if (!reportId || !this.getToken()) return null;
      const res = await this.fetchWithTimeout(`${this.baseUrl}/progress/report-share`, {
        method: 'POST', credentials: 'include',
         headers: this.authHeaders(),
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
      const res = await this.fetchWithTimeout(`${this.baseUrl}/consent/status`, { credentials: 'include', headers: this.authHeaders() });
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
      const res = await this.fetchWithTimeout(`${this.baseUrl}/consent/update`, {
        method: 'PATCH',
        credentials: 'include',
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
      const res = await this.fetchWithTimeout(`${this.baseUrl}/parent/generate-code`, {
        method: 'POST',
        credentials: 'include', headers: this.authHeaders()
      });
      return await res.json();
    } catch (e) {
      return { status: 'error', detail: e.message };
    }
  },

  // Link a child account using the one-time code (Parent role)
  async linkChild(code) {
    try {
      const res = await this.fetchWithTimeout(`${this.baseUrl}/parent/link`, {
        method: 'POST',
        credentials: 'include',
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
      const res = await this.fetchWithTimeout(this.baseUrl + '/parent/children', {
        method: 'POST', credentials: 'include',
         headers: this.authHeaders(),
        body: JSON.stringify({ display_name: String(displayName || '').trim(), class_level: Number(classLevel), avatar })
      });
      if (!res.ok) return { status: 'error', detail: (await res.json().catch(() => ({}))).detail || 'Could not create child' };
      return await res.json();
    } catch (e) { return { status: 'error', detail: e.message }; }
  },

  // List all linked children for this parent
  async getLinkedChildren() {
    try {
      const res = await this.fetchWithTimeout(`${this.baseUrl}/parent/children`, {
        credentials: 'include', headers: this.authHeaders()
      });
      if (!res.ok) return { children: [] };
      return await res.json();
    } catch (e) {
      return { children: [] };
    }
  },

  async revokeGuardianRelationship(childId) {
    try {
      const res = await this.fetchWithTimeout(this.baseUrl + '/parent/relationships/' + encodeURIComponent(childId) + '/revoke', {
        method: 'POST', credentials: 'include', headers: this.authHeaders()
      });
      if (!res.ok) return { status: 'error', detail: (await res.json().catch(() => ({}))).detail || 'Could not revoke relationship' };
      return await res.json();
    } catch (e) { return { status: 'error', detail: e.message }; }
  },

  // Server-side aggregated learning summary for a linked child
  async getChildSummary(childId) {
    try {
      const res = await this.fetchWithTimeout(`${this.baseUrl}/parent/child/${encodeURIComponent(childId)}/summary`, {
        credentials: 'include', headers: this.authHeaders()
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
      const res = await this.fetchWithTimeout(`${this.baseUrl}/admin/metrics`, {
        credentials: 'include', headers: this.authHeaders()
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

