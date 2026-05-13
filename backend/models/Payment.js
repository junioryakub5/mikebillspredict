const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const paymentSchema = new mongoose.Schema(
  {
    predictionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Prediction',
      required: true,
    },
    predictionTitle: { type: String, default: '' },  // denormalised for dashboard display
    reference: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'GHS' },
    status: {
      type: String,
      enum: ['success', 'failed', 'pending'],
      default: 'pending',
    },
    accessToken: {
      type: String,
      default: () => uuidv4(),
    },
    // No expiry — one-time payment grants permanent access
  },
  { timestamps: true }
);

paymentSchema.index({ accessToken: 1 });
paymentSchema.index({ email: 1, predictionId: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
