(async function loadDashboard() {
  const root = document.getElementById('dashboard-content');

  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  try {
    const res = await fetch('/api/dashboard', { credentials: 'include' });
    if (res.status === 401) {
      window.location.href = 'login.html';
      return;
    }
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to load dashboard');

    const goals = data.goals || [];
    const projects = data.projects || [];
    const milestones = data.milestones || [];
    const saved = data.savedResources || [];

    const completed = milestones.filter((m) => m.is_completed).length;
    const total = milestones.length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    const goalsRows =
      goals.length === 0
        ? '<tr><td colspan="4">No goals yet. <a href="goals.html">Create a goal</a>.</td></tr>'
        : goals
            .map(
              (g) => `
          <tr>
            <td><a href="goal.html?id=${g.goal_id}">${esc(g.title)}</a></td>
            <td>${esc(g.category || '—')}</td>
            <td>${esc(g.status)}</td>
            <td>${g.target_date ? esc(String(g.target_date).slice(0, 10)) : '—'}</td>
          </tr>`
            )
            .join('');

    const projRows =
      projects.length === 0
        ? '<tr><td colspan="3">No projects yet.</td></tr>'
        : projects
            .map(
              (p) => `
          <tr>
            <td>${esc(p.title)}</td>
            <td><a href="goal.html?id=${p.goal_id}">Goal #${p.goal_id}</a></td>
            <td>${p.updated_at ? esc(String(p.updated_at).slice(0, 10)) : '—'}</td>
          </tr>`
            )
            .join('');

    const msRows =
      milestones.length === 0
        ? '<tr><td colspan="4">No milestones yet.</td></tr>'
        : milestones
            .map(
              (m) => `
          <tr>
            <td>${esc(m.title)}</td>
            <td>Project #${m.project_id}</td>
            <td>${m.is_completed ? 'Done' : 'Open'}</td>
            <td>${m.target_date ? esc(String(m.target_date).slice(0, 10)) : '—'}</td>
          </tr>`
            )
            .join('');

    const savedRows =
      saved.length === 0
        ? '<tr><td colspan="2">No saved resources. <a href="index.html">Browse</a>.</td></tr>'
        : saved
            .map(
              (r) => `
          <tr>
            <td><a href="resource.html?id=${r.resource_id}">${esc(r.title)}</a></td>
            <td>${r.bookmarked_at ? esc(String(r.bookmarked_at).slice(0, 10)) : '—'}</td>
          </tr>`
            )
            .join('');

    let recSection = '';
    try {
      const recRes = await fetch('/api/recommendations?limit=6', { credentials: 'include' });
      if (recRes.ok) {
        const recData = await recRes.json();
        if (recData.success && recData.results && recData.results.length > 0) {
          recSection = `
      <section class="dash-section card">
        <h2>Recommended for you</h2>
        <p class="profile-muted" style="margin-top:0">Based on your profile and saved resources (${esc(recData.strategy || '')}).</p>
        <ul class="rec-list" style="list-style:none;padding:0;margin:0">
          ${recData.results
            .map(
              (r) => `
            <li style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid var(--color-border)">
              <a href="resource.html?id=${r.resource_id}">${esc(r.title)}</a>
              <p style="margin:4px 0 0;font-size:0.875rem;color:var(--color-text-muted)">${esc((r.description || '').slice(0, 120))}${(r.description || '').length > 120 ? '…' : ''}</p>
            </li>`
            )
            .join('')}
        </ul>
      </section>`;
        }
      }
    } catch (_) {
      /* optional block */
    }

    root.innerHTML = `
      ${recSection}
      <section class="dash-grid">
        <article class="card"><h3>Active Goals</h3><p>${goals.filter((g) => g.status === 'active').length}</p></article>
        <article class="card"><h3>Projects</h3><p>${projects.length}</p></article>
        <article class="card"><h3>Milestones Completed</h3><p>${completed}/${total}</p></article>
        <article class="card"><h3>Saved Resources</h3><p>${saved.length}</p></article>
      </section>
      <section class="card dash-progress-card">
        <h3>Overall progress</h3>
        <div class="progress"><div class="progress-bar" style="width:${pct}%"></div></div>
        <p>${pct}% milestone completion</p>
      </section>

      <section class="dash-section card">
        <div class="dash-section__head">
          <h2>Goals</h2>
          <a href="goals.html" class="btn btn-secondary">Manage goals</a>
        </div>
        <div class="table-wrap">
          <table class="dash-table">
            <thead><tr><th>Title</th><th>Category</th><th>Status</th><th>Target</th></tr></thead>
            <tbody>${goalsRows}</tbody>
          </table>
        </div>
      </section>

      <section class="dash-section card">
        <h2>Projects</h2>
        <div class="table-wrap">
          <table class="dash-table">
            <thead><tr><th>Title</th><th>Goal</th><th>Updated</th></tr></thead>
            <tbody>${projRows}</tbody>
          </table>
        </div>
      </section>

      <section class="dash-section card">
        <h2>Milestones</h2>
        <div class="table-wrap">
          <table class="dash-table">
            <thead><tr><th>Title</th><th>Project</th><th>State</th><th>Target</th></tr></thead>
            <tbody>${msRows}</tbody>
          </table>
        </div>
      </section>

      <section class="dash-section card">
        <div class="dash-section__head">
          <h2>Saved resources</h2>
          <a href="bookmarks.html" class="btn btn-secondary">All bookmarks</a>
        </div>
        <div class="table-wrap">
          <table class="dash-table">
            <thead><tr><th>Title</th><th>Saved</th></tr></thead>
            <tbody>${savedRows}</tbody>
          </table>
        </div>
      </section>
    `;
  } catch (err) {
    root.innerHTML = `<p class="error">${esc(err.message)}</p>`;
  }
})();
