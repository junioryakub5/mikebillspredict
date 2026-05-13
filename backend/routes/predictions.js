const express = require('express');
const Prediction = require('../models/Prediction');

const router = express.Router();

// GET /api/predictions — Active predictions (content hidden)
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const filter = { status: 'active' };
    if (category && category !== 'all') {
      filter.oddsCategory = category;
    }

    const predictions = await Prediction.find(filter)
      .sort({ createdAt: -1 })
      .select('-content -imageUrl') // Never expose content without payment
      .lean();

    res.json({ success: true, data: predictions });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch predictions', message: err.message });
  }
});

// GET /api/predictions/history — Completed predictions (content public for past results)
router.get('/history', async (req, res) => {
  try {
    const predictions = await Prediction.find({ status: 'completed' })
      .sort({ updatedAt: -1 })
      .lean();

    res.json({ success: true, data: predictions });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch history', message: err.message });
  }
});

module.exports = router;
