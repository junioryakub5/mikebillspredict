-- ─── Run this in Supabase → SQL Editor ───────────────────────────────────────

-- Predictions table
create table if not exists predictions (
  id          uuid primary key default gen_random_uuid(),
  match       text not null,
  league      text default 'Football',
  odds        text not null,
  odds_category text not null check (odds_category in ('2+','5+','10+','20+')),
  price       numeric not null,
  content     text default '',
  booking_code text default '',
  tips        text[] default '{}',
  image_url   text default '',
  proof_image_url text default '',
  start_day   text default '',
  end_day     text default '',
  date        timestamptz not null,
  status      text not null default 'active' check (status in ('active','completed')),
  result      text check (result in ('win','loss') or result is null),
  created_at  timestamptz default now()
);

-- Payments table
create table if not exists payments (
  id               uuid primary key default gen_random_uuid(),
  prediction_id    uuid references predictions(id),
  prediction_title text default '',
  reference        text not null unique,
  email            text not null,
  amount           numeric not null,
  currency         text default 'GHS',
  status           text not null default 'pending' check (status in ('success','failed','pending')),
  access_token     text not null default gen_random_uuid()::text,
  created_at       timestamptz default now()
);

-- Indexes
create index if not exists idx_predictions_status on predictions(status);
create index if not exists idx_payments_reference on payments(reference);
create index if not exists idx_payments_email on payments(email);
create index if not exists idx_payments_access_token on payments(access_token);

-- Storage bucket (run separately if not created via UI)
-- insert into storage.buckets (id, name, public) values ('boomtips25', 'boomtips25', true);
