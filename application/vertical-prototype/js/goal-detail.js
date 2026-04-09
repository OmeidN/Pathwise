(function () {
  const params = new URLSearchParams(window.location.search);
  const goalId = Number(params.get('id'));
  const root = document.getElementById('goal-detail-root');
  const errEl = document.getElementById('goal-page-error');

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

  function renderMilestones(projectId, milestones, stats) {
    const pct = stats && typeof stats.completion_pct === 'number' ? stats.completion_pct : 0;
    const items = milestones
      .map(
        (m) => `
      <li class="milestone-item${m.is_completed ? ' milestone-item--done' : ''}" data-ms-id="${m.milestone_id}">
        <label class="milestone-item__title">
          <input type="checkbox" class="ms-done" data-ms-id="${m.milestone_id}" ${m.is_completed ? 'checked' : ''} />
          ${esc(m.title)}
        </label>
        <button type="button" class="btn btn-secondary btn-sm ms-edit" data-ms-id="${m.milestone_id}">Edit</button>
        <button type="button" class="btn btn-secondary btn-sm ms-del" data-ms-id="${m.milestone_id}">Delete</button>
      </li>`
      )
      .join('');

    return `
      <div class="project-block__progress compact">
        <label>Milestone progress</label>
        <div class="progress"><div class="progress-bar" style="width:${pct}%"></div></div>
        <p style="font-size:var(--font-size-sm);color:var(--color-text-muted);margin:4px 0 0">${pct}% complete</p>
      </div>
      <ul class="milestone-list">${items || '<li class="milestone-item">No milestones yet.</li>'}</ul>
      <div class="compact-fields">
        <input type="text" class="input ms-new-title" placeholder="New milestone title" data-project-id="${projectId}" />
        <input type="date" class="input ms-new-date" data-project-id="${projectId}" />
        <button type="button" class="btn btn-primary ms-add" data-project-id="${projectId}">Add milestone</button>
      </div>
    `;
  }

  function renderProjectBlock(p) {
    const ms = p.milestones || [];
    return `
      <section class="project-block" data-project-id="${p.project_id}">
        <div class="project-block__head">
          <div>
            <h3>${esc(p.title)}</h3>
            ${p.description ? `<p style="color:var(--color-text-muted);font-size:var(--font-size-sm)">${esc(p.description)}</p>` : ''}
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button type="button" class="btn btn-secondary btn-sm proj-edit" data-project-id="${p.project_id}">Edit project</button>
            <button type="button" class="btn btn-secondary btn-sm proj-del" data-project-id="${p.project_id}">Delete project</button>
          </div>
        </div>
        <div class="goal-card__stats project-stats">
          <div><strong>${p.stats?.milestone_total || 0}</strong><span>Total milestones</span></div>
          <div><strong>${p.stats?.milestone_done || 0}</strong><span>Completed</span></div>
          <div><strong>${p.stats?.completion_pct || 0}%</strong><span>Progress</span></div>
        </div>
        <div class="milestone-wrap" data-project-id="${p.project_id}">
          ${renderMilestones(p.project_id, ms, p.stats)}
        </div>
      </section>
    `;
  }

  async function wireProjectBlock(section, goalId, onReload) {
    const projectId = Number(section.getAttribute('data-project-id'));

    section.querySelector('.proj-edit')?.addEventListener('click', async () => {
      const p = await fetchProject(projectId, goalId);
      if (!p) return;
      const t = prompt('Project title', p.title);
      if (t === null || t.trim().length < 1) return;
      const d = prompt('Description (optional)', p.description || '') ?? '';
      const { res, data } = await api('PUT', `/api/projects/${projectId}`, {
        title: t.trim(),
        description: d.trim() || null
      });
      if (res.status === 401) {
        window.location.href = 'login.html';
        return;
      }
      if (!data.success) {
        showErr(data.error || 'Update failed');
        return;
      }
      await onReload();
    });

    section.querySelector('.proj-del')?.addEventListener('click', async () => {
      if (!confirm('Delete this project and its milestones?')) return;
      const { res, data } = await api('DELETE', `/api/projects/${projectId}`);
      if (res.status === 401) {
        window.location.href = 'login.html';
        return;
      }
      if (!data.success) {
        showErr(data.error || 'Delete failed');
        return;
      }
      await onReload();
    });

    const wrap = section.querySelector('.milestone-wrap');
    wireMilestones(wrap, projectId, onReload);
  }

  async function fetchProject(projectId) {
    const { res, data } = await api('GET', `/api/goals/${goalId}/hub`);
    if (!data.success) return null;
    return (data.projects || []).find((x) => x.project_id === projectId);
  }

  function wireMilestones(wrap, projectId, onReload) {
    if (!wrap) return;

    wrap.querySelectorAll('.ms-done').forEach((cb) => {
      cb.addEventListener('change', async () => {
        const id = cb.getAttribute('data-ms-id');
        const { res, data } = await api('PATCH', `/api/milestones/${id}/completion`, {
          is_completed: cb.checked
        });
        if (res.status === 401) {
          window.location.href = 'login.html';
          return;
        }
        if (!data.success) {
          showErr(data.error || 'Could not update milestone');
          cb.checked = !cb.checked;
          return;
        }
        await onReload();
      });
    });

    wrap.querySelectorAll('.ms-edit').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-ms-id');
        const { res, data } = await api('GET', `/api/projects/${projectId}/milestones`);
        if (!data.success) return;
        const m = (data.results || []).find((x) => String(x.milestone_id) === String(id));
        if (!m) return;
        const t = prompt('Milestone title', m.title);
        if (t === null || t.trim().length < 1) return;
        const desc = prompt('Description (optional)', m.description || '') ?? '';
        const td = prompt('Target date YYYY-MM-DD (optional)', m.target_date ? String(m.target_date).slice(0, 10) : '') ?? '';
        const { res: r2, data: d2 } = await api('PUT', `/api/milestones/${id}`, {
          title: t.trim(),
          description: desc.trim() || null,
          target_date: td.trim() || null
        });
        if (r2.status === 401) {
          window.location.href = 'login.html';
          return;
        }
        if (!d2.success) {
          showErr(d2.error || 'Update failed');
          return;
        }
        await onReload();
      });
    });

    wrap.querySelectorAll('.ms-del').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this milestone?')) return;
        const id = btn.getAttribute('data-ms-id');
        const { res, data } = await api('DELETE', `/api/milestones/${id}`);
        if (res.status === 401) {
          window.location.href = 'login.html';
          return;
        }
        if (!data.success) {
          showErr(data.error || 'Delete failed');
          return;
        }
        await onReload();
      });
    });

    wrap.querySelector('.ms-add')?.addEventListener('click', async () => {
      const titleIn = wrap.querySelector('.ms-new-title');
      const dateIn = wrap.querySelector('.ms-new-date');
      const title = titleIn.value.trim();
      if (title.length < 1) {
        showErr('Milestone title required');
        return;
      }
      const { res, data } = await api('POST', `/api/projects/${projectId}/milestones`, {
        title,
        target_date: dateIn.value || null
      });
      if (res.status === 401) {
        window.location.href = 'login.html';
        return;
      }
      if (!data.success) {
        showErr(data.error || 'Could not add milestone');
        return;
      }
      titleIn.value = '';
      dateIn.value = '';
      await onReload();
    });
  }

  async function loadAll() {
    showErr('');
    if (!goalId) {
      root.innerHTML = '';
      showErr('Missing goal id.');
      return;
    }

    const { res: hubRes, data: hubData } = await api('GET', `/api/goals/${goalId}/hub`);
    if (hubRes.status === 401) {
      window.location.href = 'login.html';
      return;
    }
    if (!hubData.success || !hubData.goal) {
      root.innerHTML = '';
      showErr(hubData.error || 'Goal not found.');
      return;
    }
    const goal = hubData.goal;
    const projects = hubData.projects || [];
    const stats = hubData.stats || { project_count: 0, milestone_total: 0, milestone_done: 0, completion_pct: 0 };

    let html = `
      <div class="goal-detail-head">
        <a href="goals.html" class="back-link">← All goals</a>
        <h1>${esc(goal.title)}</h1>
        <p style="color:var(--color-text-muted)">${esc(goal.category || '')}${goal.target_date ? ` · Target ${esc(goal.target_date)}` : ''}</p>
        ${goal.description ? `<p>${esc(goal.description)}</p>` : ''}
        <p><span class="status-badge">${esc(goal.status)}</span></p>
      </div>
      <section class="card goal-summary">
        <h2>Goal summary</h2>
        <div class="goal-card__stats">
          <div><strong>${stats.project_count || 0}</strong><span>Projects</span></div>
          <div><strong>${stats.milestone_done || 0}/${stats.milestone_total || 0}</strong><span>Milestones done</span></div>
          <div><strong>${stats.completion_pct || 0}%</strong><span>Total progress</span></div>
        </div>
        <div class="project-block__progress compact">
          <label>Overall completion</label>
          <div class="progress"><div class="progress-bar" style="width:${stats.completion_pct || 0}%"></div></div>
        </div>
      </section>
      <section class="card" style="margin-bottom:var(--space-lg)">
        <h2 style="margin-top:0">Add project</h2>
        <div class="inline-form">
          <input type="text" id="newProjectTitle" class="input" placeholder="Project title" />
          <input type="text" id="newProjectDesc" class="input" placeholder="Description (optional)" />
          <button type="button" class="btn btn-primary" id="addProjectBtn">Add project</button>
        </div>
      </section>
      <h2>Projects</h2>
    `;

    for (const p of projects) {
      html += renderProjectBlock(p);
    }

    if (projects.length === 0) {
      html += '<p>No projects yet. Add one above.</p>';
    }

    root.innerHTML = html;

    document.getElementById('addProjectBtn')?.addEventListener('click', async () => {
      const t = document.getElementById('newProjectTitle').value.trim();
      const d = document.getElementById('newProjectDesc').value.trim();
      if (t.length < 1) {
        showErr('Project title required');
        return;
      }
      const { res, data } = await api('POST', `/api/goals/${goalId}/projects`, {
        title: t,
        description: d || null
      });
      if (res.status === 401) {
        window.location.href = 'login.html';
        return;
      }
      if (!data.success) {
        showErr(data.error || 'Could not create project');
        return;
      }
      document.getElementById('newProjectTitle').value = '';
      document.getElementById('newProjectDesc').value = '';
      await loadAll();
    });

    root.querySelectorAll('.project-block').forEach((sec) => wireProjectBlock(sec, goalId, loadAll));
  }

  loadAll();
})();
