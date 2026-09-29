(() => {
  const forms = [...document.querySelectorAll('[data-subscription-form]')];
  if (!forms.length) return;

  const apiUrl = (form, path) => {
    const base = (form.dataset.apiBase || '').replace(/\/$/, '');
    return `${base}${path}`;
  };

  const setStatus = (form, message, tone = '') => {
    const status = form.querySelector('[data-subscription-status]');
    if (!status) return;
    status.textContent = message;
    status.dataset.tone = tone;
  };

  const post = async (form, path, payload) => {
    const response = await fetch(apiUrl(form, path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    let data = {};
    try { data = await response.json(); } catch {}
    return { response, data };
  };

  forms.forEach(form => {
    const email = form.querySelector('input[name="email"]');
    const consent = form.querySelector('input[name="consent"]');
    const requestPanel = form.querySelector('[data-subscription-request]');
    const verifyPanel = form.querySelector('[data-subscription-verify]');
    const code = form.querySelector('input[name="code"]');
    const source = form.dataset.source || 'products';
    const interest = form.dataset.interest || 'feedback';
    const website = form.querySelector('input[name="website"]');

    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (verifyPanel && !verifyPanel.hidden) {
        if (!/^\d{6}$/.test(code?.value.trim() || '')) {
          setStatus(form, 'Enter the six-digit code from your email.', 'error');
          code?.focus();
          return;
        }
        const verifyButton = verifyPanel.querySelector('button');
        if (verifyButton) verifyButton.disabled = true;
        setStatus(form, 'Confirming your subscription…');
        try {
          const { response, data } = await post(form, '/api/subscribe/verify', { email: email.value.trim(), code: code.value.trim() });
          if (!response.ok) throw new Error(data.message || 'That code could not be confirmed.');
          verifyPanel.setAttribute('hidden', '');
          setStatus(form, data.message || 'You are subscribed.', 'success');
        } catch (error) {
          setStatus(form, error.message || 'That code could not be confirmed.', 'error');
          if (verifyButton) verifyButton.disabled = false;
        }
        return;
      }
      if (!email?.checkValidity() || !consent?.checked) {
        setStatus(form, 'Enter your email and select the optional updates consent.', 'error');
        email?.focus();
        return;
      }
      const button = form.querySelector('[data-subscription-submit]');
      if (button) button.disabled = true;
      setStatus(form, 'Sending a verification code…');
      try {
        const { response, data } = await post(form, '/api/subscribe/submit', {
          email: email.value.trim(), source, interest, consent: true,
          website: website?.value || ''
        });
        if (!response.ok) throw new Error(data.message || 'Email subscription is temporarily unavailable.');
        requestPanel?.setAttribute('hidden', '');
        verifyPanel?.removeAttribute('hidden');
        setStatus(form, 'Check your inbox for a six-digit code.');
        code?.focus();
      } catch (error) {
        setStatus(form, error.message || 'Email subscription is temporarily unavailable.', 'error');
        if (button) button.disabled = false;
      }
    });

  });
})();
