// TODO: Handle search button click event
document.getElementById('searchForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const q = document.getElementById('searchInput').value;
    const category = document.getElementById('category').value;
    const resultsEl = document.getElementById('resultsContent');

    resultsEl.textContent = 'Searching...';

    try {
        // TODO: Build and send GET request to backend API endpoint (TBD — waiting on Tban)
        // Placeholder endpoint: /api/search — update once GET /api/... is finalized
        const params = new URLSearchParams();
        if (q) params.append('q', q);
        if (category) params.append('category', category);

        const response = await fetch(`/api/search?${params.toString()}`);
        const data = await response.json();

        // TODO: Handle API response and render results to the page
        // Currently dumps raw JSON — replace with proper result rendering
        resultsEl.textContent = JSON.stringify(data, null, 2);

    } catch (error) {
        resultsEl.textContent = `Error: ${error.message}`;
    }
});
