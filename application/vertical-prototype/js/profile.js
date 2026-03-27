// TODO (F12 — requires backend profile endpoint): Fetch user info and submitted resources.
// When the profile endpoint is ready:
//   1. Call GET /api/profile (or equivalent) with the session cookie
//   2. Replace skeleton blocks in #profile-card with actual username and email
//   3. Call GET /api/profile/submissions (or equivalent) to get user-submitted resources
//   4. Render submitted resources into #submitted-results using the same card markup as index.html
//   5. On empty submissions, show an empty state message in #submitted-results
//   6. On fetch error, reveal #profile-error with the error message in #profile-error-msg
