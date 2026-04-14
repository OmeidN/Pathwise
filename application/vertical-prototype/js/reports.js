(function () {
  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  const periodEl = document.getElementById('report-period');
  const anchorEl = document.getElementById('report-anchor');
  const startEl = document.getElementById('report-start');
  const endEl = document.getElementById('report-end');
  const anchorWrap = document.getElementById('anchor-wrap');
  const customStartWrap = document.getElementById('custom-start-wrap');
  const customEndWrap = document.getElementById('custom-end-wrap');
  const refreshBtn = document.getElementById('report-refresh');
  const summaryEl = document.getElementById('reports-summary');
  const snapshotEl = document.getElementById('reports-snapshot');
  const activityEl = document.getElementById('reports-activity');
  const errEl = document.getElementById('reports-error');

  function todayISODate() {
    return new Date().toISOString().slice(0, 10);
  }

  function showErr(msg) {
    errEl.textContent = msg || '';
    errEl.hidden = !msg;
  }

  function statCard(value, label) {
    return `<div class="reports-stat"><div class="reports-stat__value">${value}</div><div class="reports-stat__label">${label}</div></div>`;
  }

  function toggleCustom() {
    const custom = periodEl.value === 'custom';
    anchorWrap.hidden = custom;
    customStartWrap.hidden = !custom;
    customEndWrap.hidden = !custom;
  }

  periodEl.addEventListener('change', toggleCustom);

  async function loadReport() {
    showErr('');
    summaryEl.innerHTML = '<p class="reports-muted">Loading…</p>';
    snapshotEl.innerHTML = '';
    activityEl.innerHTML = '';

    const params = new URLSearchParams();
    params.set('period', periodEl.value);
    if (periodEl.value === 'custom') {
      if (!startEl.value || !endEl.value) {
        showErr('Choose start and end dates for a custom range.');
        summaryEl.innerHTML = '';
        return;
      }
      params.set('start', startEl.value);
      params.set('end', endEl.value);
    } else if (anchorEl.value) {
      params.set('anchor', anchorEl.value);
    }

    const res = await fetch(`/api/reports/summary?${params.toString()}`, { credentials: 'include' });
    if (res.status === 401) {
      window.location.href = 'login.html';
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      showErr(data.error || 'Could not load report.');
      summaryEl.innerHTML = '';
      return;
    }

    const s = data.summary || {};
    const snap = data.snapshot || {};
    const range = data.range || {};

    summaryEl.innerHTML = [
      statCard(s.goals_completed ?? 0, 'Goals completed (status updated in window)'),
      statCard(s.goal_completion_events ?? 0, 'Goal completion events (log)'),
      statCard(s.milestones_completed ?? 0, 'Milestones completed'),
      statCard(s.reflections_written ?? 0, 'Reflections added'),
      statCard(s.bookmarks_added ?? 0, 'Bookmarks added')
    ].join('');

    snapshotEl.innerHTML = [
      statCard(snap.active_goals ?? 0, 'Active goals (now)'),
      statCard(snap.paused_goals ?? 0, 'Paused goals (now)'),
      statCard(`${snap.milestones_done ?? 0} / ${snap.milestones_total ?? 0}`, 'Milestones done / total'),
      statCard(`${snap.milestone_progress_pct ?? 0}%`, 'Overall milestone progress')
    ].join('');

    const act = data.activity_by_type || {};
    const keys = Object.keys(act);
    if (keys.length === 0) {
      activityEl.innerHTML = '<li class="reports-muted">No logged activity in this window.</li>';
    } else {
      activityEl.innerHTML = keys
        .map((k) => `<li><span>${esc(k)}</span><strong>${esc(String(act[k]))}</strong></li>`)
        .join('');
    }

    const rs = range.start ? String(range.start).slice(0, 10) : '';
    const re = range.end ? String(range.end).slice(0, 10) : '';
    showErr('');
    document.title = `Reports (${rs}–${re}) — Pathwise`;
  }

  anchorEl.value = todayISODate();
  endEl.value = todayISODate();
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 29);
  startEl.value = d.toISOString().slice(0, 10);
  toggleCustom();

  refreshBtn.addEventListener('click', loadReport);
  loadReport();
})();
