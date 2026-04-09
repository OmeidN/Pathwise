(function () {
  const listEl = document.getElementById('goals-list');
  const errEl = document.getElementById('goals-error');
  const modal = document.getElementById('goalModal');
  const form = document.getElementById('goalForm');
  const titleEl = document.getElementById('goalModalTitle');
  const goalIdInput = document.getElementById('goalId');
  const titleInput = document.getElementById('goalTitle');
  const descInput = document.getElementById('goalDescription');
  const catInput = document.getElementById('goalCategory');
  const dateInput = document.getElementById('goalTargetDate');
  const openCreateBtn = document.getElementById('openCreateBtn');
  const cancelBtn = document.getElementById('goalCancelBtn');
  const statusFilter = document.getElementById('statusFilter');
  const sortBy = document.getElementById('sortBy');
  let cachedRows = [];

  function showErr(msg) {
    errEl.textContent = msg || '';
    errEl.hidden = !msg;
  }

  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function statusClass(status) {
    if (status === 'paused') return 'status-badge--paused';
    if (status === 'completed') return 'status-badge--completed';
    return '';
  }

  async function api(method, path, body) {
    const opts = { method, credentials: 'include', headers: {} };
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(path, opts);
    const data = await res.json().catch(() => ({}));
    return { res, data };
  }

  function applyFiltersAndSort(rows) {
    const filtered = rows.filter((r) => {
      if (!statusFilter || statusFilter.value === 'all') return true;
      return r.status === statusFilter.value;
    });

    const copy = [...filtered];
    const sortValue = sortBy ? sortBy.value : 'recent';
    if (sortValue === 'progress-desc') {
      copy.sort((a, b) => (b.completion_pct || 0) - (a.completion_pct || 0));
    } else if (sortValue === 'progress-asc') {
      copy.sort((a, b) => (a.completion_pct || 0) - (b.completion_pct || 0));
    } else if (sortValue === 'target-date') {
      copy.sort((a, b) => {
        if (!a.target_date && !b.target_date) return 0;
        if (!a.target_date) return 1;
        if (!b.target_date) return -1;
        return String(a.target_date).localeCompare(String(b.target_date));
      });
    } else {
      copy.sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')));
    }
    return copy;
  }

  function renderList(rows) {
    if (rows.length === 0) {
      listEl.innerHTML = '<p class="card">No goals match this filter. Try another status.</p>';
      return;
    }
    listEl.innerHTML = rows
      .map(
        (g) => `
      <article class="goal-card" data-id="${g.goal_id}">
        <header class="goal-card__head">
          <div>
            <h2 class="goal-card__title">${esc(g.title)}</h2>
            <p class="goal-row__meta">${esc(g.category || 'Uncategorized')}${g.target_date ? ` · Target ${esc(String(g.target_date).slice(0, 10))}` : ''}</p>
          </div>
          <span class="status-badge ${statusClass(g.status)}">${esc(g.status)}</span>
        </header>
        ${g.description ? `<p class="goal-card__description">${esc(g.description)}</p>` : ''}
        <div class="goal-card__stats">
          <div><strong>${g.project_count || 0}</strong><span>Projects</span></div>
          <div><strong>${(g.milestone_done || 0)}/${g.milestone_total || 0}</strong><span>Milestones done</span></div>
          <div><strong>${g.completion_pct || 0}%</strong><span>Progress</span></div>
        </div>
        <div class="project-block__progress">
          <label>Goal progress</label>
          <div class="progress"><div class="progress-bar" style="width:${g.completion_pct || 0}%"></div></div>
        </div>
        <div class="goal-card__actions">
          <a class="btn btn-primary" href="goal.html?id=${g.goal_id}">Open Goal Hub</a>
          <select class="input status-select" data-goal-id="${g.goal_id}" aria-label="Change status">
            <option value="active"${g.status === 'active' ? ' selected' : ''}>Active</option>
            <option value="paused"${g.status === 'paused' ? ' selected' : ''}>Paused</option>
            <option value="completed"${g.status === 'completed' ? ' selected' : ''}>Completed</option>
          </select>
          <button type="button" class="btn btn-secondary btn-edit" data-goal-id="${g.goal_id}">Edit</button>
          <button type="button" class="btn btn-secondary btn-delete" data-goal-id="${g.goal_id}">Delete</button>
        </div>
      </article>`
      )
      .join('');

    listEl.querySelectorAll('.status-select').forEach((sel) => {
      sel.addEventListener('change', async () => {
        const id = sel.getAttribute('data-goal-id');
        const { res: r, data: d } = await api('PATCH', `/api/goals/${id}/status`, {
          status: sel.value
        });
        if (r.status === 401) {
          window.location.href = 'login.html';
          return;
        }
        if (!d.success) {
          showErr(d.error || 'Status update failed.');
          await loadGoals();
          return;
        }
        await loadGoals();
      });
    });

    listEl.querySelectorAll('.btn-edit').forEach((btn) => {
      btn.addEventListener('click', () => openEdit(Number(btn.getAttribute('data-goal-id'))));
    });

    listEl.querySelectorAll('.btn-delete').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-goal-id');
        if (!confirm('Delete this goal and all of its projects/milestones?')) return;
        const { res: r, data: d } = await api('DELETE', `/api/goals/${id}`);
        if (r.status === 401) {
          window.location.href = 'login.html';
          return;
        }
        if (!d.success) {
          showErr(d.error || 'Delete failed.');
          return;
        }
        await loadGoals();
      });
    });
  }

  function renderFromCache() {
    renderList(applyFiltersAndSort(cachedRows));
  }

  async function loadGoals() {
    showErr('');
    const { res, data } = await api('GET', '/api/goals-overview');
    if (res.status === 401) {
      window.location.href = 'login.html';
      return;
    }
    if (!data.success) {
      listEl.innerHTML = '';
      showErr(data.error || 'Could not load goals.');
      return;
    }
    cachedRows = data.results || [];
    if (cachedRows.length === 0) {
      listEl.innerHTML = '<p class="card">No goals yet. Create one to get started.</p>';
      return;
    }
    renderFromCache();
  }

  function openCreate() {
    titleEl.textContent = 'New goal';
    goalIdInput.value = '';
    titleInput.value = '';
    descInput.value = '';
    catInput.value = '';
    dateInput.value = '';
    modal.hidden = false;
    titleInput.focus();
  }

  async function openEdit(goalId) {
    const { res, data } = await api('GET', `/api/goals/${goalId}`);
    if (res.status === 401) {
      window.location.href = 'login.html';
      return;
    }
    if (!data.success || !data.goal) {
      showErr(data.error || 'Goal not found.');
      return;
    }
    const g = data.goal;
    titleEl.textContent = 'Edit goal';
    goalIdInput.value = String(g.goal_id);
    titleInput.value = g.title || '';
    descInput.value = g.description || '';
    catInput.value = g.category || '';
    dateInput.value = g.target_date ? String(g.target_date).slice(0, 10) : '';
    modal.hidden = false;
    titleInput.focus();
  }

  function closeModal() {
    modal.hidden = true;
  }

  openCreateBtn.addEventListener('click', openCreate);
  cancelBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  statusFilter?.addEventListener('change', renderFromCache);
  sortBy?.addEventListener('change', renderFromCache);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = goalIdInput.value.trim();
    const payload = {
      title: titleInput.value.trim(),
      description: descInput.value.trim() || null,
      category: catInput.value.trim() || null,
      target_date: dateInput.value || null
    };
    const path = id ? `/api/goals/${id}` : '/api/goals';
    const method = id ? 'PUT' : 'POST';
    const { res, data } = await api(method, path, payload);
    if (res.status === 401) {
      window.location.href = 'login.html';
      return;
    }
    if (!data.success) {
      showErr(data.error || 'Save failed.');
      return;
    }
    closeModal();
    await loadGoals();
  });

  loadGoals();
})();
