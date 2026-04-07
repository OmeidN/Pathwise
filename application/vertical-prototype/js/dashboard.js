(async function loadDashboard() {
  const root = document.getElementById('dashboard-content');
  try {
    const res = await fetch('/api/dashboard', { credentials: 'include' });
    if (res.status === 401) {
      window.location.href = 'login.html';
      return;
    }
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to load dashboard');

    const completed = data.milestones.filter((m) => m.is_completed).length;
    const total = data.milestones.length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    root.innerHTML = `
      <section class="dash-grid">
        <article class="card"><h3>Active Goals</h3><p>${data.goals.filter((g) => g.status === 'active').length}</p></article>
        <article class="card"><h3>Projects</h3><p>${data.projects.length}</p></article>
        <article class="card"><h3>Milestones Completed</h3><p>${completed}/${total}</p></article>
        <article class="card"><h3>Saved Resources</h3><p>${data.savedResources.length}</p></article>
      </section>
      <section class="card">
        <h3>Progress</h3>
        <div class="progress"><div class="progress-bar" style="width:${pct}%"></div></div>
        <p>${pct}% milestone completion</p>
      </section>
    `;
  } catch (err) {
    root.innerHTML = `<p class="error">${err.message}</p>`;
  }
})();
