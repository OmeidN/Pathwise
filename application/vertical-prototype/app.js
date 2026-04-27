const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const categoryInput = document.getElementById("category");
const contentTypeInput = document.getElementById("contentType");
const skillAreaInput = document.getElementById("skillArea");
const costInput = document.getElementById("cost-filter");
const aiOnlyInput = document.getElementById("filter-ai-only");
const recommendedSection = document.getElementById("recommended-section");
const recommendedResults = document.getElementById("recommended-results");
const templateRecommendedSection = document.getElementById("template-recommended-section");
const templateRecommendedResults = document.getElementById("template-recommended-results");
const resultsEl = document.getElementById("results");
const applyFiltersBtn = document.querySelector(".btn-apply-filters");
const clearFiltersBtn = document.querySelector(".btn-clear-filters");
const tagCheckboxes = document.querySelectorAll('input[type="checkbox"][data-tag]');
const queryRegex = /^[a-z0-9 ]{1,40}$/i;

function resourceCardMarkup(resource) {
  const id = resource.resource_id || resource.id;
  const type = resource.content_type || "resource";
  let detailsHref = type === "resource" ? `resource.html?id=${id}` : "templates.html";
  if (type === "goal_template") detailsHref = `templates.html?id=${id}`;
  else if (type === "template" || type === "workflow") detailsHref = "templates.html";
  const badge = type !== "resource" ? `<p class="result-card-badge">${type}</p>` : Number(resource.is_ai_enabled) ? '<p class="result-card-badge">AI-enabled</p>' : "";
  return `
    <div class="result-card">
      <h3><a href="${detailsHref}">${resource.title}</a></h3>
      <p>${resource.description || ""}</p>
      ${badge}
      <div class="result-card-actions">
        <a href="${detailsHref}" class="btn btn-secondary result-card-link">View Details</a>
      </div>
    </div>
  `;
}

function getSelectedTags() {
  return Array.from(tagCheckboxes)
    .filter((checkbox) => checkbox.checked)
    .map((checkbox) => checkbox.value);
}

function updateUrl(params) {
  const queryString = params.toString();
  const nextUrl = queryString ? `?${queryString}` : window.location.pathname;
  history.replaceState(null, "", nextUrl);
}

function resetFilters() {
  searchInput.value = "";
  categoryInput.value = "";
  if (costInput) costInput.value = "";
  if (aiOnlyInput) aiOnlyInput.checked = false;

  // Reset all sidebar filters back to the default state.
  tagCheckboxes.forEach((checkbox) => {
    checkbox.checked = false;
  });
}

async function loadRecommendations() {
  if (!recommendedSection || !recommendedResults) return;

  try {
    const meResponse = await fetch("/api/me", { credentials: "include" });
    if (!meResponse.ok) {
      recommendedSection.hidden = true;
      return;
    }

    recommendedSection.hidden = false;
    recommendedResults.innerHTML = "<p>Loading recommendations...</p>";

    const recResponse = await fetch("/api/recommendations?limit=4", { credentials: "include" });
    const recData = await recResponse.json();
    if (!recResponse.ok || !recData.success) {
      throw new Error(recData.error || "Could not load recommendations.");
    }

    if (!Array.isArray(recData.results) || recData.results.length === 0) {
      recommendedResults.innerHTML = '<p class="results-empty">No recommendations yet. Add goals/projects to improve suggestions.</p>';
      return;
    }

    recommendedResults.innerHTML = recData.results.map((resource) => resourceCardMarkup(resource)).join("");
  } catch (_) {
    recommendedSection.hidden = true;
  }
}

function templateCardMarkup(template) {
  const tid = template.goal_id || template.template_id;
  const href = tid ? `templates.html?id=${tid}` : "templates.html";
  return `
    <div class="result-card">
      <h3><a href="${href}">${template.title}</a></h3>
      <p>${template.description || ""}</p>
      <p class="result-card-badge">goal template</p>
      <div class="result-card-actions">
        <a href="${href}" class="btn btn-secondary result-card-link">View</a>
      </div>
    </div>
  `;
}

async function loadTemplateRecommendations() {
  if (!templateRecommendedSection || !templateRecommendedResults) return;
  try {
    const meResponse = await fetch("/api/me", { credentials: "include" });
    if (!meResponse.ok) {
      templateRecommendedSection.hidden = true;
      return;
    }
    templateRecommendedSection.hidden = false;
    templateRecommendedResults.innerHTML = "<p>Loading template recommendations...</p>";
    const response = await fetch("/api/template-recommendations?limit=4", { credentials: "include" });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error("Could not load template recommendations.");
    if (!Array.isArray(data.results) || data.results.length === 0) {
      templateRecommendedResults.innerHTML = '<p class="results-empty">No template recommendations yet.</p>';
      return;
    }
    templateRecommendedResults.innerHTML = data.results.map((t) => templateCardMarkup(t)).join("");
  } catch (_) {
    templateRecommendedSection.hidden = true;
  }
}

async function runSearch(event) {
  event.preventDefault();

  const q = searchInput.value.trim();
  const category = categoryInput.value;
  const contentType = contentTypeInput?.value || "";
  const skillArea = skillAreaInput?.value.trim() || "";

  resultsEl.innerHTML = Array.from({ length: 6 }).map(() => `
    <div class="result-card result-card--skeleton">
      <div class="skeleton-block skeleton-title"></div>
      <div class="skeleton-block skeleton-line"></div>
      <div class="skeleton-block skeleton-line skeleton-line--short"></div>
    </div>
  `).join("");

  if (q && !queryRegex.test(q)) {
    resultsEl.innerHTML = `<p class="error">Search must be 1-40 characters with letters, numbers, and spaces only.</p>`;
    return;
  }

  try {
    const params = new URLSearchParams();
    const selectedTags = getSelectedTags();
    const cost = costInput?.value || "";

    if (q) params.append("q", q);
    if (category) params.append("category", category);
    if (contentType) params.append("type", contentType);
    if (skillArea) params.append("skill_area", skillArea);
    if (selectedTags.length > 0) params.append("tags", selectedTags.join(","));
    if (cost) params.append("cost", cost);
    if (aiOnlyInput && aiOnlyInput.checked) params.append("ai", "1");

    updateUrl(params);

    const response = await fetch(`/api/search?${params.toString()}`);
    const data = await response.json();

    if (!data.success) {
      resultsEl.innerHTML = `<p class="error">Error: ${data.error}</p>`;
      return;
    }

    if (data.results.length === 0) {
      resultsEl.innerHTML = `
        <div class="results-empty">
          <p>No resources match your filters. Try adjusting your search.</p>
        </div>
      `;
      return;
    }

    resultsEl.innerHTML = data.results.map((resource) => resourceCardMarkup(resource)).join("");
  } catch (error) {
    resultsEl.innerHTML = `<p class="error">Error: ${error.message}</p>`;
  }
}

searchForm.addEventListener("submit", runSearch);

if (costInput) {
  costInput.addEventListener("change", () => {
    searchForm.dispatchEvent(new Event("submit"));
  });
}

tagCheckboxes.forEach((checkbox) => {
  checkbox.addEventListener("change", () => {
    searchForm.dispatchEvent(new Event("submit"));
  });
});

if (aiOnlyInput) {
  aiOnlyInput.addEventListener("change", () => {
    searchForm.dispatchEvent(new Event("submit"));
  });
}

if (applyFiltersBtn) {
  applyFiltersBtn.addEventListener("click", () => {
    searchForm.dispatchEvent(new Event("submit"));
  });
}

if (clearFiltersBtn) {
  clearFiltersBtn.addEventListener("click", () => {
    resetFilters();
    updateUrl(new URLSearchParams());

    // Keep the cleared state obvious so users know the button worked.
    resultsEl.innerHTML = `<p>Filters cleared. Enter a search or choose filters to see resources.</p>`;
  });
}

const pageParams = new URLSearchParams(window.location.search);
if (pageParams.get("q")) searchInput.value = pageParams.get("q");
if (pageParams.get("category")) categoryInput.value = pageParams.get("category");
if (pageParams.get("type") && contentTypeInput) contentTypeInput.value = pageParams.get("type");
if (pageParams.get("skill_area") && skillAreaInput) skillAreaInput.value = pageParams.get("skill_area");
if (pageParams.get("cost") && costInput) costInput.value = pageParams.get("cost");
if (pageParams.get("ai") === "1" && aiOnlyInput) aiOnlyInput.checked = true;
if (pageParams.get("tags")) {
  const tags = pageParams.get("tags").split(",").map((value) => value.trim());
  tagCheckboxes.forEach((checkbox) => {
    checkbox.checked = tags.includes(checkbox.value);
  });
}

if ([...pageParams.keys()].length > 0) {
  searchForm.dispatchEvent(new Event("submit"));
} else {
  searchForm.dispatchEvent(new Event("submit"));
}

loadRecommendations();
loadTemplateRecommendations();
