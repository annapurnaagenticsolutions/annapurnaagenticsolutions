/* Shared navigation behaviour for static informational pages. */
(function () {
  'use strict';
  if (typeof window.toggleMobileNav === 'function') return;
  window.toggleMobileNav = function () {
    var panel = document.getElementById('mobileNavPanel');
    var trigger = document.querySelector('.nav-hamburger');
    if (!panel) return;
    var open = panel.classList.toggle('active');
    panel.setAttribute('aria-hidden', String(!open));
    if (trigger) trigger.setAttribute('aria-expanded', String(open));
  };
  document.addEventListener('click', function (event) {
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
}());
