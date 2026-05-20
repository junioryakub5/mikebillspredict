#!/usr/bin/env node
/**
 * migrate-sqlite-to-supabase.js
 * ──────────────────────────────
 * One-off script: reads mikebills.db (SQLite) and upserts all rows
 * into your Supabase project.
 *
 * Usage:
 *   node migrate-sqlite-to-supabase.js
 *
 * Requires .env with SUPABASE_URL and SUPABASE_SERVICE_KEY filled in.
 */

require('dotenv').config();
const Database = require('better-sqlite3');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌  Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env first');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

const sqliteDb = new Database(path.join(__dirname, 'mikebills.db'), { readonly: true });

async function migrate() {
  // ── Predictions ──────────────────────────────────────────────────────────
  const predictions = sqliteDb.prepare('SELECT * FROM predictions').all();
  console.log(`📦  Migrating ${predictions.length} predictions…`);

  for (const r of predictions) {
    let tips;
    try { tips = JSON.parse(r.tips || '[]'); } catch { tips = []; }
    const row = {
      id:              r.id,
      match:           r.match,
      league:          r.league || '',
      odds:            r.odds || '',
      odds_category:   r.odds_category || '2+',
      price:           Number(r.price),
      content:         r.content || '',
      booking_code:    r.booking_code || '',
      tips,
      image_url:       r.image_url || '',
      proof_image_url: r.proof_image_url || '',
      start_day:       r.start_day || '',
      end_day:         r.end_day || '',
      date:            r.date ? new Date(r.date).toISOString() : new Date().toISOString(),
      status:          r.status || 'active',
      result:          r.result || null,
      created_at:      r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    };
    const { error } = await supabase.from('predictions').upsert(row, { onConflict: 'id' });
    if (error) console.error(`  ❌ prediction ${r.id}:`, error.message);
    else       console.log(`  ✅ prediction "${r.match}" (${r.id})`);
  }

  // ── Payments ─────────────────────────────────────────────────────────────
  const payments = sqliteDb.prepare('SELECT * FROM payments').all();
  console.log(`\n💳  Migrating ${payments.length} payments…`);

  for (const r of payments) {
    const row = {
      id:               r.id,
      prediction_id:    r.prediction_id || null,
      prediction_title: r.prediction_title || '',
      reference:        r.reference,
      email:            (r.email || '').toLowerCase().trim(),
      amount:           Number(r.amount),
      currency:         r.currency || 'GHS',
      status:           r.status || 'pending',
      access_token:     r.access_token || '',
      created_at:       r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    };
    const { error } = await supabase.from('payments').upsert(row, { onConflict: 'id' });
    if (error) console.error(`  ❌ payment ${r.id}:`, error.message);
    else       console.log(`  ✅ payment ref ${r.reference} (${r.email})`);
  }

  console.log('\n🎉  Migration complete!');
  sqliteDb.close();
}

migrate().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
