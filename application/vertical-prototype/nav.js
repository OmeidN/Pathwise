const navAuth = document.getElementById('nav-auth');
const currentPage = document.body.dataset.page || '';

function guestNavMarkup() {
  return `
    <a href="templates.html" class="nav-link${currentPage === 'templates' ? ' nav-link--active' : ''}">Templates</a>
    <a href="login.html" class="nav-link"${currentPage === 'login' ? ' aria-current="page"' : ''}>Login</a>
    <a href="register.html" class="nav-btn"${currentPage === 'register' ? ' aria-current="page"' : ''}>Register</a>
  `;
}

function authedNavMarkup(user) {
  const username = user.username || user.name || 'Account';
  const role = user.role || 'student';
  const adminLink =
    role === 'admin' || role === 'faculty' || role === 'staff'
      ? `<a href="admin.html" class="nav-link${currentPage === 'admin' ? ' nav-link--active' : ''}">Admin</a>`
      : '';
  const publishLink =
    role === 'faculty' || role === 'staff'
      ? `<a href="publish.html" class="nav-link${currentPage === 'publish' ? ' nav-link--active' : ''}">Publish</a>`
      : '';
  return `
    <a href="dashboard.html" class="nav-link${currentPage === 'dashboard' ? ' nav-link--active' : ''}">Dashboard</a>
    <a href="goals.html" class="nav-link${currentPage === 'goals' || currentPage === 'goal-detail' ? ' nav-link--active' : ''}">Goals</a>
    <a href="templates.html" class="nav-link${currentPage === 'templates' ? ' nav-link--active' : ''}">Templates</a>
    ${adminLink}
    ${publishLink}
    <a href="bookmarks.html" class="nav-link${currentPage === 'bookmarks' ? ' nav-link--active' : ''}">Bookmarks</a>
    <a href="reflections.html" class="nav-link${currentPage === 'reflections' ? ' nav-link--active' : ''}">Reflections</a>
    <a href="messages.html" class="nav-link${currentPage === 'messages' ? ' nav-link--active' : ''}">Messages</a>
    <a href="profile.html" class="nav-link${currentPage === 'profile' ? ' nav-link--active' : ''}">Profile</a>
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

  navAuth.dataset.authState = 'authenticated';
  navAuth.innerHTML = authedNavMarkup(user);

  const logoutBtn = document.getElementById('logoutBtn');
  if (!logoutBtn) return;

  logoutBtn.addEventListener('click', async () => {
    try {
      const response = await fetch('/api/logout', { method: 'POST', credentials: 'include' });
      if (!response.ok) throw new Error('Logout failed.');
      renderGuestNav();
      window.location.href = 'landing.html';
    } catch (error) {
      console.warn('Logout error:', error);
    }
  });
}

async function loadAuthState() {
  if (!navAuth) return;

  renderGuestNav(); // default to guest until /api/me responds

  try {
    const response = await fetch('/api/me', { credentials: 'include' });

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
