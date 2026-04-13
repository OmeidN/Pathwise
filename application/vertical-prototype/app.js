
const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const categoryInput = document.getElementById("category");
const costInput = document.getElementById("cost-filter");
const aiOnlyInput = document.getElementById("filter-ai-only");
const recommendedSection = document.getElementById("recommended-section");
const recommendedResults = document.getElementById("recommended-results");
const queryRegex = /^[a-z0-9 ]{1,40}$/i;
// -----
const applyFiltersBtn = document.querySelector(".btn-apply-filters");
const clearFiltersBtn = document.querySelector(".btn-clear-filters");

function resourceCardMarkup(resource) {
  return `
    <div class="result-card">
      <h3><a href="resource.html?id=${resource.resource_id}">${resource.title}</a></h3>
      <p>${resource.description || ""}</p>
      ${Number(resource.is_ai_enabled) ? '<p class="result-card-badge">AI-enabled</p>' : ""}
      <div class="result-card-actions">
        <a href="resource.html?id=${resource.resource_id}" class="btn btn-secondary result-card-link">View Details</a>
      </div>
    </div>
  `;
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

    recommendedResults.innerHTML = recData.results.map((r) => resourceCardMarkup(r)).join("");
  } catch (_) {
    recommendedSection.hidden = true;
  }
}

searchForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const q = searchInput.value.trim();
  const category = categoryInput.value;
  const resultsEl = document.getElementById("results");

  resultsEl.innerHTML = Array.from({ length: 6 }).map(() => `
  <div class="result-card result-card--skeleton">
    <div class="skeleton-block skeleton-title"></div>
    <div class="skeleton-block skeleton-line"></div>
    <div class="skeleton-block skeleton-line skeleton-line--short"></div>
    </div>
`).join('');

  if (q && !queryRegex.test(q)) {
    resultsEl.innerHTML = `<p class="error">Search must be 1-40 characters with letters, numbers, and spaces only.</p>`;
    return;
  }

  try {
    const params = new URLSearchParams();
    const selectedTags = Array.from(document.querySelectorAll('input[type="checkbox"][data-tag]:checked'))
      .map((checkbox) => checkbox.value);
    const cost = costInput?.value || "";

    if (q) params.append("q", q);
    if (category) params.append("category", category);
    if (selectedTags.length > 0) params.append("tags", selectedTags.join(","));
    if (cost) params.append("cost", cost);
    if (aiOnlyInput && aiOnlyInput.checked) params.append("ai", "1");
    history.replaceState(null, "", `?${params.toString()}`);

    const response = await fetch(`/api/search?${params.toString()}`);
    const data = await response.json();

    // Handle API response
    if (!data.success) {
      resultsEl.innerHTML = `<p class="error">Error: ${data.error}</p>`;
      return;
    }

    // Handle no results
    if (data.results.length === 0) {
      resultsEl.innerHTML = `
      <div class="results-empty">
      <p>No resources match your filters. Try adjusting your search.</p>
      </div>`;
      return;
    }

    // Render results
    resultsEl.innerHTML = data.results.map((r) => resourceCardMarkup(r)).join("");

    // Handle fetch errors
  } catch (error) {
    resultsEl.innerHTML = `<p class="error">Error: ${error.message}</p>`;
  }
});

// Commented the auto submit listeners, becuase it would be much 
// cleaner with one apply filter button

// ADDED 3/26 — wire cost dropdown and tag checkboxes to re-submit the form
// if (costInput) {
//   costInput.addEventListener("change", () => {
//     searchForm.dispatchEvent(new Event("submit"));
//   });
// }

// document.querySelectorAll('input[type="checkbox"][data-tag]')
//   .forEach(cb => {
//     cb.addEventListener("change", () => {
//       searchForm.dispatchEvent(new Event("submit"));
//     });
//   });

// if (aiOnlyInput) {
//   aiOnlyInput.addEventListener("change", () => {
//     searchForm.dispatchEvent(new Event("submit"));
//   });
// }

const pageParams = new URLSearchParams(window.location.search);
if (pageParams.get("q")) searchInput.value = pageParams.get("q");
if (pageParams.get("category")) categoryInput.value = pageParams.get("category");
if (pageParams.get("cost") && costInput) costInput.value = pageParams.get("cost");
if (pageParams.get("ai") === "1" && aiOnlyInput) aiOnlyInput.checked = true;
if (pageParams.get("tags")) {
  const tags = pageParams.get("tags").split(",").map((v) => v.trim());
  document.querySelectorAll('input[type="checkbox"][data-tag]').forEach((cb) => {
    cb.checked = tags.includes(cb.value);
  });
}

if ([...pageParams.keys()].length > 0) {
  searchForm.dispatchEvent(new Event("submit"));
}


// These buttons existed visually but were not functional

// The one apply filter button  
if (applyFiltersBtn) {
  applyFiltersBtn.addEventListener("click", () => {
    searchForm.dispatchEvent(new Event("submit"));
  });
}

// The clear filter buttong
if (clearFiltersBtn) {
  clearFiltersBtn.addEventListener("click", () => {
    searchInput.value = "";
    categoryInput.value = "";
    if (costInput) costInput.value = "";
    if (aiOnlyInput) aiOnlyInput.checked = false;

    document.querySelectorAll('input[type="checkbox"][data-tag]').forEach((cb) => {
      cb.checked = false;
    });

    history.replaceState(null, "", "index.html");
    document.getElementById("results").innerHTML = "<p>Waiting for input...</p>";
  });
}
// 

loadRecommendations();
