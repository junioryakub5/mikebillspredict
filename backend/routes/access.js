const express = require('express');
const Payment = require('../models/Payment');
const Prediction = require('../models/Prediction');

const router = express.Router();

// GET /api/access/:reference
// Returns unlocked prediction content if payment is valid
router.get('/:reference', async (req, res) => {
  const { reference } = req.params;

  try {
    const payment = await Payment.findOne({ reference }).populate('predictionId');

    if (!payment) {
      return res.status(404).json({ error: 'Access not found. Please complete payment first.' });
    }

    if (payment.status !== 'success') {
      return res.status(403).json({ error: 'Payment was not successful.' });
    }

    if (new Date() > payment.expiresAt) {
      return res.status(403).json({ error: 'Access has expired. Predictions are valid for 7 days.' });
    }

    const prediction = payment.predictionId;
    if (!prediction) {
      return res.status(404).json({ error: 'Prediction no longer exists.' });
    }

    res.json({
      success: true,
      data: {
        prediction: {
          _id: prediction._id,
          match: prediction.match,
          league: prediction.league,
          odds: prediction.odds,
          oddsCategory: prediction.oddsCategory,
          date: prediction.date,
          status: prediction.status,
          result: prediction.result,
          content: prediction.content,      // ← revealed only here
          imageUrl: prediction.imageUrl,    // ← revealed only here
        },
        payment: {
          reference: payment.reference,
          email: payment.email,
          amount: payment.amount,
          expiresAt: payment.expiresAt,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve access', message: err.message });
  }
});

module.exports = router;
