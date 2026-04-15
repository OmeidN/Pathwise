(async () => {
  const profileCard = document.getElementById('profile-card');
  const submittedEl = document.getElementById('submitted-results');
  const savedEl = document.getElementById('saved-results');
  const errorBanner = document.getElementById('profile-error');
  const errorMsg = document.getElementById('profile-error-msg');
  const personalizeForm = document.getElementById('personalize-form');
  const activityEl = document.getElementById('activity-feed');

  errorBanner.hidden = true;
  errorMsg.textContent = '';
  submittedEl.innerHTML = skeletonList();

  let user;
  let profile;
  let submissions;
  let saved;
  try {
    const [profRes, subRes, savedRes, actRes] = await Promise.all([
      fetch('/api/profile', { credentials: 'include' }),
      fetch('/api/me/submissions', { credentials: 'include' }),
      fetch('/api/bookmarks', { credentials: 'include' }),
      fetch('/api/activity?limit=10', { credentials: 'include' })
    ]);
    if (profRes.status === 401 || subRes.status === 401 || savedRes.status === 401) {
      window.location.href = 'login.html';
      return;
    }
    const [profData, subData, savedData, actData] = await Promise.all([
      profRes.json(),
      subRes.json(),
      savedRes.json(),
      actRes.json()
    ]);
    if (!profData.success) throw new Error(profData.error || 'Could not load profile.');
    if (!subData.success) throw new Error(subData.error || 'Could not load submissions.');
    if (!savedData.success) throw new Error(savedData.error || 'Could not load saved resources.');
    user = profData.user;
    profile = profData.profile || {};
    submissions = subData.results ?? [];
    saved = savedData.results ?? [];
    errorBanner.hidden = true;
    errorMsg.textContent = '';

    if (activityEl && actData.success && actData.results) {
      activityEl.innerHTML =
        actData.results.length === 0
          ? '<p class="profile-muted">No recent activity.</p>'
          : `<ul class="activity-list">${actData.results.slice(0, 10)
              .map(
                (a) => `
            <li class="activity-item">
              <span class="activity-action">${esc(a.action_type)}</span>
              <span class="activity-time">${esc(String(a.created_at).slice(0, 19).replace('T', ' '))}</span>
            </li>`
              )
              .join('')}</ul>`;
    }
  } catch (err) {
    submittedEl.innerHTML = '';
    errorMsg.textContent = err.message || 'Could not load profile.';
    errorBanner.hidden = false;
    return;
  }

  const roleLabel = user.role ? esc(user.role) : 'student';
  profileCard.innerHTML = `
    <div class="profile-avatar" aria-hidden="true">${esc(initials(user.username))}</div>
    <div>
      <p class="profile-username">${esc(user.username)}</p>
      <p class="profile-email">${esc(user.email)}</p>
      <p class="profile-role">Role: ${roleLabel}</p>
    </div>
    <div class="profile-stats">
      <div class="profile-stat">
        <span class="profile-stat__value">${submissions.length}</span>
        <span class="profile-stat__label">Submitted</span>
      </div>
      <div class="profile-stat">
        <span class="profile-stat__value">${saved.length}</span>
        <span class="profile-stat__label">Saved</span>
      </div>
    </div>`;

  if (personalizeForm) {
    const q = (name) => personalizeForm.querySelector(`[name="${name}"]`);
    q('interests').value = profile.interests || '';
    q('challenges').value = profile.challenges || '';
    q('workload').value = profile.workload || '';
    q('aspirations').value = profile.aspirations || '';
    personalizeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = personalizeForm.querySelector('[type="submit"]');
      btn.disabled = true;
      try {
        const res = await fetch('/api/profile', {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            interests: q('interests').value,
            challenges: q('challenges').value,
            workload: q('workload').value,
            aspirations: q('aspirations').value
          })
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Save failed');
        const ok = document.getElementById('personalize-saved');
        if (ok) {
          ok.hidden = false;
          setTimeout(() => {
            ok.hidden = true;
          }, 2500);
        }
      } catch (err) {
        errorMsg.textContent = err.message;
        errorBanner.hidden = false;
      } finally {
        btn.disabled = false;
      }
    });
  }

  if (submissions.length === 0) {
    submittedEl.innerHTML = `
      <div class="submitted-empty">
        <p class="submitted-empty__message">You haven't submitted any resources yet.</p>
        <a href="submit.html" class="btn btn-primary" style="margin-top:var(--space-sm)">Submit a resource</a>
      </div>`;
  } else {
    submittedEl.innerHTML = `
    <div class="submitted-list">
      ${submissions.map(buildRow).join('')}
    </div>`;
  }

  if (saved.length === 0) {
    savedEl.innerHTML = `<div class="submitted-empty"><p class="submitted-empty__message">No saved resources yet.</p></div>`;
  } else {
    savedEl.innerHTML = `<div class="submitted-list">${saved.map(buildSavedRow).join('')}</div>`;
  }
})();

function buildRow(r) {
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

function buildSavedRow(r) {
  return `
    <div class="submitted-row">
      <div class="submitted-row__body">
        <p class="submitted-row__title"><a href="resource.html?id=${r.resource_id}">${esc(r.title)}</a></p>
        <p class="submitted-row__meta">${esc(r.description || '')}</p>
      </div>
    </div>`;
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
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escAttr(str) {
  return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
}
