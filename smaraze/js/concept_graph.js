(function (global) {
  'use strict';

  const relationMeta = {
    prerequisite: { label: 'Builds from', icon: '🧱', description: 'A related idea at an earlier or equal class level.' },
    related: { label: 'Connects to', icon: '🔗', description: 'A parallel idea that helps transfer the concept.' },
    next: { label: 'Leads to', icon: '➡️', description: 'A related idea at a later class level or stretch context.' }
  };

  function relationFor(source, partner) {
    const sourceClass = Number(source && source.class_level || 0);
    const partnerClass = Number(partner && partner.class_level || 0);
    if (partnerClass && sourceClass && partnerClass < sourceClass) return 'prerequisite';
    if (partnerClass && sourceClass && partnerClass > sourceClass) return 'next';
    return 'related';
  }

  function getConceptConnections(topicId, data) {
    const topics = Array.isArray(data && data.topics) ? data.topics : [];
    const bridges = Array.isArray(data && data.bridges) ? data.bridges : [];
    const source = topics.find(topic => topic && topic.id === topicId);
    if (!source) return [];
    const byId = new Map(topics.map(topic => [topic.id, topic]));
    return bridges.filter(bridge => bridge && (bridge.a === topicId || bridge.b === topicId)).map(bridge => {
      const partnerId = bridge.a === topicId ? bridge.b : bridge.a;
      const partner = byId.get(partnerId);
      if (!partner) return null;
      const relation = relationFor(source, partner);
      return { id: partner.id, topic: partner, reason: String(bridge.reason || 'A related idea worth exploring.'), relation, meta: relationMeta[relation] };
    }).filter(Boolean).sort((a, b) => {
      const order = { prerequisite: 0, related: 1, next: 2 };
      return order[a.relation] - order[b.relation] || a.topic.title.localeCompare(b.topic.title);
    });
  }

  global.AVYAAN_CONCEPT_RELATIONS = relationMeta;
  global.getConceptConnections = getConceptConnections;
})(window);