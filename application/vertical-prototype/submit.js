const submitForm = document.getElementById('submitForm');
const submitButton = document.getElementById('submitButton');
const submitError = document.getElementById('submit-error');
const submitSuccess = document.getElementById('submit-success');

(async function requireAuthForSubmitPage() {
  try {
    const response = await fetch('/api/me', { credentials: 'include' });
    if (response.status === 401) {
      window.location.href = 'login.html';
    }
  } catch (_) {
    // ignore transient check failures
  }
})();

function showSubmitMessage(element, message) {
  submitError.hidden = true;
  submitSuccess.hidden = true;
  element.textContent = message;
  element.hidden = false;
}

submitForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const title = document.getElementById('title').value.trim();
  const url = document.getElementById('url').value.trim();
  const description = document.getElementById('description').value.trim();
  const categoryId = document.getElementById('category').value;
  const cost = document.getElementById('cost').value;
  const tags = Array.from(document.querySelectorAll('.submit-tags input[type="checkbox"]:checked'))
    .map((checkbox) => checkbox.value);

  if (!title || !description || !categoryId) {
    showSubmitMessage(submitError, 'Please complete the title, description, and category fields.');
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = 'Submitting...';

  try {
    const response = await fetch('/api/resources', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        url,
        description,
        category_id: categoryId,
        cost,
        tags
      })
    });

    if (response.status === 401) {
      window.location.href = 'login.html';
      return;
    }

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Could not submit resource.');
    }

    showSubmitMessage(submitSuccess, 'Resource submitted successfully.');
    window.location.href = `resource.html?id=${data.resource.resource_id}`;
  } catch (error) {
    showSubmitMessage(submitError, error.message);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Submit Resource';
  }
});
