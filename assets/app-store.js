(() => {
  const target = document.querySelector('[data-app-catalog]');
  if (!target) return;
  const catalogPath = target.dataset.catalog || 'catalog.json';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  fetch(catalogPath, { cache: 'no-store' }).then(response => {
    if (!response.ok) throw new Error(String(response.status));
    return response.json();
  }).then(catalog => {
    target.replaceChildren(...catalog.apps.map(app => {
      const card = document.createElement('article');
      card.className = 'app-catalog-card';
      const action = app.download_url
        ? `<a href="${escape(app.download_url)}" rel="noopener">Download release</a>`
        : '<button type="button" disabled>Release download pending</button>';
      card.innerHTML = `<div><span class="eyebrow">${escape(app.category)}</span><h3>${escape(app.name)}</h3></div><p>${escape(app.tagline)}</p><div class="app-catalog-meta"><span>${escape(app.channel)}</span>${app.package_name ? `<span>${escape(app.package_name)}</span>` : ''}</div><small>${escape(app.notes)}</small>${action}`;
      return card;
    }));
  }).catch(() => {
    target.innerHTML = '<p role="status">The app catalogue is temporarily unavailable. The release checklist remains available below.</p>';
  });
})();
