/*
 * Skill X learning evidence telemetry.
 *
 * This is deliberately small, consent-gated and learner-scoped. It records
 * learning-process evidence, never answer text, names, emails, credentials or
 * free-form learner writing. Events remain on-device until a future
 * authenticated collector is available; a failed upload never changes
 * progress or mastery.
 */
(function (window) {
  'use strict';

  var QUEUE_KEY = 'avyaan_learning_event_queue';
  var SESSION_KEY = 'avyaan_learning_session_id';
  var MAX_QUEUE = 120;
  var MAX_BATCH = 20;
  var MAX_ATTEMPTS = 6;
  var RETRY_BASE_MS = 15000;
  var RETRY_MAX_MS = 15 * 60 * 1000;
  var flushInFlight = null;
  var ALLOWED = new Set([
    'lesson_start', 'lesson_step', 'lesson_abandon', 'lesson_complete',
    'hint_used', 'quiz_start', 'quiz_answer', 'quiz_complete',
    'review_start', 'review_complete', 'review_abandon', 'time_to_next_action',
    'content_error', 'auth_expired', 'offline_state', 'cache_mismatch'
  ]);

  function nowIso() { return new Date().toISOString(); }
  function uuid() {
    return window.crypto && window.crypto.randomUUID
      ? window.crypto.randomUUID()
      : 'evt-' + Date.now() + '-' + Math.random().toString(36).slice(2);
  }
  function sessionId() {
    try {
      var value = sessionStorage.getItem(SESSION_KEY);
      if (!value) { value = uuid(); sessionStorage.setItem(SESSION_KEY, value); }
      return value.slice(0, 80);
    } catch (_) { return 'ephemeral-' + uuid(); }
  }
  function consented() {
    return !!window.avyaanStorage && window.avyaanStorage.getItem('avyaan_consent_analytics') === 'yes';
  }
  function readQueue() {
    try {
      var items = JSON.parse(window.avyaanStorage.getItem(QUEUE_KEY) || '[]');
      return Array.isArray(items) ? items : [];
    } catch (_) { return []; }
  }
  function writeQueue(items) {
    if (!window.avyaanStorage) return;
    window.avyaanStorage.setItem(QUEUE_KEY, JSON.stringify(items.slice(-MAX_QUEUE)));
  }
  function numberField(value, min, max) {
    var n = Number(value);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : undefined;
  }
  function scopeField(value, fallback) {
    return String(value || fallback).replace(/[^A-Za-z0-9._:-]/g, '_').slice(0, 120);
  }
  function safeEvent(eventName, fields) {
    if (!ALLOWED.has(eventName)) return null;
    var data = fields && typeof fields === 'object' ? fields : {};
    var active = window.avyaanStorage && window.avyaanStorage.getActiveScope
      ? window.avyaanStorage.getActiveScope() : {};
    var event = {
      event_id: uuid(),
      event: eventName,
      occurred_at: nowIso(),
      session_id: sessionId(),
      source: navigator.onLine === false ? 'offline' : 'browser',
      account_scope: scopeField(active.account_id, 'guest'),
      child_scope: scopeField(active.child_id, 'default')
    };
    // Explicit allowlist: do not spread caller fields into an event.
    if (data.topic_id != null) event.topic_id = String(data.topic_id).replace(/[^A-Za-z0-9._:-]/g, '_').slice(0, 120);
    if (data.step != null) event.step = numberField(data.step, 1, 20);
    if (data.duration_ms != null) event.duration_ms = numberField(data.duration_ms, 0, 86400000);
    if (data.attempt_index != null) event.attempt_index = numberField(data.attempt_index, 0, 1000);
    if (typeof data.independent === 'boolean') event.independent = data.independent;
    if (typeof data.hint_used === 'boolean') event.hint_used = data.hint_used;
    if (data.outcome != null) event.outcome = String(data.outcome).replace(/[^A-Za-z0-9_.:-]/g, '_').slice(0, 64);
    if (data.error_code != null) event.error_code = String(data.error_code).replace(/[^A-Za-z0-9_.:-]/g, '_').slice(0, 64);
    return event;
  }
  function enqueue(event) {
    var queue = readQueue();
    if (queue.some(function (item) { return item.event_id === event.event_id; })) return;
    queue.push({ ...event, attempts: 0, next_attempt_at: 0 });
    writeQueue(queue);
  }
  function retryDelay(attempts) {
    return Math.min(RETRY_MAX_MS, RETRY_BASE_MS * Math.pow(2, Math.max(0, attempts - 1)));
  }
  function due(item, now) {
    return !Number(item.next_attempt_at || 0) || Number(item.next_attempt_at) <= now;
  }
  async function flush() {
    if (flushInFlight) return flushInFlight;
    flushInFlight = (async function () {
      if (!consented() || !navigator.onLine || !window.AvyaanAPI || typeof window.AvyaanAPI.sendLearningEvents !== 'function') return false;
      var queue = readQueue();
      if (!queue.length) return true;
      var now = Date.now();
      var batch = queue.filter(function (item) { return due(item, now) && Number(item.attempts || 0) < MAX_ATTEMPTS; }).slice(0, MAX_BATCH);
      if (!batch.length) return false;
      var result;
      try { result = await window.AvyaanAPI.sendLearningEvents(batch); } catch (_) { result = null; }
      var accepted = Number(result && result.accepted || 0);
      if (result && result.status === 'accepted' && accepted >= batch.length) {
        var sent = new Set(batch.map(function (item) { return item.event_id; }));
        writeQueue(queue.filter(function (item) { return !sent.has(item.event_id); }));
        return true;
      }
      var ids = new Set(batch.map(function (item) { return item.event_id; }));
      var updated = queue.map(function (item) {
        if (!ids.has(item.event_id)) return item;
        var attempts = Number(item.attempts || 0) + 1;
        return { ...item, attempts: attempts, next_attempt_at: Date.now() + retryDelay(attempts) };
      });
      writeQueue(updated);
      return false;
    })();
    try { return await flushInFlight; } finally { flushInFlight = null; }
  }
  function track(eventName, fields) {
    if (!consented()) return false;
    var event = safeEvent(eventName, fields);
    if (!event) return false;
    enqueue(event);
    if (navigator.onLine !== false) flush().catch(function () {});
    return true;
  }
  window.AvyaanTelemetry = Object.freeze({
    allowedEvents: function () { return Array.from(ALLOWED); },
    isConsented: consented,
    track: track,
    flush: flush,
    pendingCount: function () { return readQueue().length; }
  });
  window.addEventListener('online', function () { flush().catch(function () {}); });
})(window);
