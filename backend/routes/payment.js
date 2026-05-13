const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const Payment = require('../models/Payment');
const Prediction = require('../models/Prediction');

const router = express.Router();

// POST /api/payment/verify
// Body: { reference, predictionId, email }
router.post('/verify', async (req, res) => {
  const { reference, predictionId, email } = req.body;

  if (!reference || !predictionId) {
    return res.status(400).json({ error: 'reference and predictionId are required' });
  }

  try {
    // 1. Check if payment already verified (idempotent)
    const existing = await Payment.findOne({ reference, status: 'success' });
    if (existing) {
      return res.json({
        success: true,
        reference: existing.reference,
        accessToken: existing.accessToken,
        message: 'Already verified',
      });
    }

    // 2. Verify with Paystack API
    const paystackRes = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const { data: txn } = paystackRes.data;

    if (!txn || txn.status !== 'success') {
      return res.status(402).json({ error: 'Payment not successful on Paystack' });
    }

    // 3. Validate amount matches prediction price
    const prediction = await Prediction.findById(predictionId);
    if (!prediction) {
      return res.status(404).json({ error: 'Prediction not found' });
    }

    const expectedKobo = prediction.price * 100; // GHS to pesewas
    if (txn.amount < expectedKobo) {
      return res.status(402).json({ error: 'Payment amount does not match prediction price' });
    }

    // 4. Create payment record with access token
    const accessToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const payment = await Payment.create({
      predictionId,
      reference,
      email: email || txn.customer?.email || '',
      amount: txn.amount / 100,
      status: 'success',
      accessToken,
      expiresAt,
    });

    res.json({
      success: true,
      reference: payment.reference,
      accessToken: payment.accessToken,
    });
  } catch (err) {
    if (err.response?.status === 404) {
      return res.status(404).json({ error: 'Transaction not found on Paystack' });
    }
    console.error('Payment verify error:', err.message);
    res.status(500).json({ error: 'Payment verification failed', message: err.message });
  }
});

module.exports = router;
