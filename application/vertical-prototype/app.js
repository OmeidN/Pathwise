document.getElementById("searchForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  // Get search query and category
  const q = document.getElementById("searchInput").value.trim();
  const category = document.getElementById("category").value;
  const resultsEl = document.getElementById("results");

  resultsEl.innerHTML = "<p>Searching...</p>";

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
      resultsEl.innerHTML = "<p>No results found.</p>";
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
