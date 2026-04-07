
const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const categoryInput = document.getElementById("category");
const costInput = document.getElementById("cost-filter");
const queryRegex = /^[a-z0-9 ]{1,40}$/i;

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
    resultsEl.innerHTML = data.results
      .map(
        (r) => `
            <div class="result-card">
                <h3><a href="resource.html?id=${r.resource_id}">${r.title}</a></h3>
                <p>${r.description || ""}</p>
                <div class="result-card-actions">
                  <a href="resource.html?id=${r.resource_id}" class="btn btn-secondary result-card-link">View Details</a>
                </div>
            </div>
        `,
      )
      .join("");

    // Handle fetch errors
  } catch (error) {
    resultsEl.innerHTML = `<p class="error">Error: ${error.message}</p>`;
  }
});

// ADDED 3/26 — wire cost dropdown and tag checkboxes to re-submit the form
if (costInput) {
  costInput.addEventListener("change", () => {
    searchForm.dispatchEvent(new Event("submit"));
  });
}

document.querySelectorAll('input[type="checkbox"][data-tag]')
  .forEach(cb => {
    cb.addEventListener("change", () => {
      searchForm.dispatchEvent(new Event("submit"));
    });
  });

const pageParams = new URLSearchParams(window.location.search);
if (pageParams.get("q")) searchInput.value = pageParams.get("q");
if (pageParams.get("category")) categoryInput.value = pageParams.get("category");
if (pageParams.get("cost") && costInput) costInput.value = pageParams.get("cost");
if (pageParams.get("tags")) {
  const tags = pageParams.get("tags").split(",").map((v) => v.trim());
  document.querySelectorAll('input[type="checkbox"][data-tag]').forEach((cb) => {
    cb.checked = tags.includes(cb.value);
  });
}

if ([...pageParams.keys()].length > 0) {
  searchForm.dispatchEvent(new Event("submit"));
}
