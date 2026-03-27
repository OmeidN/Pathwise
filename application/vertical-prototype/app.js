
document.getElementById("searchForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  // Get search query and category
  const q = document.getElementById("searchInput").value.trim();
  const category = document.getElementById("category").value;
  const resultsEl = document.getElementById("results");

  resultsEl.innerHTML = Array.from({ length: 6 }).map(() => `
  <div class="result-card result-card--skeleton">
    <div class="skeleton-block skeleton-title"></div>
    <div class="skeleton-block skeleton-line"></div>
    <div class="skeleton-block skeleton-line skeleton-line--short"></div>
    </div>
`).join('');

  // Basic client-side validation
  try {
    const params = new URLSearchParams();
    if (q) params.append("q", q);
    if (category) params.append("category", category);

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
                <h3><a href="${r.url}" target="_blank">${r.title}</a></h3>
                <p>${r.description || ""}</p>
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
const costFilter = document.getElementById("cost-filter");
if (costFilter) {
  costFilter.addEventListener("change", () => {
    document.getElementById("searchForm").dispatchEvent(new Event("submit"));
  });
}

document.querySelectorAll('input[type="checkbox"][data-tag]')
  .forEach(cb => {
    cb.addEventListener("change", () => {
      document.getElementById("searchForm").dispatchEvent(new Event("submit"));
    });
  });
