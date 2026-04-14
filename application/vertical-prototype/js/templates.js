(function () {
  const listEl = document.getElementById('templates-list');
  const form = document.getElementById('templateForm');
  const noteEl = document.getElementById('tpl-form-note');
  const errEl = document.getElementById('tpl-error');
  const submitBtn = document.getElementById('tpl-submit');
  let canPost = false;

  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function showError(msg) {
    errEl.textContent = msg || '';
  }

  async function loadAuth() {
    try {
      const res = await fetch('/api/me', { credentials: 'include' });
      if (!res.ok) return;
      canPost = true;
      noteEl.textContent = 'Signed in. Your template will be visible to all users.';
    } catch (_) {
      // guest mode
    }
    submitBtn.disabled = !canPost;
  }

  async function loadTemplates() {
    listEl.innerHTML = '<p>Loading templates...</p>';
    const res = await fetch('/api/templates/public');
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      listEl.innerHTML = '<p class="error">Could not load templates.</p>';
      return;
    }
    const rows = data.results || [];
    if (!rows.length) {
      listEl.innerHTML = '<p>No public templates yet.</p>';
      return;
    }
    listEl.innerHTML = rows
      .map(
        (t) => `
        <article class="card" style="padding:14px;margin-bottom:12px">
          <h3>${esc(t.title)}</h3>
          <p style="color:var(--color-text-muted);margin:6px 0 10px">
            ${esc(t.category || 'general')} · by ${esc(t.author || 'community')} · ${esc(
          String(t.created_at || '').slice(0, 10)
        )}
          </p>
          ${t.description ? `<p style="margin-bottom:10px">${esc(t.description)}</p>` : ''}
          <pre style="white-space:pre-wrap;background:#f7f8f9;padding:10px;border-radius:8px">${esc(
            t.workflow_steps
          )}</pre>
        </article>`
      )
      .join('');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!canPost) {
      showError('Please sign in to share a template.');
      return;
    }
    showError('');
    const payload = {
      title: document.getElementById('tpl-title').value.trim(),
      description: document.getElementById('tpl-description').value.trim(),
      category: document.getElementById('tpl-category').value.trim(),
      workflow_steps: document.getElementById('tpl-steps').value.trim()
    };
    const res = await fetch('/api/templates', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.status === 401) {
      showError('Session expired. Please sign in again.');
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      showError(data.error || 'Could not publish template.');
      return;
    }
    form.reset();
    await loadTemplates();
  });

  loadAuth();
  loadTemplates();
})();
