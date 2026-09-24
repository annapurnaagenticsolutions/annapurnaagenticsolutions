(() => {
  const root = document.querySelector('[data-pramana-tool]');
  if (!root) return;

  const topics = [
    { id: 'map', group: 'Know the activity', title: 'Can teams map where digital personal data is collected, used, shared, stored and erased?', detail: 'Include the purpose, systems, people and parties involved.' },
    { id: 'roles', group: 'Know the activity', title: 'Are roles understood for each activity?', detail: 'Record who determines purpose and means, and where another party processes data on instructions.' },
    { id: 'purpose', group: 'Explain the activity', title: 'Are purposes and the applicable processing basis reviewed and documented?', detail: 'Check the actual facts and the relevant provision and commencement.' },
    { id: 'notice', group: 'Explain the activity', title: 'Can the organisation show what information is communicated to people and how consent or another permitted route is handled?', detail: 'Review the applicable Act provisions, Rules, dates and exceptions.' },
    { id: 'providers', group: 'Coordinate', title: 'Are recipients, service providers and responsibilities recorded?', detail: 'Review the activity, arrangements and any separate sector requirements.' },
    { id: 'security', group: 'Protect and respond', title: 'Are safeguards, incident escalation and response responsibilities assigned?', detail: 'Use the organisation’s actual systems, risks and applicable requirements.' },
    { id: 'retention', group: 'Protect and respond', title: 'Are retention and erasure decisions documented for relevant activities?', detail: 'Account for the purpose, applicable retention duties and current commencement.' },
    { id: 'requests', group: 'Respond to people', title: 'Is there a route to receive, assign and respond to requests or grievances?', detail: 'Confirm the applicable provisions, process ownership and timing from official sources.' },
    { id: 'evidence', group: 'Show the work', title: 'Can owners point to records showing decisions, implementation and review?', detail: 'Keep evidence proportionate to the activity and the decision being made.' },
    { id: 'children', group: 'Context to review', title: 'Could the activity involve children’s personal data, and have the relevant rules and conditions been checked?', detail: 'Review Section 9 and relevant Rules, commencement and any applicable exemption conditions.' },
    { id: 'automated', group: 'Context to review', title: 'Could personal data be used in a decision or an AI-enabled process?', detail: 'Check the actual purpose and applicable law. Section 8(3) applies in its stated circumstances; the Act does not create a universal human-review right for every automated decision.' },
    { id: 'sdf', group: 'Context to review', title: 'Has Significant Data Fiduciary status been checked against an official notification?', detail: 'Do not infer status from sector, organisation size or AI use.' },
    { id: 'transfers', group: 'Context to review', title: 'Are cross-border transfers or regulated payment or Aadhaar services involved?', detail: 'Review Section 16, Rules 13(4) and 15 where relevant, current official instruments and any separate sector requirements.' },
    { id: 'scope', group: 'Context to review', title: 'Have scope, exemptions and effective dates been checked for the actual activity?', detail: 'The Act and Rules have phased commencement. Confirm the provision and current official instruments before acting.' }
  ];
  const sectorPrompts = {
    service: 'For digital services, map account, support, usage and analytics activities separately.',
    care: 'For health and care, identify the activity and check relevant official health-sector instruments separately.',
    education: 'For education, identify learner and parent-facing activities; do not assume every use is prohibited or exempt.',
    finance: 'For finance and payments, map each payment or account activity and check current official sector instruments.',
    workforce: 'For workforce activities, distinguish recruitment, employment, benefits and service-provider processing.',
    commerce: 'For commerce, map ordering, fulfilment, support, subscriptions and measurement activities separately.'
  };
  const topicsRoot = document.getElementById('assessment-questions');
  const summary = document.getElementById('assessment-summary');
  const form = document.getElementById('assessment-form');

  const make = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  };

  function renderQuestions() {
    if (!topicsRoot) return;
    topicsRoot.replaceChildren();
    topics.forEach((topic, index) => {
      const card = make('fieldset', 'assessment-question');
      card.dataset.topicId = topic.id;
      const legend = make('legend', '', `${index + 1}. ${topic.title}`);
      const detail = make('p', 'assessment-detail', topic.detail);
      card.append(legend, detail);
      const choices = make('div', 'assessment-options');
      [
        ['in-place', 'In place, with evidence'],
        ['partial', 'In progress or evidence incomplete'],
        ['not-in-place', 'Not in place'],
        ['unsure', 'Not sure yet'],
        ['na', 'Not applicable']
      ].forEach(([value, label], choiceIndex) => {
        const id = `answer-${topic.id}-${choiceIndex}`;
        const wrapper = make('label', 'assessment-option');
        const input = document.createElement('input');
        input.type = 'radio'; input.name = topic.id; input.value = value; input.id = id; input.required = true;
        wrapper.htmlFor = id;
        wrapper.append(input, make('span', '', label));
        choices.append(wrapper);
      });
      card.append(choices);
      topicsRoot.append(card);
    });
  }

  function assess(event) {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const answers = new Map(topics.map((topic) => [topic.id, new FormData(form).get(topic.id)]));
    const count = (key) => [...answers.values()].filter((value) => value === key).length;
    const selected = document.getElementById('organisation-context');
    const report = document.createElement('div');
    report.className = 'assessment-result';
    report.append(make('p', 'eyebrow', 'YOUR DISCUSSION SNAPSHOT'));
    report.append(make('h2', '', 'A clear list of what to review next'));
    report.append(make('p', '', `Context selected: ${selected.options[selected.selectedIndex].text}. ${sectorPrompts[selected.value] || ''}`));
    const metrics = make('div', 'assessment-metrics');
    [['In place with evidence', count('in-place')], ['In progress', count('partial')], ['Needs clarification', count('not-in-place') + count('unsure')], ['Not applicable', count('na')]].forEach(([label, number]) => {
      const metric = make('div', 'assessment-metric');
      metric.append(make('strong', '', String(number)), make('span', '', label)); metrics.append(metric);
    });
    report.append(metrics);
    report.append(make('h3', '', 'Topics for follow-up'));
    const list = make('ul', 'assessment-followups');
    topics.forEach((topic) => {
      const answer = answers.get(topic.id);
      if (answer === 'in-place' || answer === 'na') return;
      const item = make('li');
      item.append(make('strong', '', topic.title), make('span', '', answer === 'partial' ? 'In progress / evidence incomplete' : answer === 'unsure' ? 'Not sure yet' : 'Not in place'));
      list.append(item);
    });
    if (!list.children.length) list.append(make('li', '', 'Your responses show no topics marked for follow-up. Keep the underlying evidence and review the facts and applicable dates with responsible people.'));
    report.append(list);
    const note = make('p', 'pr-note', 'This is an informational self-review snapshot based only on your selections. It is not a compliance score, legal opinion, applicability finding, penalty estimate or certification. “Not sure” is a prompt for review, not a finding of non-compliance. Your answers remain in this browser page; they are not saved or sent.');
    report.append(note);
    const actions = make('div', 'assessment-actions');
    const print = make('button', 'pr-button', 'Print or save as PDF'); print.type = 'button'; print.dataset.print = '';
    const restart = make('button', 'pr-button pr-button-secondary', 'Start again'); restart.type = 'button'; restart.dataset.restart = '';
    actions.append(print, restart); report.append(actions);
    report.append(make('p', 'assessment-source', 'Check current official sources and commencement before acting.'));
    const sourceLink = document.createElement('a'); sourceLink.href = '/pramana/sources/'; sourceLink.textContent = 'Open the official DPDP source guide'; report.lastChild.append(' ', sourceLink);
    summary.replaceChildren(report); summary.hidden = false;
    summary.focus();
  }

  const scenarioData = {
    service: { title: 'Customer service', summary: 'A support team uses account and conversation data to answer requests and proposes a new service-improvement use.', facts: ['What information is involved, and whose data is it?', 'What purpose was communicated, and what new purpose is proposed?', 'Who owns the decision and what evidence is needed?'] },
    care: { title: 'Health and care', summary: 'A care organisation uses appointment and service records across its own teams and external providers.', facts: ['Which care and administrative activities are in scope?', 'Which parties receive or process the information?', 'Which current sector instruments need separate review?'] },
    education: { title: 'Education and learning', summary: 'A learning service is considering analytics that may involve learner activity and children’s data.', facts: ['What age and activity facts need confirmation?', 'Which purposes, parties and controls are involved?', 'Have responsible people reviewed the applicable provisions, commencement and conditions?'] },
    finance: { title: 'Finance and payments', summary: 'A payment journey involves an organisation, a service provider and account-related information.', facts: ['Map each activity and party separately.', 'Which official payment or sector instruments may apply?', 'Who can confirm the current requirements and evidence?'] },
    workforce: { title: 'Hiring and workforce', summary: 'Recruitment and workforce processes use information across internal teams and service providers.', facts: ['Separate recruitment, employment and benefits purposes.', 'Identify who can access the information and why.', 'Check retention decisions and service-provider responsibilities.'] },
    commerce: { title: 'Commerce and subscriptions', summary: 'Ordering, delivery, customer support and subscription analytics involve different activities.', facts: ['Map each purpose and data flow.', 'Identify recipients and service providers.', 'Record unresolved questions and owners.'] },
    atm: { title: 'ATM or assisted banking', summary: 'A self-service financial channel connects a person, the service operator and supporting parties.', facts: ['Map each service step and the information involved.', 'Identify the responsible parties and support access.', 'Check applicable payment and sector instruments.'] },
    kiosk: { title: 'Self-service kiosk', summary: 'A public-facing kiosk supports a service and may connect to back-office systems or support teams.', facts: ['Describe the service and information handled.', 'Identify operator and provider roles.', 'Record safeguards, retention and incident owners.'] },
    operator: { title: 'Operator access', summary: 'Support personnel may access information to maintain or assist a public-facing service.', facts: ['What access is needed for each support task?', 'Who authorises and reviews that access?', 'Which records and responsibilities apply to providers?'] },
    automated: { title: 'AI or automated process', summary: 'A service team is considering personal data in an automated workflow or decision.', facts: ['What purpose and data are involved?', 'Who reviews the official provision and its actual conditions?', 'Who owns the decision, evidence and follow-up?'] }
  };
  const flowSteps = [
    { title: 'Describe the activity', text: 'Name the service, people, systems, information and real-world purpose. Split activities when purposes or parties differ.' },
    { title: 'Check the official position', text: 'Review the Act, Rules, commencement notifications, corrigenda, exemptions and any separate sector instruments against the facts.' },
    { title: 'Assign an accountable owner', text: 'Route open questions to people with the right operational, privacy, security and legal responsibility.' },
    { title: 'Record and revisit', text: 'Keep suitable records of the decision and evidence, and revisit them when the activity or official position changes.' }
  ];

  function renderScenario(kind, selected, index, detailed = true) {
    const data = scenarioData[selected] || scenarioData.service;
    const panel = document.getElementById('scenario-panel');
    if (!panel) return;
    panel.replaceChildren();
    panel.append(make('p', 'eyebrow', `ILLUSTRATIVE ${kind === 'kiosk' ? 'SERVICE CHANNEL' : 'BUSINESS WORKFLOW'}`));
    panel.append(make('h2', '', data.title));
    panel.append(make('p', 'scenario-summary', data.summary));
    panel.append(make('h3', '', index === 0 ? 'Start with the situation' : index === 1 ? 'Questions to map' : 'How Pramana can help teams')); 
    const stageCopy = index === 0 ? data.facts : index === 1
      ? ['Clarify the purpose, roles, people, systems and relevant official sources.', 'Separate confirmed facts from assumptions.', 'Record who will resolve each open question.']
      : ['Bring activity context and relevant source information into the team discussion.', 'Help owners organise evidence, responsibilities and next steps.', 'Keep the decision with accountable people and qualified advisers.'];
    const list = make('ul', 'scenario-list');
    stageCopy.forEach((text) => list.append(make('li', '', text)));
    panel.append(list);
    if (!detailed) panel.classList.add('is-simple'); else panel.classList.remove('is-simple');
    const steps = document.querySelectorAll('[data-scenario-step]');
    steps.forEach((button, i) => { button.setAttribute('aria-current', i === index ? 'step' : 'false'); button.classList.toggle('is-current', i === index); });
  }

  function renderJourney(index, scenario) {
    const panel = document.getElementById('journey-panel');
    if (!panel) return;
    const cases = scenarioData[scenario] || scenarioData.service;
    panel.replaceChildren();
    panel.append(make('p', 'eyebrow', `STEP ${index + 1} OF ${flowSteps.length}`));
    panel.append(make('h2', '', flowSteps[index].title));
    panel.append(make('p', '', flowSteps[index].text));
    panel.append(make('div', 'journey-example', `Applied to ${cases.title}: ${cases.summary}`));
    document.getElementById('journey-progress').textContent = `Step ${index + 1} of ${flowSteps.length}`;
    document.querySelector('[data-journey-back]').disabled = index === 0;
    document.querySelector('[data-journey-next]').textContent = index === flowSteps.length - 1 ? 'Start again' : 'Next step';
  }

  const guideTopics = {
    clinic: ['Identify who determines the purpose and means for each activity.', 'Review any official notification before inferring Significant Data Fiduciary status.', 'Check current health-sector requirements separately.'],
    messaging: ['Identify the purpose, recipients, roles, safeguards and service-provider terms.', 'Check whether the channel is appropriate for the specific information and activity.', 'Route unanswered health-sector questions for review.'],
    learner: ['Confirm whether children’s personal data is involved and the activity’s facts.', 'Review Section 9 and relevant Rules, commencement and applicable conditions.', 'Do not assume an education use is automatically prohibited or exempt.'],
    erasure: ['The Act addresses correction and erasure in Section 12.', 'Check commencement, the facts of the request and any applicable retention requirement.', 'There is no general DPDP 72-hour erasure deadline.'],
    identifier: ['Identify the actual identifier and purpose of collection or use.', 'Check current official Aadhaar or UIDAI instruments where relevant.', 'A field label alone does not establish a violation.'],
    transfer: ['Review Section 16, Rules 15 and 13(4) where relevant, commencement and current instruments.', 'Check applicable sector requirements and the actual transfer arrangement.', 'Do not treat the Act as a fixed country blacklist.'],
    automated: ['Verify the official source, provision, version, commencement and conditions.', 'For decisions, review Section 8(3) where it applies.', 'The Act does not create a universal human-review right for every automated decision.']
  };

  if (root.dataset.pramanaTool === 'assessment') {
    renderQuestions();
    form?.addEventListener('submit', assess);
    document.getElementById('organisation-context')?.addEventListener('change', (event) => {
      document.getElementById('context-tip').textContent = sectorPrompts[event.target.value] || 'Choose a context to tailor the discussion prompt. This selection does not decide legal applicability.';
    });
  }
  if (root.dataset.pramanaTool === 'scenario' || root.dataset.pramanaTool === 'kiosk') {
    let selected = root.dataset.default || 'service', step = 0, detailed = true;
    root.addEventListener('click', (event) => {
      const target = event.target.closest('button'); if (!target) return;
      if (target.dataset.scenario) { selected = target.dataset.scenario; root.querySelectorAll('[data-scenario]').forEach((item) => { item.setAttribute('aria-pressed', item === target ? 'true' : 'false'); }); }
      if (target.dataset.scenarioStep) step = Number(target.dataset.scenarioStep);
      if (target.dataset.move === 'next') step = (step + 1) % 3;
      if (target.dataset.move === 'back') step = Math.max(0, step - 1);
      if (target.dataset.view) { detailed = target.dataset.view === 'detailed'; root.querySelectorAll('[data-view]').forEach((item) => item.setAttribute('aria-pressed', item === target ? 'true' : 'false')); }
      if (target.dataset.presenter !== undefined) { const notes = root.querySelector('#presenter-notes'); const show = target.getAttribute('aria-pressed') !== 'true'; target.setAttribute('aria-pressed', String(show)); target.textContent = show ? 'Hide presenter notes' : 'Show presenter notes'; notes.hidden = !show; }
      renderScenario(root.dataset.pramanaTool, selected, step, detailed);
    });
    renderScenario(root.dataset.pramanaTool, selected, step, detailed);
  }
  if (root.dataset.pramanaTool === 'journey') {
    let step = 0, scenario = 'service';
    root.querySelector('[data-journey-case]')?.addEventListener('change', (event) => { scenario = event.target.value; renderJourney(step, scenario); });
    root.querySelector('[data-journey-back]')?.addEventListener('click', () => { step = Math.max(0, step - 1); renderJourney(step, scenario); });
    root.querySelector('[data-journey-next]')?.addEventListener('click', () => { step = step === flowSteps.length - 1 ? 0 : step + 1; renderJourney(step, scenario); });
    renderJourney(step, scenario);
  }
  if (root.dataset.pramanaTool === 'meeting') {
    let step = 0, scenario = 'service';
    const panel = root.querySelector('#meeting-panel');
    const render = () => {
      const data = scenarioData[scenario] || scenarioData.service;
      panel.replaceChildren(make('p', 'eyebrow', `TEAM EXERCISE · PROMPT ${step + 1} OF 4`), make('h2', '', data.title));
      panel.append(make('p', 'scenario-summary', data.summary));
      panel.append(make('p', '', ['What information and purpose are involved?', 'Who determines purpose and means for each activity?', 'Which official sources, dates or sector rules need review?', 'Who owns each open question, and what evidence should be kept?'][step]));
      root.querySelector('[data-meeting-count]').textContent = `Prompt ${step + 1} of 4`;
      root.querySelector('[data-meeting-back]').disabled = step === 0;
    };
    root.querySelector('[data-meeting-case]')?.addEventListener('change', (event) => { scenario = event.target.value; render(); });
    root.querySelector('[data-meeting-back]')?.addEventListener('click', () => { step = Math.max(0, step - 1); render(); });
    root.querySelector('[data-meeting-next]')?.addEventListener('click', () => { step = (step + 1) % 4; render(); });
    root.querySelector('[data-meeting-reset]')?.addEventListener('click', () => { step = 0; render(); });
    render();
  }
  if (root.dataset.pramanaTool === 'guide') {
    const panel = root.querySelector('#guide-panel');
    root.addEventListener('click', (event) => {
      const button = event.target.closest('[data-guide-topic]'); if (!button) return;
      root.querySelectorAll('[data-guide-topic]').forEach((item) => { item.setAttribute('aria-pressed', item === button ? 'true' : 'false'); });
      panel.replaceChildren(make('p', 'eyebrow', 'TOPIC FOR HUMAN REVIEW'), make('h2', '', button.textContent.trim()));
      const list = make('ul', 'scenario-list'); (guideTopics[button.dataset.guideTopic] || []).forEach((text) => list.append(make('li', '', text))); panel.append(list);
      panel.append(make('p', 'pr-note', 'This is general routing information, not advice or a finding about a particular organisation. Check the official sources and facts.'));
    });
    const first = root.querySelector('[data-guide-topic]'); first?.click();
  }
  root.addEventListener('click', (event) => {
    if (event.target.closest('[data-print]')) window.print();
    if (event.target.closest('[data-restart]')) { form?.reset(); summary.hidden = true; summary.replaceChildren(); window.scrollTo({ top: form.offsetTop, behavior: 'smooth' }); }
  });
})();
