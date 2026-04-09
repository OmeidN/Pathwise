const params = new URLSearchParams(window.location.search);
const resourceId = params.get('id');
const detailEl = document.getElementById('resource-detail');
const errorEl = document.getElementById('resource-error');

let currentResource = null;
let isSaved = false;
let currentUserRole = null;

function showResourceError(message) {
  errorEl.textContent = message;
  errorEl.hidden = false;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function formatCost(cost) {
  if (!cost) {
    return 'Unknown';
  }
  return cost.charAt(0).toUpperCase() + cost.slice(1);
}

function renderResource(resource) {
  const tags = resource.tags || [];
  const tagMarkup =
    tags.length > 0
      ? tags.map((tag) => `<span class="resource-tag">${escapeHtml(tag.tag_name)}</span>`).join('')
      : '<span class="resource-tag resource-tag--muted">No tags listed</span>';

  const ratingLine =
    resource.rating_count > 0
      ? `<p class="resource-rating">Average ${Number(resource.avg_rating).toFixed(1)} / 5 (${resource.rating_count} ratings)</p>`
      : '<p class="resource-rating">No ratings yet.</p>';

  const imgBlock =
    resource.image_path != null && String(resource.image_path).trim() !== ''
      ? `<div class="resource-image-wrap"><img src="${escapeHtml(resource.image_path)}" alt="" class="resource-image" /></div>`
      : '';

  const rateBlock =
    currentUserRole != null
      ? `<div class="resource-rate card" style="margin-top:16px;padding:16px">
          <label>Your rating (1–5)
            <select id="rate-stars" class="input" style="max-width:120px;margin-top:8px">
              <option value="">—</option>
              <option value="5">5</option>
              <option value="4">4</option>
              <option value="3">3</option>
              <option value="2">2</option>
              <option value="1">1</option>
            </select>
          </label>
          <button type="button" class="btn btn-primary" id="rateBtn" style="margin-top:8px">Submit rating</button>
        </div>`
      : `<p class="profile-muted" style="margin-top:12px"><a href="login.html">Sign in</a> to rate this resource.</p>`;

  const facultyBlock =
    currentUserRole === 'faculty' || currentUserRole === 'staff'
      ? `<div class="resource-faculty card" style="margin-top:16px;padding:16px">
          <h3 style="margin-top:0;font-size:1rem">Faculty: AI-enabled label</h3>
          <label><input type="checkbox" id="ai-enabled-cb" ${Number(resource.is_ai_enabled) ? 'checked' : ''} /> Mark as AI-enabled</label>
          <button type="button" class="btn btn-secondary" id="ai-save-btn" style="margin-top:8px">Update flag</button>
        </div>`
      : '';

  detailEl.innerHTML = `
    <article class="resource-card">
      <a href="index.html" class="resource-back">Back to Search</a>
      <div class="resource-header">
        <div>
          <p class="resource-kicker">${escapeHtml(resource.category_name || 'Resource')}</p>
          <h1 class="resource-title">${escapeHtml(resource.title)}</h1>
        </div>
        <span class="resource-cost">${escapeHtml(formatCost(resource.cost))}</span>
      </div>
      ${imgBlock}
      <p class="resource-description">${escapeHtml(resource.description || 'No description provided.')}</p>
      ${Number(resource.is_ai_enabled) ? '<p class="result-card-badge">AI-enabled</p>' : ''}
      <div class="resource-tags">${tagMarkup}</div>
      ${ratingLine}
      ${rateBlock}
      ${facultyBlock}
      <div class="resource-actions">
        ${
          resource.url
            ? `<a href="${escapeHtml(resource.url)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">
          View Original Resource
        </a>`
            : ''
        }
        <button type="button" id="bookmarkBtn" class="btn btn-secondary">
          ${isSaved ? 'Unsave Resource' : 'Save Resource'}
        </button>
      </div>
    </article>
  `;

  const bookmarkBtn = document.getElementById('bookmarkBtn');
  if (bookmarkBtn) {
    bookmarkBtn.addEventListener('click', toggleBookmark);
  }

  const rateBtn = document.getElementById('rateBtn');
  if (rateBtn) {
    rateBtn.addEventListener('click', submitRating);
  }

  const aiSave = document.getElementById('ai-save-btn');
  if (aiSave) {
    aiSave.addEventListener('click', saveAiFlag);
  }
}

async function submitRating() {
  const sel = document.getElementById('rate-stars');
  if (!sel || !currentResource) return;
  const stars = parseInt(sel.value, 10);
  if (Number.isNaN(stars) || stars < 1) {
    showResourceError('Pick a star rating.');
    return;
  }
  showResourceError('');
  const res = await fetch(`/api/resources/${currentResource.resource_id}/rating`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stars })
  });
  if (res.status === 401) {
    window.location.href = 'login.html';
    return;
  }
  const data = await res.json();
  if (!data.success) {
    showResourceError(data.error || 'Rating failed.');
    return;
  }
  await loadResource();
}

async function saveAiFlag() {
  const cb = document.getElementById('ai-enabled-cb');
  if (!cb || !currentResource) return;
  const res = await fetch(`/api/resources/${currentResource.resource_id}/ai-meta`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_ai_enabled: cb.checked })
  });
  if (res.status === 401) {
    window.location.href = 'login.html';
    return;
  }
  if (res.status === 403) {
    showResourceError('Only faculty or staff can update this flag.');
    return;
  }
  const data = await res.json();
  if (!data.success) {
    showResourceError(data.error || 'Update failed.');
    return;
  }
  await loadResource();
}

async function loadBookmarkState() {
  try {
    const response = await fetch('/api/bookmarks', { credentials: 'include' });

    if (response.status === 401) {
      isSaved = false;
      return;
    }

    const data = await response.json();
    if (!response.ok || !data.success) {
      return;
    }

    isSaved = (data.results || []).some((resource) => String(resource.resource_id) === String(resourceId));
  } catch (_) {
    isSaved = false;
  }
}

async function loadMeRole() {
  try {
    const res = await fetch('/api/me', { credentials: 'include' });
    if (res.status !== 200) {
      currentUserRole = null;
      return;
    }
    const data = await res.json();
    currentUserRole = data.user && data.user.role ? data.user.role : null;
  } catch (_) {
    currentUserRole = null;
  }
}

async function loadResource() {
  if (!resourceId) {
    showResourceError('Missing resource id.');
    detailEl.innerHTML = '';
    return;
  }

  try {
    await loadMeRole();
    const response = await fetch(`/api/resources/${resourceId}`, {
      credentials: 'include'
    });
    const data = await response.json();

    if (!response.ok || !data.success) {
      detailEl.innerHTML = '';
      showResourceError(data.error || 'Could not load resource details.');
      return;
    }

    currentResource = data.resource;
    errorEl.hidden = true;
    await loadBookmarkState();
    renderResource(currentResource);
  } catch (error) {
    detailEl.innerHTML = '';
    showResourceError(`Error loading resource: ${error.message}`);
  }
}

async function toggleBookmark() {
  if (!currentResource) {
    return;
  }

  try {
    const response = await fetch('/api/bookmarks', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resource_id: currentResource.resource_id,
        action: isSaved ? 'remove' : 'add'
      })
    });

    if (response.status === 401) {
      window.location.href = 'login.html';
      return;
    }

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Could not update bookmark.');
    }

    isSaved = !isSaved;
    renderResource(currentResource);
  } catch (error) {
    showResourceError(error.message);
  }
}

loadResource();
