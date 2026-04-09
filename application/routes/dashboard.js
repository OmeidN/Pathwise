const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const { loadDashboardData } = require('../controllers/dashboardController');

const router = express.Router();

router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const { goals, projects, milestones, savedResources } = await loadDashboardData(req.session.userId);
    res.json({ success: true, goals, projects, milestones, savedResources });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
