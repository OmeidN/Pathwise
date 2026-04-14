(function () {
  const periodEl = document.getElementById('period');
  const reloadBtn = document.getElementById('reload');
  const errEl = document.getElementById('report-error');
  const summaryEl = document.getElementById('report-summary');
  const activityEl = document.getElementById('report-activity');

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

  async function loadReport() {
    showError('');
    summaryEl.innerHTML = '<p>Loading...</p>';
    activityEl.innerHTML = '';

    const period = periodEl.value || 'week';
    const res = await fetch(`/api/reports/summary?period=${encodeURIComponent(period)}`, {
      credentials: 'include'
    });

    if (res.status === 401) {
      window.location.href = 'login.html';
      return;
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      showError(data.error || 'Could not load report.');
      summaryEl.innerHTML = '';
      return;
    }

    const s = data.summary || {};
    summaryEl.innerHTML = `
      <div class="card" style="padding:14px">
        <p><strong>Goals completed:</strong> ${esc(s.goals_completed)}</p>
        <p><strong>Milestones completed:</strong> ${esc(s.milestones_completed)}</p>
        <p><strong>Reflections written:</strong> ${esc(s.reflections_written)}</p>
        <p><strong>Bookmarks added:</strong> ${esc(s.bookmarks_added)}</p>
      </div>
    `;

    const rows = Array.isArray(data.activity) ? data.activity : [];
    if (!rows.length) {
      activityEl.innerHTML = '<p>No logged activity in this window.</p>';
      return;
    }
    activityEl.innerHTML = `
      <h2 style="margin-bottom:8px">Activity breakdown</h2>
      <div class="card" style="padding:14px">
        ${rows
          .map((r) => `<p><strong>${esc(r.action_type)}:</strong> ${esc(r.total)}</p>`)
          .join('')}
      </div>
    `;
  }

  reloadBtn.addEventListener('click', loadReport);
  loadReport();
})();
