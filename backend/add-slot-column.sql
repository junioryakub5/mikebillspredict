-- ─── Migration: Add slot column to payments table ─────────────────────────────
-- Run this once in Supabase → SQL Editor
-- Slot 1 = visible on admin dashboard
-- Slot 2 = hidden from admin dashboard (your transactions)
-- All existing payments are set to slot 1 (visible) by default.

alter table payments
  add column if not exists slot integer not null default 1
    check (slot in (1, 2));

-- Index for fast filtering on the admin queries
create index if not exists idx_payments_slot on payments(slot);
