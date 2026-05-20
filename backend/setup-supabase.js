#!/usr/bin/env node
/**
 * setup-supabase.js
 * Run AFTER you've executed supabase-schema.sql in the Supabase SQL Editor.
 * This script:
 *   1. Verifies the Supabase connection
 *   2. Creates the 'mikebills' storage bucket (if it doesn't exist)
 *   3. Migrates all predictions + payments from mikebills.db into Supabase
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const Database = require('better-sqlite3');
const path = require('path');

const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌  Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

async function setup() {
  console.log('\n🔗  Connecting to Supabase →', SUPABASE_URL, '\n');

  // ── 1. Verify tables exist ──────────────────────────────────────────────
  console.log('📋  Checking tables…');
  const { error: tableErr } = await supabase.from('predictions').select('id').limit(1);
  if (tableErr) {
    console.error('❌  predictions table not found!');
    console.error('   → Go to Supabase → SQL Editor and run: backend/supabase-schema.sql');
    console.error('   → Error:', tableErr.message);
    process.exit(1);
  }
  console.log('   ✅  predictions table OK');

  const { error: payErr } = await supabase.from('payments').select('id').limit(1);
  if (payErr) {
    console.error('❌  payments table not found — run supabase-schema.sql first');
    process.exit(1);
  }
  console.log('   ✅  payments table OK\n');

  // ── 2. Create storage bucket ────────────────────────────────────────────
  console.log('🪣  Setting up storage bucket "mikebills"…');
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some(b => b.name === 'mikebills');
  if (exists) {
    console.log('   ✅  Bucket already exists\n');
  } else {
    const { error: bucketErr } = await supabase.storage.createBucket('mikebills', {
      public: true,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['image/*'],
    });
    if (bucketErr) {
      console.error('   ⚠️  Could not create bucket:', bucketErr.message);
      console.error('   → Create it manually: Supabase → Storage → New bucket → "mikebills" (public)');
    } else {
      console.log('   ✅  Bucket "mikebills" created (public)\n');
    }
  }

  // ── 3. Migrate SQLite data ──────────────────────────────────────────────
  const dbPath = path.join(__dirname, 'mikebills.db');
  let sqliteDb;
  try {
    sqliteDb = new Database(dbPath, { readonly: true });
  } catch {
    console.log('ℹ️  No mikebills.db found — skipping SQLite migration\n');
    return;
  }

  // Predictions
  const predictions = sqliteDb.prepare('SELECT * FROM predictions').all();
  console.log(`📦  Migrating ${predictions.length} predictions…`);
  let pOk = 0, pFail = 0;
  for (const r of predictions) {
    let tips;
    try { tips = JSON.parse(r.tips || '[]'); } catch { tips = []; }
    const row = {
      id: r.id,
      match: r.match,
      league: r.league || '',
      odds: r.odds || '',
      odds_category: r.odds_category || '2+',
      price: Number(r.price),
      content: r.content || '',
      booking_code: r.booking_code || '',
      tips,
      image_url: r.image_url || '',
      proof_image_url: r.proof_image_url || '',
      start_day: r.start_day || '',
      end_day: r.end_day || '',
      date: r.date ? new Date(r.date).toISOString() : new Date().toISOString(),
      status: r.status || 'active',
      result: r.result || null,
      created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    };
    const { error } = await supabase.from('predictions').upsert(row, { onConflict: 'id' });
    if (error) { console.error(`   ❌  "${r.match}":`, error.message); pFail++; }
    else        { console.log(`   ✅  "${r.match}"`); pOk++; }
  }
  console.log(`   → ${pOk} migrated, ${pFail} failed\n`);

  // Payments
  const payments = sqliteDb.prepare('SELECT * FROM payments').all();
  console.log(`💳  Migrating ${payments.length} payments…`);
  let mOk = 0, mFail = 0;
  for (const r of payments) {
    const row = {
      id: r.id,
      prediction_id: r.prediction_id || null,
      prediction_title: r.prediction_title || '',
      reference: r.reference,
      email: (r.email || '').toLowerCase().trim(),
      amount: Number(r.amount),
      currency: r.currency || 'GHS',
      status: r.status || 'pending',
      access_token: r.access_token || '',
      created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    };
    const { error } = await supabase.from('payments').upsert(row, { onConflict: 'id' });
    if (error) { console.error(`   ❌  ref ${r.reference}:`, error.message); mFail++; }
    else        { console.log(`   ✅  ref ${r.reference}`); mOk++; }
  }
  console.log(`   → ${mOk} migrated, ${mFail} failed\n`);

  sqliteDb.close();
  console.log('🎉  Setup complete! You can now run: node server.js\n');
}

setup().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
