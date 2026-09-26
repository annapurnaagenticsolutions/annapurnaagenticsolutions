(function (global) {
  'use strict';

  const ROLE_DEFINITIONS = {
    core: { id: 'core', label: 'Core path', description: 'A foundation lesson for the learner’s class path.', tone: 'blue' },
    support: { id: 'support', label: 'Support', description: 'A focused lesson that strengthens an earlier idea.', tone: 'teal' },
    explore: { id: 'explore', label: 'Explore more', description: 'An optional connection for curiosity and transfer.', tone: 'violet' },
    challenge: { id: 'challenge', label: 'Challenge', description: 'A stretch application that asks for extra reasoning.', tone: 'amber' }
  };

  function normalizeRole(value) {
    const role = String(value || '').trim().toLowerCase();
    return ROLE_DEFINITIONS[role] || null;
  }

  function getTopicLearningRole(topic) {
    if (!topic) return ROLE_DEFINITIONS.core;
    const authored = normalizeRole(topic.learning_role || topic.learningRole || topic.role);
    if (authored) return authored;
    const title = String(topic.title || '').toLowerCase();
    const chapter = String(topic.chapter || '').toLowerCase();
    const id = String(topic.id || '').toLowerCase();
    const difficulty = String(topic.difficulty || '').toLowerCase();
    const isChallenge = difficulty === 'hard' || /challenge|advanced| olympiad|board prep|museum_/.test(title + ' ' + id);
    if (isChallenge) return ROLE_DEFINITIONS.challenge;
    const isExplore = /museum_|life_|space|everyday|community|project|experiment|explor/.test(title + ' ' + chapter + ' ' + id) && Number(topic.class_level || 1) <= 7;
    if (isExplore) return ROLE_DEFINITIONS.explore;
    const isSupport = /review|revision|practice|reinforce|remedial|mixed/.test(title + ' ' + chapter + ' ' + id);
    if (isSupport) return ROLE_DEFINITIONS.support;
    return ROLE_DEFINITIONS.core;
  }

  global.AVYAAN_TOPIC_ROLE_DEFINITIONS = ROLE_DEFINITIONS;
  global.getTopicLearningRole = getTopicLearningRole;
})(window);