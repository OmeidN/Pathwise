const submitForm = document.getElementById('submitForm');
const submitButton = document.getElementById('submitButton');
const submitError = document.getElementById('submit-error');
const submitSuccess = document.getElementById('submit-success');
const imageInput = document.getElementById('image');

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
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('category_id', categoryId);
    if (url) formData.append('url', url);
    if (cost) formData.append('cost', cost);
    formData.append('tags', JSON.stringify(tags));

    if (imageInput && imageInput.files && imageInput.files[0]) {
      formData.append('image', imageInput.files[0]);
    }

    const response = await fetch('/api/resources', {
      method: 'POST',
      credentials: 'include',
      body: formData
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
