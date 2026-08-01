require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto    = require('crypto');
const { v4: uuidv4 } = require('uuid');
const axios     = require('axios');
const multer    = require('multer');
const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');

// ─── App ──────────────────────────────────────────────────────────────────────
const app  = express();
const PORT = process.env.PORT || 5001;
const IS_PROD = process.env.NODE_ENV === 'production';

app.set('trust proxy', true);

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
const limiterDefaults = {
  standardHeaders: true,
  legacyHeaders:   false,
  validate:        false,
  handler: (req, res) => {
    const resetMs    = req.rateLimit?.resetTime ? req.rateLimit.resetTime - Date.now() : 60000;
    const retryAfter = Math.max(1, Math.ceil(resetMs / 1000));
    console.log(`[RATE-LIMIT] ${req.ip} → ${req.method} ${req.path} | limit=${req.rateLimit?.limit} window=${req.rateLimit?.windowMs}ms`);
    res.setHeader('Retry-After', retryAfter);
    res.status(429).json({ error: 'Too many requests. Please wait before trying again.', retryAfter });
  },
};

const authLimiter = rateLimit({ ...limiterDefaults, windowMs: 15 * 60 * 1000, max: 10 });
const paymentLimiter = rateLimit({ ...limiterDefaults, windowMs: 60 * 1000, max: 30 });

// No general rate limiter — public reads need no limiting, admin is token-protected.

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

// ─── Email (Nodemailer / Gmail SMTP) ─────────────────────────────────────────
let mailer = null;
if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
  mailer = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });
  mailer.verify(err => {
    if (err) console.error('\u274c Gmail SMTP error:', err.message);
    else     console.log('\u2705 Gmail SMTP ready \u2014 emails enabled');
  });
} else {
  console.log('\ud83d\udce7 Email disabled \u2014 set GMAIL_USER + GMAIL_APP_PASSWORD to enable');
}

function buildEmailHtml(prediction, reference, currency, amount) {
  const tips = Array.isArray(prediction.tips) ? prediction.tips : [];
  const tipsHtml = tips.length
    ? tips.map(t => `<li style="margin:6px 0;color:#e2e8f0;">${t}</li>`).join('')
    : '<li style="color:#64748b;">\u2014</li>';
  const categoryColors = {
    '2+':  { text: '#D4A017', bg: 'rgba(212,160,23,0.15)', border: '#D4A017' },
    '5+':  { text: '#F5C842', bg: 'rgba(245,200,66,0.15)', border: '#F5C842' },
    '10+': { text: '#E8E8E8', bg: 'rgba(232,232,232,0.1)',  border: '#E8E8E8' },
    '20+': { text: '#ff6b6b', bg: 'rgba(255,107,107,0.15)', border: '#ff6b6b' },
  };
  const cat = categoryColors[prediction.oddsCategory] || categoryColors['2+'];
  const displayAmount = currency === 'NGN' ? `\u20a6${Number(amount).toLocaleString()}` : `GHS ${amount}`;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your Prediction</title></head><body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',Helvetica,Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 16px;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#111111;border-radius:20px;overflow:hidden;border:1px solid rgba(212,160,23,0.2);"><tr><td style="height:4px;background:linear-gradient(90deg,#D4A017,#F5C842,#D4A017);"></td></tr><tr><td style="padding:32px 36px 24px;border-bottom:1px solid rgba(255,255,255,0.06);"><table width="100%" cellpadding="0" cellspacing="0"><tr><td><p style="margin:0 0 4px;font-size:22px;font-weight:800;color:#D4A017;">\u26bd ${process.env.EMAIL_FROM_NAME||'Predictions'}</p><p style="margin:0;font-size:13px;color:#555;">Premium Football Predictions</p></td><td align="right"><span style="display:inline-block;padding:6px 14px;background:rgba(34,197,94,0.12);color:#22c55e;border:1px solid rgba(34,197,94,0.3);border-radius:50px;font-size:12px;font-weight:700;">\ud83d\udd13 UNLOCKED</span></td></tr></table></td></tr><tr><td style="padding:28px 36px 0;"><p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#555;letter-spacing:2px;text-transform:uppercase;">Your Prediction</p><h1 style="margin:0 0 12px;font-size:22px;font-weight:800;color:#f5f5f5;line-height:1.3;">${prediction.match||'Prediction'}</h1><table cellpadding="0" cellspacing="0"><tr><td style="padding-right:12px;"><span style="display:inline-block;padding:4px 12px;background:${cat.bg};color:${cat.text};border:1px solid ${cat.border};border-radius:8px;font-size:11px;font-weight:800;letter-spacing:1.5px;">${prediction.oddsCategory||'\u2014'} ODDS</span></td>${prediction.league?`<td><span style="font-size:12px;color:#64748b;">${prediction.league}</span></td>`:''} ${prediction.odds?`<td style="padding-left:12px;"><span style="font-size:13px;font-weight:700;color:${cat.text};">@${prediction.odds}</span></td>`:''}</tr></table></td></tr>${prediction.bookingCode?`<tr><td style="padding:24px 36px 0;"><p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#555;letter-spacing:2px;text-transform:uppercase;">Booking / Bet Code</p><div style="background:rgba(212,160,23,0.08);border:1px solid rgba(212,160,23,0.25);border-radius:12px;padding:16px 20px;"><p style="margin:0;font-size:22px;font-weight:800;color:#D4A017;letter-spacing:3px;font-family:monospace;">${prediction.bookingCode}</p></div></td></tr>`:''} ${tips.length?`<tr><td style="padding:24px 36px 0;"><p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#555;letter-spacing:2px;text-transform:uppercase;">Tips</p><ul style="margin:0;padding-left:20px;">${tipsHtml}</ul></td></tr>`:''} ${prediction.content?`<tr><td style="padding:20px 36px 0;"><p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#555;letter-spacing:2px;text-transform:uppercase;">Analysis</p><p style="margin:0;font-size:14px;color:#94a3b8;line-height:1.7;">${prediction.content}</p></td></tr>`:''} ${prediction.imageUrl?`<tr><td style="padding:24px 36px 0;"><p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#555;letter-spacing:2px;text-transform:uppercase;">Bet Slip</p><img src="cid:betslip" alt="Bet Slip" style="width:100%;max-width:528px;border-radius:12px;border:1px solid rgba(255,255,255,0.06);display:block;" /></td></tr>`:''}<tr><td style="padding:28px 36px;"><div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:16px 20px;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="font-size:12px;color:#555;">Amount paid</td><td align="right" style="font-size:13px;font-weight:700;color:#22c55e;">${displayAmount}</td></tr><tr><td colspan="2" style="height:8px;"></td></tr><tr><td style="font-size:12px;color:#555;">Reference</td><td align="right" style="font-size:11px;color:#475569;font-family:monospace;">${reference}</td></tr></table></div></td></tr><tr><td style="padding:0 36px 32px;border-top:1px solid rgba(255,255,255,0.05);"><p style="margin:20px 0 6px;font-size:12px;color:#334155;text-align:center;">Keep this email for your records. Contact: <span style="color:#D4A017;">${process.env.GMAIL_USER||'support@example.com'}</span></p><p style="margin:0;font-size:11px;color:#1e293b;text-align:center;">\u26a0\ufe0f Bet responsibly. 18+ only.</p></td></tr><tr><td style="height:3px;background:linear-gradient(90deg,#D4A017,#F5C842,#D4A017);"></td></tr></table></td></tr></table></body></html>`;
}

async function sendPredictionEmail(email, prediction, reference, currency, amount) {
  if (!mailer) return;
  try {
    const subject = `\ud83d\udd13 Your Prediction \u2014 ${prediction.match||'Unlocked'}`;
    const html    = buildEmailHtml(prediction, reference, currency, amount);
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME||'Predictions'}" <${process.env.GMAIL_USER}>`,
      to: email, subject, html, attachments: [],
    };
    if (prediction.imageUrl) {
      try {
        const imgRes = await axios.get(prediction.imageUrl, { responseType:'arraybuffer', timeout:10000 });
        mailOptions.attachments.push({ filename:'betslip.jpg', content:Buffer.from(imgRes.data), contentType:imgRes.headers['content-type']||'image/jpeg', cid:'betslip' });
      } catch(imgErr) { console.warn('Email: image fetch failed \u2014', imgErr.message); }
    }
    await mailer.sendMail(mailOptions);
    console.log(`\ud83d\udce7 Email sent \u2192 ${email} (ref: ${reference})`);
  } catch(err) { console.error('\ud83d\udce7 Email send failed:', err.message); }
}


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

    sendPredictionEmail((email||txn.customer?.email||'').toLowerCase().trim(), prediction, reference, txn.currency||'GHS', txn.amount/100);
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

      sendPredictionEmail((txn.customer?.email||'').toLowerCase().trim(), prediction, reference, txn.currency||'GHS', txn.amount/100);
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
