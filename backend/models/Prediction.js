const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema(
  {
    match: {
      type: String,
      required: [true, 'Match name is required'],
      trim: true,
    },
    league: {
      type: String,
      default: 'Football',
      trim: true,
    },
    odds: {
      type: String,
      required: [true, 'Odds are required'],
    },
    oddsCategory: {
      type: String,
      enum: ['2+', '5+', '10+', '20+'],
      required: [true, 'Odds category is required'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [1, 'Price must be at least 1 GHS'],
    },
    content: { type: String, default: '' },
    bookingCode: { type: String, default: '' },
    tips: [{ type: String }],
    imageUrl: { type: String, default: '' },
    proofImageUrl: { type: String, default: '' },  // result screenshot shown in History
    startDay: { type: String, default: '' },
    endDay: { type: String, default: '' },
    date: {
      type: Date,
      required: [true, 'Match date is required'],
    },
    status: {
      type: String,
      enum: ['active', 'completed'],
      default: 'active',
    },
    result: {
      type: String,
      enum: ['win', 'loss', null],
      default: null,
    },
  },
  { timestamps: true }
);

// Fast lookups by status & date
predictionSchema.index({ status: 1, date: -1 });

module.exports = mongoose.model('Prediction', predictionSchema);
