const express = require('express');
const Prediction = require('../models/Prediction');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();

// All routes require admin auth
router.use(adminAuth);

// POST /api/admin/predictions — Create prediction
router.post('/predictions', async (req, res) => {
  try {
    const { match, league, odds, oddsCategory, price, content, imageUrl, date, status } = req.body;

    const prediction = await Prediction.create({
      match,
      league,
      odds,
      oddsCategory,
      price: Number(price),
      content,
      imageUrl: imageUrl || '',
      date: new Date(date),
      status: status || 'active',
      result: null,
    });

    res.status(201).json({ success: true, data: prediction });
  } catch (err) {
    res.status(400).json({ error: 'Failed to create prediction', message: err.message });
  }
});

// GET /api/admin/predictions — List all predictions
router.get('/predictions', async (req, res) => {
  try {
    const predictions = await Prediction.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: predictions });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch predictions', message: err.message });
  }
});

// PUT /api/admin/predictions/:id — Update prediction
router.put('/predictions/:id', async (req, res) => {
  try {
    const { match, league, odds, oddsCategory, price, content, imageUrl, date, status, result } = req.body;

    const prediction = await Prediction.findByIdAndUpdate(
      req.params.id,
      {
        ...(match && { match }),
        ...(league && { league }),
        ...(odds && { odds }),
        ...(oddsCategory && { oddsCategory }),
        ...(price !== undefined && { price: Number(price) }),
        ...(content !== undefined && { content }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(date && { date: new Date(date) }),
        ...(status && { status }),
        ...(result !== undefined && { result }),
      },
      { new: true, runValidators: true }
    );

    if (!prediction) {
      return res.status(404).json({ error: 'Prediction not found' });
    }

    res.json({ success: true, data: prediction });
  } catch (err) {
    res.status(400).json({ error: 'Failed to update prediction', message: err.message });
  }
});

// DELETE /api/admin/predictions/:id — Delete prediction
router.delete('/predictions/:id', async (req, res) => {
  try {
    const prediction = await Prediction.findByIdAndDelete(req.params.id);
    if (!prediction) {
      return res.status(404).json({ error: 'Prediction not found' });
    }
    res.json({ success: true, message: 'Prediction deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete prediction', message: err.message });
  }
});

module.exports = router;
