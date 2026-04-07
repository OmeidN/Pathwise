const params = new URLSearchParams(window.location.search);
const resourceId = params.get('id');
const detailEl = document.getElementById('resource-detail');
const errorEl = document.getElementById('resource-error');

let currentResource = null;
let isSaved = false;

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
  const tagMarkup = resource.tags.length > 0
    ? resource.tags
        .map((tag) => `<span class="resource-tag">${escapeHtml(tag.tag_name)}</span>`)
        .join('')
    : '<span class="resource-tag resource-tag--muted">No tags listed</span>';

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
      <p class="resource-description">${escapeHtml(resource.description || 'No description provided.')}</p>
      <div class="resource-tags">${tagMarkup}</div>
      <div class="resource-actions">
        <a href="${escapeHtml(resource.url)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">
          View Original Resource
        </a>
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

async function loadResource() {
  if (!resourceId) {
    showResourceError('Missing resource id.');
    detailEl.innerHTML = '';
    return;
  }

  try {
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
