/* India-first example lenses. These are optional learning connections, not curriculum claims. */
(function (global) {
  'use strict';
  var examples = {
    'Mathematics': [
      { key: 'rupees-market', label: 'A local market', prompt: 'If a fruit seller charges ₹12 for one mango, how many rupees would 3 mangoes cost? What information would you need to check before paying?', safety: '' },
      { key: 'cricket-score', label: 'A cricket score', prompt: 'Use the scorecard to explain the numbers: what changes when a team scores 4 runs, and how could you estimate the total after several overs?', safety: '' },
      { key: 'train-timetable', label: 'A train timetable', prompt: 'Compare two departure times or distances on a timetable. Which number tells you when the journey starts, and which tells you how far it goes?', safety: '' },
      { key: 'map-distance', label: 'A neighbourhood map', prompt: 'Choose two places you know. How could a scale or a step count help you estimate the distance between them?', safety: '' }
    ],
    'Physics': [
      { key: 'bicycle-motion', label: 'A bicycle ride', prompt: 'Notice what changes when a bicycle speeds up, slows down, or turns. Which force or motion idea helps explain the change?', safety: 'Observation only. Ask an adult before riding near traffic.' },
      { key: 'fan-air', label: 'A ceiling fan', prompt: 'Watch how the fan moves air. What might change if the speed changes, and how could you describe that change without touching the appliance?', safety: 'Observation only. Never touch a moving fan or its wiring.' },
      { key: 'monsoon-drainage', label: 'Rainwater after a monsoon shower', prompt: 'Where does water collect and where does it flow? Use slope, friction, or pressure to explain one observation.', safety: 'Observe from a dry, safe place; never enter fast-moving water.' },
      { key: 'cricket-ball', label: 'A cricket ball in play', prompt: 'Compare a gentle throw with a fast throw. What evidence would show a change in speed, direction, or impact?', safety: 'Observe from a safe distance and follow the adult or coach’s rules.' }
    ],
    'Chemistry': [
      { key: 'cooking-mixture', label: 'A kitchen mixture', prompt: 'Think about salt dissolving in water or ingredients mixing. Which parts can be separated again, and which new clues would you look for?', safety: 'Observation only. No tasting unknown substances and no heat without an adult.' },
      { key: 'turmeric-indicator', label: 'Turmeric and colour', prompt: 'Turmeric can change colour with some household substances. What change would count as evidence, and what would be an unfair conclusion?', safety: 'Use only a teacher-approved activity with an adult; never mix cleaners.' },
      { key: 'rust', label: 'A rusty gate or bicycle', prompt: 'What clues show that the material has changed? Which parts of air or water might be involved?', safety: 'Observe; do not scrape rust or handle damaged metal without an adult.' }
    ],
    'Biology': [
      { key: 'local-plant', label: 'A plant near you', prompt: 'Look at a plant in a garden, balcony, or roadside space. Which feature helps it get light, water, or protection?', safety: 'Do not touch unknown plants or insects.' },
      { key: 'food-nutrition', label: 'A familiar meal', prompt: 'Choose one food from a meal and identify what it helps the body do. How could the same nutrient appear in another food?', safety: 'Use family-approved foods and respect allergies.' },
      { key: 'mosquito-safety', label: 'Standing water check', prompt: 'Where could mosquitoes breed after rain? What safe, adult-led action could reduce standing water?', safety: 'Adults should handle cleaning, repellents, and any chemicals.' }
    ],
    'Earth & Space': [
      { key: 'monsoon-cycle', label: 'Monsoon clouds', prompt: 'Describe what you notice before and after rain. How could heating, cooling, and water movement explain the pattern?', safety: 'Stay indoors during lightning and follow local weather advice.' },
      { key: 'indian-ocean', label: 'The Indian Ocean', prompt: 'Use a map to trace how land and water are arranged. How might that shape weather or travel?', safety: '' },
      { key: 'isro-mission', label: 'A space mission', prompt: 'Find one mission fact from an official source. Which part is an observation, and which part is your explanation?', safety: 'Use trusted sources and check the date of mission information.' }
    ],
    'Computer Science & AI': [
      { key: 'qr-code', label: 'A QR code', prompt: 'A QR code stores a pattern that a device reads. What steps could an algorithm follow from scan to result?', safety: 'Scan only codes from trusted people or organisations; never share passwords or OTPs.' },
      { key: 'mobile-network', label: 'A mobile network', prompt: 'Imagine a message travelling from one phone to another. Which steps, checks, or delays might an algorithm manage?', safety: '' },
      { key: 'privacy-choice', label: 'A privacy choice', prompt: 'Before an app asks for access, what question should you ask about the purpose and the minimum information needed?', safety: 'Never share a child’s password, OTP, or private photo for an experiment.' }
    ]
  };
  function hash(value) {
    var text = String(value || ''), total = 0;
    for (var i = 0; i < text.length; i += 1) total = (total * 31 + text.charCodeAt(i)) >>> 0;
    return total;
  }
  function contextForTopic(topic) {
    if (!topic) return null;
    var list = examples[topic.subject] || examples['Mathematics'];
    return list[hash(topic.id) % list.length];
  }
  function renderIndiaContext(topic) {
    var item = contextForTopic(topic);
    if (!item) return '';
    var safe = typeof escapeHtml === 'function' ? escapeHtml : function (value) { return String(value || ''); };
    var t = global.AvyaanI18n ? global.AvyaanI18n.t : function (key, fallback) { return fallback || key; };
    return '<section class="india-context-card" aria-labelledby="indiaContextTitle">' +
      '<div class="india-context-kicker">' + safe(t('context.kicker', 'INDIA-FIRST LENS · OPTIONAL')) + '</div>' +
      '<h3 id="indiaContextTitle">' + safe(t('context.title', 'See the idea in a familiar place')) + '</h3>' +
      '<p class="india-context-place"><strong>' + safe(item.label) + '</strong> · ' + safe(item.prompt) + '</p>' +
      (item.safety ? '<p class="india-context-safety">🛡️ ' + safe(item.safety) + '</p>' : '') +
      '<p class="india-context-note">' + safe(t('context.disclaimer', 'Choose the example that feels familiar. It is an invitation, not an assumption about your home, city, or income.')) + '</p>' +
      '<button class="btn india-context-action" type="button" onclick="this.setAttribute(\'aria-pressed\', \'true\'); this.textContent=\'✓ Connection noted\';">' + safe(t('context.explore', 'Explore this connection')) + '</button>' +
    '</section>';
  }
  global.AVYAAN_CONTEXT_LIBRARY = examples;
  global.contextForTopic = contextForTopic;
  global.renderIndiaContext = renderIndiaContext;
})(window);

