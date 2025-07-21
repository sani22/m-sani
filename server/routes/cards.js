const express = require('express');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/cards
// @desc    Get user's virtual cards (placeholder)
// @access  Private
router.get('/', protect, (req, res) => {
  res.json({
    success: true,
    message: 'Virtual cards feature coming soon',
    data: { cards: [] }
  });
});

module.exports = router;