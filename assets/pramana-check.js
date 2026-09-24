(() => {
  const form = document.getElementById('dpdp-guided-check');
  const button = document.getElementById('dpdp-check-review');
  const summary = document.getElementById('dpdp-check-summary');
  if (!form || !button || !summary) return;

  button.addEventListener('click', () => {
    const topics = Array.from(form.querySelectorAll('input[type="checkbox"]:checked')).map((input) => input.value);
    summary.replaceChildren();
    const heading = document.createElement('h3');
    const description = document.createElement('p');
    if (topics.length === 0) {
      heading.textContent = 'Your discussion list is empty.';
      description.textContent = 'Select any topics your team wants to discuss, then build the list again.';
      summary.append(heading, description);
    } else {
      heading.textContent = 'Topics for your team discussion';
      description.textContent = `You selected ${topics.length} ${topics.length === 1 ? 'topic' : 'topics'} to discuss.`;
      const list = document.createElement('ul');
      topics.forEach((topic) => { const item = document.createElement('li'); item.textContent = topic; list.append(item); });
      summary.append(heading, description, list);
    }
    const boundary = document.createElement('p');
    boundary.textContent = 'This is a discussion aid only. It is not a readiness score, compliance assessment or legal conclusion.';
    summary.append(boundary);
    summary.hidden = false;
  });
})();
