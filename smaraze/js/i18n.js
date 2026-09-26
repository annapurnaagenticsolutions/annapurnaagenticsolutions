/* Skill X locale readiness layer.
 * Concept IDs, progress, mastery, and entitlement never vary by locale.
 * Non-English bundles are intentionally marked pending until translated and reviewed.
 */
(function (global) {
  'use strict';
  var STORAGE_KEY = 'avyaan_locale';
  var locales = [
    { code: 'en-IN', label: 'English (India)' },
    { code: 'hi-IN', label: 'हिन्दी (Hindi)', status: 'Translation in progress' },
    { code: 'or-IN', label: 'ଓଡ଼ିଆ (Odia)', status: 'Translation in progress' },
    { code: 'bn-IN', label: 'বাংলা (Bengali)', status: 'Translation in progress' },
    { code: 'ta-IN', label: 'தமிழ் (Tamil)', status: 'Translation in progress' },
    { code: 'te-IN', label: 'తెలుగు (Telugu)', status: 'Translation in progress' }
  ];
  var messages = {
    'en-IN': {
      'locale.label': 'Language',
      'locale.englishFallback': 'English content',
      'locale.pending': 'Translation in progress',
      'locale.note': 'Changing language changes labels when a reviewed translation is available. Your learning record stays with the same concept.',
      'context.kicker': 'INDIA-FIRST LENS · OPTIONAL',
      'context.title': 'See the idea in a familiar place',
      'context.disclaimer': 'Choose the example that feels familiar. It is an invitation, not an assumption about your home, city, or income.',
      'context.safety': 'Observation only. Ask an adult before using heat, pressure, chemicals, tools, or electricity.',
      'context.explore': 'Explore this connection'
    }
  };
  function readLocale() {
    try {
      var value = global.localStorage.getItem(STORAGE_KEY);
      return locales.some(function (item) { return item.code === value; }) ? value : 'en-IN';
    } catch (e) { return 'en-IN'; }
  }
  var active = readLocale();
  function getLocale() { return active; }
  function setLocale(value) {
    if (!locales.some(function (item) { return item.code === value; })) value = 'en-IN';
    active = value;
    try { global.localStorage.setItem(STORAGE_KEY, value); } catch (e) {}
    try { global.dispatchEvent(new CustomEvent('avyaan:locale-changed', { detail: { locale: value } })); } catch (e) {}
    return active;
  }
  function t(key, fallback) {
    var current = messages[active] && messages[active][key];
    var english = messages['en-IN'][key];
    return current || english || fallback || key;
  }
  function localeInfo(value) {
    var code = value || active;
    var item = locales.find(function (entry) { return entry.code === code; }) || locales[0];
    return { code: item.code, label: item.label, status: item.status || 'English content' };
  }
  function topicKeys(topic) {
    var safeId = String(topic && topic.id || '').replace(/[^a-zA-Z0-9_-]/g, '-');
    return {
      title: 'topic.' + safeId + '.title',
      summary: 'topic.' + safeId + '.summary',
      explanation: 'topic.' + safeId + '.explanation',
      outcome: 'topic.' + safeId + '.outcome'
    };
  }
  function topicText(topic, field) {
    if (!topic) return '';
    var key = topic[field + '_key'] || topicKeys(topic)[field];
    var localized = messages[active] && messages[active][key];
    return localized || topic[field] || '';
  }
  function statusLine() {
    var info = localeInfo();
    return info.code === 'en-IN' ? t('locale.englishFallback') : info.status;
  }
  global.AvyaanI18n = {
    getLocale: getLocale,
    setLocale: setLocale,
    supportedLocales: function () { return locales.slice(); },
    getState: function () { var info = localeInfo(); return { locale: info.code, label: info.label, status: statusLine() }; },
    t: t,
    topicKeys: topicKeys,
    topicText: topicText,
    translationStatus: function (value) { return localeInfo(value).status || 'Translation in progress'; }
  };
})(window);

