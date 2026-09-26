/* Shared navigation behaviour for static informational pages. */
(function () {
  'use strict';
  function toggleMobileNav() {
    var panel = document.getElementById('mobileNavPanel');
    var trigger = document.querySelector('.nav-hamburger');
    if (!panel) return;
    var open = panel.classList.toggle('active');
    panel.setAttribute('aria-hidden', String(!open));
    if (trigger) trigger.setAttribute('aria-expanded', String(open));
  }
  // Keep the small public helper for older cached shells, but bind new pages
  // with a data attribute so static navigation does not need inline handlers.
  if (typeof window.toggleMobileNav !== 'function') window.toggleMobileNav = toggleMobileNav;
  document.addEventListener('click', function (event) {
    var toggle = event.target.closest && event.target.closest('[data-nav-toggle]');
    if (toggle) { event.preventDefault(); toggleMobileNav(); return; }
    var panel = document.getElementById('mobileNavPanel');
    var trigger = document.querySelector('.nav-hamburger');
    if (!panel || !panel.classList.contains('active')) return;
    if (!panel.contains(event.target) && (!trigger || !trigger.contains(event.target))) {
      panel.classList.remove('active');
      panel.setAttribute('aria-hidden', 'true');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    var panel = document.getElementById('mobileNavPanel');
    var trigger = document.querySelector('.nav-hamburger');
    if (panel && panel.classList.contains('active')) {
      panel.classList.remove('active');
      panel.setAttribute('aria-hidden', 'true');
      if (trigger) {
        trigger.setAttribute('aria-expanded', 'false');
        trigger.focus();
      }
    }
  });
  function setYear() {
    var year = new Date().getFullYear();
    document.querySelectorAll('#copyrightYear').forEach(function (el) { el.textContent = year; });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setYear);
  else setYear();
}());