require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto    = require('crypto');
const { v4: uuidv4 } = require('uuid');
const axios     = require('axios');
const multer    = require('multer');
const { createClient } = require('@supabase/supabase-js');

// ─── App ──────────────────────────────────────────────────────────────────────
const app  = express();
const PORT = process.env.PORT || 5001;
const IS_PROD = process.env.NODE_ENV === 'production';

// ─── Supabase client ──────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌  SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env');
  console.error('   1. Create a project at https://supabase.com');
  console.error('   2. Run backend/supabase-schema.sql in the SQL Editor');
  console.error('   3. Copy Project URL + service_role key into backend/.env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});
console.log('✅  Supabase client initialized →', SUPABASE_URL);

// ─── Storage bucket ───────────────────────────────────────────────────────────
const BUCKET = 'mikebills';

// ─── Multer (memory — buffers go straight to Supabase Storage) ───────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

// ─── Security: Helmet headers ─────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// ─── Security: CORS ───────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = (process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',').map(o => o.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// ─── Security: Rate Limiting ──────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const paymentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many payment requests. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Rate limit exceeded. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', generalLimiter);

// Body parsing — raw body needed for webhook HMAC verification
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));

// ─── Admin auth ───────────────────────────────────────────────────────────────
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'change-me-in-production';
const adminAuth = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token || token !== ADMIN_TOKEN) return res.status(401).json({ error: 'Unauthorized' });
  next();
};

// ─── Row mappers: Supabase snake_case → app camelCase ─────────────────────────
const toP = r => r ? ({
  _id: r.id,
  match: r.match,
  league: r.league,
  odds: r.odds,
  oddsCategory: r.odds_category,
  price: Number(r.price),
  content: r.content || '',
  bookingCode: r.booking_code || '',
  tips: Array.isArray(r.tips) ? r.tips : [],
  imageUrl: r.image_url || '',
  proofImageUrl: r.proof_image_url || '',
  startDay: r.start_day || '',
  endDay: r.end_day || '',
  date: r.date,
  status: r.status,
  result: r.result || null,
  createdAt: r.created_at,
}) : null;

const toMoney = r => r ? ({
  _id: r.id,
  predictionId: r.prediction_id,
  predictionTitle: r.prediction_title,
  reference: r.reference,
  email: r.email,
  amount: Number(r.amount),
  currency: r.currency,
  status: r.status,
  accessToken: r.access_token,
  createdAt: r.created_at,
}) : null;

// ─── DB helpers (Supabase) ────────────────────────────────────────────────────
const db = {
  async findPredictions(filter = {}) {
    let query = supabase.from('predictions').select('*');
    if (filter.status)       query = query.eq('status', filter.status);
    if (filter.oddsCategory) query = query.eq('odds_category', filter.oddsCategory);
    // Active: soonest first; completed: most recent first
    // Always add created_at as a stable tiebreaker so records with the same
    // date value don't shuffle randomly between requests.
    if (filter.status === 'completed') {
      query = query
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });
    } else {
      query = query
        .order('date', { ascending: true })
        .order('created_at', { ascending: true });
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(toP);
  },

  async findPredictionById(id) {
    const { data, error } = await supabase
      .from('predictions').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return toP(data);
  },

  async createPrediction(d) {
    const row = {
      match:          d.match,
      league:         d.league || '',
      odds:           d.odds || '',
      odds_category:  d.oddsCategory || '2+',
      price:          Number(d.price),
      content:        d.content || '',
      booking_code:   d.bookingCode || '',
      tips:           Array.isArray(d.tips) ? d.tips : [],
      image_url:      d.imageUrl || '',
      proof_image_url:d.proofImageUrl || '',
      start_day:      d.startDay || '',
      end_day:        d.endDay || '',
      date:           d.date ? new Date(d.date).toISOString() : new Date().toISOString(),
      status:         d.status || 'active',
      result:         d.result || null,
    };
    const { data, error } = await supabase
      .from('predictions').insert(row).select().single();
    if (error) throw error;
    return toP(data);
  },

  async updatePrediction(id, upd) {
    const colMap = {
      match:          'match',
      league:         'league',
      odds:           'odds',
      oddsCategory:   'odds_category',
      price:          'price',
      content:        'content',
      bookingCode:    'booking_code',
      tips:           'tips',
      imageUrl:       'image_url',
      proofImageUrl:  'proof_image_url',
      startDay:       'start_day',
      endDay:         'end_day',
      date:           'date',
      status:         'status',
      result:         'result',
    };
    const patch = {};
    for (const [k, col] of Object.entries(colMap)) {
      if (upd[k] !== undefined) {
        if (k === 'tips')  patch[col] = Array.isArray(upd[k]) ? upd[k] : [];
        else if (k === 'price') patch[col] = Number(upd[k]);
        else if (k === 'date')  patch[col] = new Date(upd[k]).toISOString();
        else patch[col] = upd[k];
      }
    }
    if (!Object.keys(patch).length) return this.findPredictionById(id);
    const { data, error } = await supabase
      .from('predictions').update(patch).eq('id', id).select().maybeSingle();
    if (error) throw error;
    return toP(data);
  },

  async deletePrediction(id) {
    // Null-out FK in payments first
    await supabase.from('payments').update({ prediction_id: null }).eq('prediction_id', id);
    const { data, error } = await supabase
      .from('predictions').delete().eq('id', id).select().maybeSingle();
    if (error) throw error;
    return toP(data);
  },

  async allPredictions() {
    // Use the same ordering as findPredictions (active→date ASC, then created_at)
    // so the admin list is stable and consistent with the public view.
    const { data, error } = await supabase
      .from('predictions').select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(toP);
  },

  async findPayment(query) {
    let q = supabase.from('payments').select('*');
    if (query.reference)    q = q.eq('reference', query.reference);
    if (query.status)       q = q.eq('status', query.status);
    if (query.email)        q = q.eq('email', query.email.toLowerCase().trim());
    if (query.predictionId) q = q.eq('prediction_id', query.predictionId);
    if (query.accessToken)  q = q.eq('access_token', query.accessToken);
    q = q.limit(1).maybeSingle();
    const { data, error } = await q;
    if (error) throw error;
    return toMoney(data);
  },

  async createPayment(d) {
    const row = {
      prediction_id:    d.predictionId,
      prediction_title: d.predictionTitle,
      reference:        d.reference,
      email:            d.email.toLowerCase().trim(),
      amount:           Number(d.amount),
      currency:         d.currency || 'GHS',
      status:           d.status,
      access_token:     d.accessToken || uuidv4(),
    };
    // Upsert on reference so duplicate webhook calls are idempotent
    const { data, error } = await supabase
      .from('payments').upsert(row, { onConflict: 'reference', ignoreDuplicates: true })
      .select().maybeSingle();
    if (error) throw error;
    // If ignoreDuplicates hit, re-fetch the existing row
    if (!data) return this.findPayment({ reference: d.reference });
    return toMoney(data);
  },

  async allPayments(page = 1, limit = 20) {
    const from = (page - 1) * limit;
    const to   = from + limit - 1;
    const { data, error, count } = await supabase
      .from('payments').select('*', { count: 'exact' })
      .eq('status', 'success')
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) throw error;
    return { data: (data || []).map(toMoney), total: count || 0 };
  },

  async stats() {
    const [totRes, actRes, comRes, payRes] = await Promise.all([
      supabase.from('predictions').select('*', { count: 'exact', head: true }),
      supabase.from('predictions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('predictions').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
      supabase.from('payments').select('*').eq('status', 'success').order('created_at', { ascending: false }),
    ]);
    if (totRes.error) throw totRes.error;
    if (payRes.error) throw payRes.error;
    return {
      total:     totRes.count || 0,
      active:    actRes.count || 0,
      completed: comRes.count || 0,
      payments:  (payRes.data || []).map(toMoney),
    };
  },
};

// ─── Helper: safe error response ─────────────────────────────────────────────
function safeError(res, statusCode, fallbackMsg, err) {
  if (IS_PROD) {
    console.error(`[${statusCode}]`, err?.message || fallbackMsg);
    return res.status(statusCode).json({ error: fallbackMsg });
  }
  return res.status(statusCode).json({ error: err?.message || fallbackMsg });
}

// ─── Helper: strip premium fields from predictions ────────────────────────────
function stripSensitive(prediction) {
  const { content, imageUrl, bookingCode, tips, proofImageUrl, ...safe } = prediction;
  return { ...safe, previewImageUrl: imageUrl || null };
}

// ─── Routes: Image Upload ─────────────────────────────────────────────────────
app.post('/api/upload', adminAuth, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const ext      = req.file.originalname.split('.').pop() || 'jpg';
    const filename = `${uuidv4()}.${ext}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(filename, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(filename);
    res.json({ success: true, url: publicUrl });
  } catch (err) { safeError(res, 500, 'Image upload failed', err); }
});

// ─── Routes: Public Predictions ───────────────────────────────────────────────
app.get('/api/predictions', async (req, res) => {
  try {
    const { category } = req.query;
    const filter = { status: 'active' };
    if (category && category !== 'all') filter.oddsCategory = category;
    const raw  = await db.findPredictions(filter);
    const safe = raw.map(stripSensitive);
    res.json({ success: true, data: safe });
  } catch (err) { safeError(res, 500, 'Failed to load predictions', err); }
});

app.get('/api/predictions/history', async (req, res) => {
  try {
    const raw = await db.findPredictions({ status: 'completed' });
    const safe = raw.map(prediction => {
      const { content, imageUrl, bookingCode, tips, proofImageUrl, ...rest } = prediction;
      return { ...rest, proofImageUrl: proofImageUrl || null, previewImageUrl: imageUrl || null };
    });
    res.json({ success: true, data: safe });
  } catch (err) { safeError(res, 500, 'Failed to load history', err); }
});

// ─── Routes: Payment ──────────────────────────────────────────────────────────
app.post('/api/payment/initiate', paymentLimiter, async (req, res) => {
  try {
    const { email, predictionId } = req.body;
    if (!email || !predictionId) return res.status(400).json({ error: 'email and predictionId required' });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ error: 'Invalid email format' });

    const prediction = await db.findPredictionById(predictionId);
    if (!prediction) return res.status(404).json({ error: 'Prediction not found' });

    const reference = `BT_${uuidv4().replace(/-/g, '').slice(0, 16)}`;

    const { data: psRes } = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: email.toLowerCase().trim(),
        amount: prediction.price * 100,
        currency: 'GHS',
        reference,
        metadata: { predictionId, match: prediction.match },
      },
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    );

    if (!psRes.status) {
      console.error('Paystack init failed:', psRes.message);
      return res.status(502).json({ error: 'Payment initialization failed. Please try again.' });
    }

    console.log('Payment initiated — ref:', reference);
    res.json({
      success: true,
      reference,
      accessCode: psRes.data.access_code,
      authorizationUrl: psRes.data.authorization_url,
      amount: prediction.price,
      currency: 'GHS',
    });
  } catch (err) {
    console.error('Initiate error:', err.response?.data || err.message);
    safeError(res, 500, 'Payment initialization failed', err);
  }
});

app.post('/api/payment/verify', paymentLimiter, async (req, res) => {
  try {
    const { reference, predictionId, email } = req.body;
    if (!reference || !predictionId) return res.status(400).json({ error: 'reference and predictionId required' });

    const existing = await db.findPayment({ reference, status: 'success' });
    if (existing) return res.json({ success: true, reference: existing.reference, accessToken: existing.accessToken, message: 'Already verified' });

    let txn;
    try {
      const { data: pRes } = await axios.get(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
        { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
      );
      txn = pRes.data;
    } catch (axiosErr) {
      const paystackMsg = axiosErr.response?.data?.message || axiosErr.message;
      console.error('Paystack verify error:', paystackMsg);
      return res.status(402).json({ error: 'Payment verification failed. Please contact support.' });
    }

    console.log('Paystack txn status:', txn?.status, '| ref:', reference, '| amount:', txn?.amount);

    if (!txn || txn.status !== 'success') {
      return res.status(402).json({ error: `Payment not successful. Status: ${txn?.status || 'unknown'}` });
    }

    const prediction = await db.findPredictionById(predictionId);
    if (!prediction) return res.status(404).json({ error: 'Prediction not found' });

    const expectedAmount = prediction.price * 100;
    if (txn.amount < expectedAmount) {
      console.error(`AMOUNT MISMATCH! Expected ${expectedAmount}, got ${txn.amount}. Ref: ${reference}`);
      return res.status(402).json({ error: 'Payment amount does not match. Please contact support.' });
    }

    const accessToken = uuidv4();
    await db.createPayment({
      predictionId, predictionTitle: prediction.match, reference,
      email: (email || txn.customer?.email || '').toLowerCase().trim(),
      amount: txn.amount / 100, currency: txn.currency || 'GHS',
      status: 'success', accessToken,
    });

    console.log('Payment verified OK — ref:', reference, 'amount:', txn.amount / 100);
    res.json({ success: true, reference, accessToken });
  } catch (err) {
    console.error('Verify route error:', err.message);
    safeError(res, 500, 'Payment verification failed', err);
  }
});

// ─── Paystack Webhook — HMAC-SHA512 verified ──────────────────────────────────
app.post('/api/payment/webhook', async (req, res) => {
  try {
    const secret    = process.env.PAYSTACK_SECRET_KEY;
    const signature = req.headers['x-paystack-signature'];

    if (!signature || !secret) {
      console.error('Webhook: missing signature or secret');
      return res.sendStatus(400);
    }

    const hash = crypto.createHmac('sha512', secret)
      .update(req.body)
      .digest('hex');

    if (hash !== signature) {
      console.error('Webhook: invalid signature');
      return res.sendStatus(401);
    }

    const event = JSON.parse(req.body.toString());
    console.log('Webhook event:', event.event, '| ref:', event.data?.reference);

    if (event.event === 'charge.success') {
      const txn = event.data;
      const reference = txn.reference;

      const existing = await db.findPayment({ reference, status: 'success' });
      if (existing) {
        console.log('Webhook: already processed ref:', reference);
        return res.sendStatus(200);
      }

      const predictionId = txn.metadata?.predictionId;
      if (!predictionId) {
        console.error('Webhook: no predictionId in metadata for ref:', reference);
        return res.sendStatus(200);
      }

      const prediction = await db.findPredictionById(predictionId);
      if (!prediction) {
        console.error('Webhook: prediction not found for ref:', reference);
        return res.sendStatus(200);
      }

      const expectedAmount = prediction.price * 100;
      if (txn.amount < expectedAmount) {
        console.error(`Webhook: amount mismatch! Expected ${expectedAmount}, got ${txn.amount}. Ref: ${reference}`);
        return res.sendStatus(200);
      }

      const accessToken = uuidv4();
      await db.createPayment({
        predictionId, predictionTitle: prediction.match, reference,
        email: (txn.customer?.email || '').toLowerCase().trim(),
        amount: txn.amount / 100, currency: txn.currency || 'GHS',
        status: 'success', accessToken,
      });

      console.log('Webhook: payment recorded — ref:', reference);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.sendStatus(500);
  }
});

app.post('/api/payment/restore', paymentLimiter, async (req, res) => {
  try {
    const { email, predictionId } = req.body;
    if (!email || !predictionId) return res.status(400).json({ error: 'email and predictionId required' });
    const payment = await db.findPayment({ email: email.toLowerCase().trim(), predictionId, status: 'success' });
    if (!payment) return res.status(404).json({ error: 'No payment found for this email and prediction' });
    res.json({ success: true, reference: payment.reference, accessToken: payment.accessToken });
  } catch (err) { safeError(res, 500, 'Failed to restore access', err); }
});

app.get('/api/access/:reference', async (req, res) => {
  try {
    const payment = await db.findPayment({ reference: req.params.reference, status: 'success' });
    if (!payment) return res.status(403).json({ error: 'Invalid or unverified reference' });
    const prediction = await db.findPredictionById(payment.predictionId);
    if (!prediction) return res.status(404).json({ error: 'Prediction not found' });
    res.json({ success: true, data: prediction });
  } catch (err) { safeError(res, 500, 'Access denied', err); }
});

// ─── Routes: Admin ────────────────────────────────────────────────────────────
app.get('/api/admin/predictions', adminAuth, async (req, res) => {
  try { res.json({ success: true, data: await db.allPredictions() }); }
  catch (err) { safeError(res, 500, 'Failed to load predictions', err); }
});

app.post('/api/admin/predictions', adminAuth, async (req, res) => {
  try {
    const { match, league, odds, oddsCategory, price, content, bookingCode, tips,
            imageUrl, proofImageUrl, date, status, result, startDay, endDay } = req.body;

    if (!match || !price || !date) {
      return res.status(400).json({ error: 'Missing required fields: match, price, date' });
    }
    if (isNaN(Number(price)) || Number(price) <= 0) {
      return res.status(400).json({ error: 'Price must be a positive number' });
    }

    const prediction = await db.createPrediction({
      match, league, odds, oddsCategory, price: Number(price),
      content: content || '', bookingCode: bookingCode || '',
      tips: Array.isArray(tips) ? tips : [], imageUrl: imageUrl || '',
      proofImageUrl: proofImageUrl || '', date: new Date(date),
      status: status || 'active', result: result || null,
      startDay: startDay || '', endDay: endDay || '',
    });
    res.status(201).json({ success: true, data: prediction });
  } catch (err) { safeError(res, 400, 'Failed to create prediction', err); }
});

app.put('/api/admin/predictions/:id', adminAuth, async (req, res) => {
  try {
    const upd = { ...req.body };
    if (upd.tips && !Array.isArray(upd.tips)) upd.tips = [];
    if (upd.price !== undefined && (isNaN(Number(upd.price)) || Number(upd.price) <= 0)) {
      return res.status(400).json({ error: 'Price must be a positive number' });
    }
    const prediction = await db.updatePrediction(req.params.id, upd);
    if (!prediction) return res.status(404).json({ error: 'Prediction not found' });
    res.json({ success: true, data: prediction });
  } catch (err) { safeError(res, 400, 'Failed to update prediction', err); }
});

app.delete('/api/admin/predictions/:id', adminAuth, async (req, res) => {
  try {
    const prediction = await db.deletePrediction(req.params.id);
    if (!prediction) return res.status(404).json({ error: 'Prediction not found' });
    res.json({ success: true, message: 'Prediction deleted' });
  } catch (err) { safeError(res, 500, 'Failed to delete prediction', err); }
});

app.get('/api/admin/payments', adminAuth, async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const { data, total } = await db.allPayments(page, limit);
    res.json({ success: true, data, total, pages: Math.ceil(total / limit) });
  } catch (err) { safeError(res, 500, 'Failed to load payments', err); }
});

app.get('/api/admin/stats', adminAuth, async (req, res) => {
  try {
    const { total, active, completed, payments } = await db.stats();
    const totalRevenue = payments.reduce((s, p) => s + (p.amount || 0), 0);
    const recentActivity = [...payments]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 20)
      .map(p => ({
        _id: p._id, email: p.email, predictionTitle: p.predictionTitle || '—',
        amount: p.amount, currency: p.currency || 'GHS', status: p.status, createdAt: p.createdAt,
      }));
    res.json({
      success: true, data: {
        totalSlips: total, activeSlips: active, completedSlips: completed,
        totalRevenue, totalSales: payments.length, recentActivity,
      },
    });
  } catch (err) { safeError(res, 500, 'Failed to load stats', err); }
});

app.post('/api/admin/login', authLimiter, (req, res) => {
  const { password } = req.body;
  if (!password || password !== ADMIN_TOKEN) return res.status(401).json({ error: 'Invalid credentials' });
  res.json({ success: true, token: ADMIN_TOKEN });
});

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', mode: 'supabase', url: SUPABASE_URL });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: IS_PROD ? 'Internal server error' : err.message });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Mike Bills Predict API on port ${PORT} [supabase mode]`);
});
