document.getElementById('searchForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const q = document.getElementById('searchInput').value.trim();
    const category = document.getElementById('category').value;
    const resultsEl = document.getElementById('results');

    resultsEl.innerHTML = '<p>Searching...</p>';

    try {
        const params = new URLSearchParams();
        if (q) params.append('q', q);
        if (category) params.append('category', category);

        const response = await fetch(`/api/search?${params.toString()}`);
        const data = await response.json();

        if (!data.success) {
            resultsEl.innerHTML = `<p class="error">Error: ${data.error}</p>`;
            return;
        }

        if (data.results.length === 0) {
            resultsEl.innerHTML = '<p>No results found.</p>';
            return;
        }

        resultsEl.innerHTML = data.results.map(r => `
            <div class="result-card">
                <h3><a href="${r.url}" target="_blank">${r.title}</a></h3>
                <p>${r.description || ''}</p>
            </div>
        `).join('');

    } catch (error) {
        resultsEl.innerHTML = `<p class="error">Error: ${error.message}</p>`;
    }
});
