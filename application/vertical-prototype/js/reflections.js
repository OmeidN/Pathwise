/**
 * Why:
 *   This file is need so we can correctly allow users to write, or delete their journal
 *   entries that could potentially be tied to their goals. Beside being able to add new
 *   entries or delete them, they need to be be able to view their previous entries as well
 *
 * What:
 *   This js file will load exisiting reflection history and present them as well as create
 *   and delete reflection using the reflection form.
 *
 * Where used:
 *   It is loaded/called by vertical-prototype/reflections.html
 *
 * Notes:
 *   - The APIs it calls: 
 *        /api/reflections
 *        /api/reflections/:id
 *   - As usual, we redirect user to the login.html on 401
 */

(function () {
  const listEl = document.getElementById('refl-list');
  const errEl = document.getElementById('refl-error');
  const form = document.getElementById('refl-form');
  const linkTreeEl = document.getElementById('reflection-link-tree');
  const clearLinksBtn = document.getElementById('clear-reflection-links');

  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function showErr(msg) {
    errEl.textContent = msg || '';
    errEl.hidden = !msg;
  }

  // ------------------------------------------
  function formatDate(value) {
    if (!value) return '';
    return String(value).slice(0, 10);
  }

  function getCheckedValues(name) {
    return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`))
      .map((input) => Number(input.value))
      .filter((value) => Number.isInteger(value) && value > 0);
  }

  function renderChips(label, items, className, idKey) {
    if (!items || items.length === 0) return '';

    return items.map((item) => `
      <span class="reflection-chip ${className}">
        ${label}: ${esc(item.title || item[idKey])}
      </span>
    `).join('');
  }
  // ------------------------------------------

  async function load() {
    showErr('');
    const res = await fetch('/api/reflections', { credentials: 'include' });
    if (res.status === 401) {
      window.location.href = 'login.html';
      return;
    }
    const data = await res.json();
    if (!data.success) {
      listEl.innerHTML = '';
      showErr(data.error || 'Could not load reflections.');
      return;
    }
    const rows = data.results || [];
    if (rows.length === 0) {
      listEl.innerHTML = '<p>No reflections yet.</p>';
      return;
    }
    listEl.innerHTML = rows
      .map(
        (r) => `
      <article class="goal-row">
        <div>
          <p>${esc(r.body)}</p>
          <p class="goal-row__meta">${esc(String(r.created_at).slice(0, 19).replace('T', ' '))}
            ${r.goal_id ? ` · Goal #${r.goal_id}` : ''}${r.project_id ? ` · Project #${r.project_id}` : ''}</p>
        </div>
        <div class="goal-row__actions">
          <button type="button" class="btn btn-secondary btn-del" data-id="${r.reflection_id}">Delete</button>
        </div>
      </article>`
      )
      .join('');

    listEl.querySelectorAll('.btn-del').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this reflection?')) return;
        const id = btn.getAttribute('data-id');
        const r = await fetch(`/api/reflections/${id}`, { method: 'DELETE', credentials: 'include' });
        const d = await r.json();
        if (!d.success) {
          showErr(d.error || 'Delete failed');
          return;
        }
        load();
      });
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = document.getElementById('refl-body').value.trim();
    const goalRaw = document.getElementById('refl-goal').value.trim();
    const projRaw = document.getElementById('refl-project').value.trim();
    const res = await fetch('/api/reflections', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        body,
        goal_id: goalRaw ? Number(goalRaw) : null,
        project_id: projRaw ? Number(projRaw) : null
      })
    });
    if (res.status === 401) {
      window.location.href = 'login.html';
      return;
    }
    const data = await res.json();
    if (!data.success) {
      showErr(data.error || 'Could not save.');
      return;
    }
    form.reset();
    load();
  });

  load();
})();
