/**
 * Why:
 *   This file implements the dashboard page so users can see all their goals, projects,
 *   milestones as well as their resources and so on in one place without having the user
 *   go to each page to gather the informations.
 *
 * What:
 *   After it fetches the dashboard, it does simple computation to figure out the progress
 *   and render summaries as well as data tables.
 *
 * Where used:
 *   It is loaded/called by vertical-prototype/dashboard.html.
 *
 * Notes:
 *   - The APIs it calls: 
 *       /api/dashboard, 
 *       /api/recommendations.
 *   - As usual, we redirect user to the login.html on 401
 *   - It expects #dashboard-content to exist in the dashboard html page so it can properly
 *     showcase all the computed results.
 */

(async function loadDashboard() {
  const root = document.getElementById("dashboard-content");
  const activeGoalsCount = document.getElementById("active-goals-count");
  const projectsCount = document.getElementById("projects-count");
  const milestonesCount = document.getElementById("milestones-count");
  const savedCount = document.getElementById("saved-count");
  const progressBar = document.getElementById("dashboard-progress-bar");
  const progressText = document.getElementById("dashboard-progress-text");
  const goalsTableBody = document.getElementById("goals-table-body");
  const projectsTableBody = document.getElementById("projects-table-body");
  const milestonesTableBody = document.getElementById("milestones-table-body");
  const savedResourcesTableBody = document.getElementById("saved-resources-table-body");

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatDate(value) {
    return value ? esc(String(value).slice(0, 10)) : "—";
  }

  function setCount(element, value) {
    if (element) {
      element.textContent = value;
    }
  }

  function setTableRows(element, markup) {
    if (element) {
      element.innerHTML = markup;
    }
  }

  try {
    const response = await fetch("/api/dashboard", { credentials: "include" });
    if (response.status === 401) {
      window.location.href = "login.html";
      return;
    }

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || "Failed to load dashboard");
    }

    const goals = data.goals || [];
    const projects = data.projects || [];
    const milestones = data.milestones || [];
    const savedResources = data.savedResources || [];

    const completedMilestones = milestones.filter((milestone) => milestone.is_completed).length;
    const activeGoals = goals.filter((goal) => goal.status === "active").length;
    const progressPercent = milestones.length
      ? Math.round((completedMilestones / milestones.length) * 100)
      : 0;

    // Update the top summary cards without rebuilding the whole layout.
    setCount(activeGoalsCount, activeGoals);
    setCount(projectsCount, projects.length);
    setCount(milestonesCount, `${completedMilestones}/${milestones.length}`);
    setCount(savedCount, savedResources.length);

    if (progressBar) {
      progressBar.style.width = `${progressPercent}%`;
    }
    if (progressText) {
      progressText.textContent = `${progressPercent}% milestone completion`;
    }

    const goalsRows = goals.length
      ? goals.map((goal) => `
          <tr>
            <td><a href="goal.html?id=${goal.goal_id}">${esc(goal.title)}</a></td>
            <td>${esc(goal.category || "—")}</td>
            <td>${esc(goal.status || "—")}</td>
            <td>${formatDate(goal.target_date)}</td>
          </tr>
        `).join("")
      : `<tr><td colspan="4">No goals yet. <a href="goals.html">Create a goal</a>.</td></tr>`;

    const projectsRows = projects.length
      ? projects.map((project) => `
          <tr>
            <td>${esc(project.title)}</td>
            <td><a href="goal.html?id=${project.goal_id}">Goal #${esc(project.goal_id)}</a></td>
            <td>${formatDate(project.updated_at)}</td>
          </tr>
        `).join("")
      : `<tr><td colspan="3">No projects yet.</td></tr>`;

    const milestonesRows = milestones.length
      ? milestones.map((milestone) => `
          <tr>
            <td>${esc(milestone.title)}</td>
            <td>Project #${esc(milestone.project_id)}</td>
            <td>${milestone.is_completed ? "Done" : "Open"}</td>
            <td>${formatDate(milestone.target_date)}</td>
          </tr>
        `).join("")
      : `<tr><td colspan="4">No milestones yet.</td></tr>`;

    const savedRows = savedResources.length
      ? savedResources.map((resource) => `
          <tr>
            <td><a href="resource.html?id=${resource.resource_id}">${esc(resource.title)}</a></td>
            <td>${formatDate(resource.bookmarked_at)}</td>
          </tr>
        `).join("")
      : `<tr><td colspan="2">No saved resources. <a href="index.html">Browse</a>.</td></tr>`;

    setTableRows(goalsTableBody, goalsRows);
    setTableRows(projectsTableBody, projectsRows);
    setTableRows(milestonesTableBody, milestonesRows);
    setTableRows(savedResourcesTableBody, savedRows);
  } catch (error) {
    root.innerHTML = `<p class="error">${esc(error.message)}</p>`;
  }
})();
