(async () => {
  const profileCard = document.getElementById('profile-card');
  const submittedEl = document.getElementById('submitted-results');
  const errorBanner = document.getElementById('profile-error');
  const errorMsg = document.getElementById('profile-error-msg');

  // Show skeleton rows while fetching
  submittedEl.innerHTML = skeletonList();

  let user;
  let submissions;
  try {
    const [meRes, subRes] = await Promise.all([
      fetch('/api/me', { credentials: 'include' }),
      fetch('/api/me/submissions', { credentials: 'include' }),
    ]);
    if (meRes.status === 401 || subRes.status === 401) {
      window.location.href = 'login.html';
      return;
    }
    const [meData, subData] = await Promise.all([meRes.json(), subRes.json()]);
    if (!meData.success) throw new Error(meData.message || 'Could not load profile.');
    if (!subData.success) throw new Error(subData.message || 'Could not load submissions.');
    user = meData.user;
    submissions = subData.results ?? [];
  } catch (err) {
    submittedEl.innerHTML = '';
    errorMsg.textContent = err.message || 'Could not load profile.';
    errorBanner.hidden = false;
    return;
  }

  profileCard.innerHTML = `
    <div class="profile-avatar" aria-hidden="true">${esc(initials(user.username))}</div>
    <div>
      <p class="profile-username">${esc(user.username)}</p>
      <p class="profile-email">${esc(user.email)}</p>
    </div>
    <div class="profile-stats">
      <div class="profile-stat">
        <span class="profile-stat__value">${submissions.length}</span>
        <span class="profile-stat__label">Submitted</span>
      </div>
    </div>`;

  if (submissions.length === 0) {
    submittedEl.innerHTML = `
      <div class="submitted-empty">
        <p class="submitted-empty__message">You haven't submitted any resources yet.</p>
        <a href="submit.html" class="btn btn-primary" style="margin-top:var(--space-sm)">Submit a resource</a>
      </div>`;
    return;
  }

  submittedEl.innerHTML = `
    <div class="submitted-list">
      ${submissions.map(buildRow).join('')}
    </div>`;
})();

function buildRow(r) {
  // Map visibility to a status badge
  const statusMap = { public: 'approved', pending: 'pending', private: 'rejected' };
  const labelMap = { approved: 'Approved', pending: 'Pending', rejected: 'Rejected' };
  const status = statusMap[r.visibility] ?? 'pending';
  const label = labelMap[status];

  const date = r.created_at
    ? new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '';

  const titleLink = r.url
    ? `<a href="${escAttr(r.url)}" target="_blank" rel="noopener noreferrer">${esc(r.title)}</a>`
    : esc(r.title);

  return `
    <div class="submitted-row">
      <div class="submitted-row__body">
        <p class="submitted-row__title">${titleLink}</p>
        ${date ? `<p class="submitted-row__meta">Submitted ${esc(date)}</p>` : ''}
      </div>
      <span class="status-badge status-badge--${escAttr(status)}">${esc(label)}</span>
    </div>`;
}

function skeletonList() {
  const rows = Array.from({ length: 4 }, () => `
    <div class="submitted-row submitted-row--skeleton">
      <div class="submitted-row__body">
        <div class="skeleton-block skeleton-row-title"></div>
        <div class="skeleton-block skeleton-row-meta"></div>
      </div>
    </div>`).join('');
  return `<div class="submitted-list">${rows}</div>`;
}

function initials(username) {
  if (!username) return '?';
  const parts = username.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : username.slice(0, 2).toUpperCase();
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escAttr(str) {
  return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
}
