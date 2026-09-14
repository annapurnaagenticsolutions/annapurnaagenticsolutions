(function (window) {
  'use strict';

  // Learner data is isolated per account and child. Identity/session hints stay
  // global because they describe the browser's current authenticated session.
  function memoryStorage() {
    var data = new Map();
    return {
      get length() { return data.size; },
      key: function (i) { return Array.from(data.keys())[i] || null; },
      getItem: function (k) { k = String(k); return data.has(k) ? data.get(k) : null; },
      setItem: function (k, v) { data.set(String(k), String(v)); },
      removeItem: function (k) { data.delete(String(k)); }
    };
  }

  var raw;
  try {
    raw = window.localStorage;
    // Accessing length detects privacy-mode/security restrictions early.
    void raw.length;
  } catch (e) {
    // Keep the app usable in restricted/private contexts without pretending
    // device data is durable. Cloud sync still remains server-authoritative.
    raw = memoryStorage();
    window.avyaanStorageEphemeral = true;
  }
  var VERSION = '2';
  var IDENTITY_KEYS = new Set([
    'avyaan_user', 'avyaan_token', 'avyaan_cookie_session'
  ]);
  var ACCOUNT_KEYS = new Set([
    'avyaan_parent_email', 'avyaan_parent_profile', 'avyaan_family_profiles',
    'avyaan_weekly_email_subscribed', 'avyaan_report_email_queued',
    'avyaan_consent_analytics', 'avyaan_onboarded'
  ]);

  function readUser() {
    try { return JSON.parse(raw.getItem('avyaan_user') || '{}') || {}; }
    catch (e) { return {}; }
  }

  function safePart(value, fallback) {
    var s = String(value == null || value === '' ? fallback : value);
    return s.replace(/[^A-Za-z0-9._~-]/g, '_').slice(0, 120) || fallback;
  }

  function scopeParts() {
    var user = readUser();
    var account = user.account_id || user.parent_id || user.id || 'guest';
    // Parent dashboards remain account-scoped until a real learner session is
    // issued. A learner session may set _activeLearnerId explicitly.
    var child = window._activeLearnerId || user.child_id ||
      (String(user.role || '').toLowerCase() === 'student' ? user.id : 'default');
    return { account: safePart(account, 'guest'), child: safePart(child, 'default') };
  }

  function accountPrefix() {
    return 'avyaan:' + scopeParts().account + ':account:';
  }

  function learnerPrefix() {
    var s = scopeParts();
    return 'avyaan:' + s.account + ':' + s.child + ':';
  }

  function logicalKey(key) {
    key = String(key);
    if (!key.startsWith('avyaan_')) return key;
    if (IDENTITY_KEYS.has(key)) return key;
    if (ACCOUNT_KEYS.has(key)) return accountPrefix() + key;
    return learnerPrefix() + key;
  }

  function visibleKeys() {
    var lp = learnerPrefix();
    var ap = accountPrefix();
    var out = [];
    for (var i = 0; i < raw.length; i++) {
      var k = raw.key(i);
      if (!k) continue;
      if (IDENTITY_KEYS.has(k) || (!k.startsWith('avyaan:') && !k.startsWith('avyaan_'))) {
        out.push(k);
      } else if (k.startsWith(lp)) {
        out.push(k.slice(lp.length));
      } else if (k.startsWith(ap)) {
        out.push(k.slice(ap.length));
      }
    }
    return Array.from(new Set(out));
  }

  function migrateLegacy() {
    if (raw.getItem('avyaan:storage:v' + VERSION) === '1') return;
    var keys = [];
    for (var i = 0; i < raw.length; i++) {
      var k = raw.key(i);
      if (k && k.startsWith('avyaan_') && !IDENTITY_KEYS.has(k)) keys.push(k);
    }
    keys.forEach(function (k) {
      var target = logicalKey(k);
      var value = raw.getItem(k);
      if (value !== null && raw.getItem(target) === null) raw.setItem(target, value);
      raw.removeItem(k);
    });
    raw.setItem('avyaan:storage:v' + VERSION, '1');
  }

  migrateLegacy();

  var api = {
    getItem: function (key) {
      return raw.getItem(logicalKey(key));
    },
    setItem: function (key, value) {
      raw.setItem(logicalKey(key), String(value));
    },
    removeItem: function (key) {
      raw.removeItem(logicalKey(key));
    },
    key: function (index) {
      return visibleKeys()[index] || null;
    },
    keys: function () {
      return visibleKeys();
    },
    get length() {
      return visibleKeys().length;
    },
    clearLearnerScope: function () {
      var lp = learnerPrefix();
      var keys = [];
      for (var i = 0; i < raw.length; i++) {
        var k = raw.key(i);
        if (k && k.startsWith(lp)) keys.push(k);
      }
      keys.forEach(function (k) { raw.removeItem(k); });
    },
    clearAccountScope: function () {
      var ap = accountPrefix();
      var keys = [];
      for (var i = 0; i < raw.length; i++) {
        var k = raw.key(i);
        if (k && k.startsWith(ap)) keys.push(k);
      }
      keys.forEach(function (k) { raw.removeItem(k); });
    },
    setActiveLearner: function (childId) {
      window._activeLearnerId = childId ? String(childId) : null;
    },
    getActiveScope: function () {
      var s = scopeParts();
      return { account_id: s.account, child_id: s.child };
    }
  };

  window.avyaanStorage = api;
  window.avyaanStorageRaw = raw;
})(window);
