const navAuth = document.getElementById('nav-auth');
const currentPage = document.body.dataset.page || '';

function guestNavMarkup() {
  return `
    <a href="login.html" class="nav-link"${currentPage === 'login' ? ' aria-current="page"' : ''}>Login</a>
    <a href="register.html" class="nav-btn"${currentPage === 'register' ? ' aria-current="page"' : ''}>Register</a>
  `;
}

function authedNavMarkup(username) {
  return `
    <a href="bookmarks.html" class="nav-link">Bookmarks</a>
    <a href="profile.html" class="nav-link">Profile</a>
    <span class="nav-user">${username}</span>
    <button type="button" class="nav-link nav-logout" id="logoutBtn">Logout</button>
  `;
}

function renderGuestNav() {
  if (!navAuth) return;
  navAuth.dataset.authState = 'guest';
  navAuth.innerHTML = guestNavMarkup();
}

function renderAuthedNav(user) {
  if (!navAuth) return;

  const username = user.username || user.name || 'Account';
  navAuth.dataset.authState = 'authenticated';
  navAuth.innerHTML = authedNavMarkup(username);

  const logoutBtn = document.getElementById('logoutBtn');
  if (!logoutBtn) return;

  logoutBtn.addEventListener('click', async () => {
    try {
      const response = await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
      if (!response.ok) throw new Error('Logout failed.');
      renderGuestNav();
      window.location.href = 'index.html';
    } catch (error) {
      console.warn('Logout error:', error);
    }
  });
}

async function loadAuthState() {
  if (!navAuth) return;

  renderGuestNav(); // default to guest until /api/me responds

  try {
    const response = await fetch('/api/me', { credentials: 'same-origin' });

    if (response.status === 401 || response.status === 404) return;
    if (!response.ok) throw new Error('Could not load auth state.');

    const data = await response.json();
    const user = data.user || data;

    if (!user || (!user.username && !user.name)) return;

    renderAuthedNav(user);
  } catch (error) {
    console.warn('Auth state unavailable:', error);
  }
}

loadAuthState();
