const params = new URLSearchParams(window.location.search);
const resourceId = params.get('id');

console.log(resourceId);

async function loadResource() {
  try {
    const response = await fetch(`/api/resources/${resourceId}`, {
      credentials: 'include'  
    });
    
    const data = await response.json();
    
    if (!data.success) {
      document.getElementById('resource-detail').innerHTML = 
        `<p class="error">Error: ${data.error}</p>`;
      return;
    }
    
    console.log(data.resource); 
    displayResource(data.resource);
    
  } catch (error) {
    document.getElementById('resource-detail').innerHTML = 
      `<p class="error">Error loading resource: ${error.message}</p>`;
  }
}

// Call it when the page loads
loadResource();

function displayResource(resource) {
  const html = `
    <div class="resource-header">
      <a href="index.html" class="back-link">← Back to Search</a>
      <h1>${resource.title}</h1>
      <p class="resource-meta">
        Category: ${resource.category_name} | 
        Cost: ${resource.cost} | 
         ${resource.rating || 'N/A'}
      </p>
    </div>
    
    <div class="resource-body">
      <p class="description">${resource.description}</p>
      
      <div class="tags">
        ${resource.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
      </div>
      
      <div class="actions">
        <a href="${resource.url}" target="_blank" class="btn btn-primary">
          View Original Resource →
        </a>
        <button class="btn btn-secondary" onclick="saveResource(${resource.id})">
           Save Resource
        </button>
      </div>
    </div>
  `;
  
  document.getElementById('resource-detail').innerHTML = html;
}