/* Safe, optional off-screen prompts. Completion is exploratory evidence only. */
(function (global) {
  'use strict';
  var prompts = [
    { key: 'symmetry', title: 'Find three symmetrical objects', prompt: 'Look around your home or school for three objects with a line or pattern of symmetry. You can point, sketch, or tell a parent what you noticed.', supervision: false },
    { key: 'shadow', title: 'Observe a shadow twice', prompt: 'With an adult nearby, notice one safe shadow now and again later. What changed: its direction, length, or both?', supervision: true },
    { key: 'measure', title: 'Estimate, then measure', prompt: 'Choose five safe household objects. Estimate their length, then measure with a ruler or a familiar object. Which estimate was closest?', supervision: true },
    { key: 'sort-leaves', title: 'Sort leaves by visible features', prompt: 'With permission, compare a few fallen leaves by shape, edge, or colour. Do not pick unknown plants. Explain one group you made.', supervision: true },
    { key: 'container', title: 'Estimate a container', prompt: 'Choose an empty, safe container. Estimate how much it could hold, then compare with a known cup or bottle. Do not use hot or hazardous liquids.', supervision: true }
  ];
  function choose(seed) { var text = String(seed || ''), total = 0; for (var i = 0; i < text.length; i += 1) total = (total * 31 + text.charCodeAt(i)) >>> 0; return prompts[total % prompts.length]; }
  global.AVYAAN_OFFSCREEN_PROMPTS = prompts;
  global.getOffscreenPrompt = choose;
})(window);
