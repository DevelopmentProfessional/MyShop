const express = require('express');
const router = express.Router();

// Dummy route to ensure router works
router.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Router is working' });
});

// Export the router
module.exports = router; 