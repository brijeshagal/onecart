-- 0001_init — schema from docs/02-data-model.md plus the procurement tables
-- from docs/11-procurement.md 3 that 02 assumes but never defines.
--
-- Conventions (docs/02-data-model.md 0):
--   money is bigint minor units + explicit char(3) currency, NEVER float
--   timestamps are timestamptz, always
--   enum-ish columns are text, validated at the app boundary from constants/*.toml

create extension if not exists postgis;
create extension if not exists citext;
create extension if not exists pgcrypto;

-- ============================================================ catalog

create table canonical_products (
  canonical_sku uuid primary key,
  brand         text    not null,
  name          text    not null,
  net_qty       numeric not null,
  unit          text    not null,          -- units.toml
  pack_count    int     not null default 1,
  category      text    not null,          -- categories.toml
  gtin          text,
  active        bool    not null default true
);

create table platform_product_map (
  canonical_sku       uuid    not null references canonical_products,
  platform            text    not null,
  platform_product_id text    not null,    -- opaque. never parsed.
  confidence          numeric not null,
  verified_by         text,                -- REQUIRED for the order path
  last_seen_at        timestamptz,
  primary key (canonical_sku, platform)
);

-- The load-bearing rule from docs/02-data-model.md 1, enforced where it cannot
-- be bypassed. A wrong mapping means someone's mother gets the wrong item.
create view order_path_product_map as
  select * from platform_product_map where verified_by is not null;

comment on view order_path_product_map is
  'The ONLY mapping source a cart build may join against. verified_by IS NULL never reaches procurement.';

-- ============================================================ coverage

create table platform_stores (
  platform     text not null,
  store_id     text not null,
  geom         geometry(Point, 4326) not null,
  geofence     geometry(Polygon, 4326),    -- Zepto hands us this; others null
  active       bool not null default true,
  last_seen_at timestamptz,
  primary key (platform, store_id)
);

create table coverage_cells (
  platform        text not null,
  cell            geometry(Point, 4326) not null,
  store_id        text,
  serviceable     bool not null,
  eta_band        text,
  road_distance_m int,                     -- Blinkit promise_time_state.DistanceInMeter
  last_verified   timestamptz not null,
  probe_failures  int not null default 0,  -- one failure is an outage, not a negative
  primary key (platform, cell)
);

-- no city column anywhere. D-006.

-- ============================================================ people

create table senders (
  sender_id     uuid primary key,
  email         citext unique not null,
  display_name  text,
  home_currency char(3) not null,
  home_timezone text    not null,
  created_at    timestamptz not null default now()
  -- deliberately no phone: no SMS anywhere on the sender side
);

create table sender_credentials (
  sender_id   uuid not null references senders,
  kind        text not null,               -- passkey | oauth_google | oauth_apple
  external_id text not null,
  created_at  timestamptz not null default now(),
  primary key (sender_id, kind, external_id)
);

create table recipients (
  recipient_id uuid primary key,
  sender_id    uuid not null references senders,   -- owned by, not shared
  display_name text not null,
  phone_e164   text not null,              -- Indian, mandatory. the rider calls it.
  address_line text not null,
  landmark     text,
  pin          text not null,
  geo          geometry(Point, 4326) not null,
  timezone     text not null default 'Asia/Kolkata',
  verified_at  timestamptz,                -- set when the recipient confirms via share link
  created_at   timestamptz not null default now()
);

-- ============================================================ baskets

create table baskets (
  basket_id    uuid primary key,
  sender_id    uuid not null references senders,
  recipient_id uuid references recipients,  -- null until chosen
  status       text not null,               -- draft|shared|submitted|ordered|abandoned
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table basket_lines (
  basket_id     uuid not null references baskets,
  canonical_sku uuid not null references canonical_products,
  qty           int  not null check (qty > 0),
  added_by      text not null,              -- sender | recipient
  note          text,
  primary key (basket_id, canonical_sku)
);

create table basket_share_links (
  token        text primary key,            -- high entropy, the only credential
  basket_id    uuid not null references baskets,
  expires_at   timestamptz not null,
  opened_at    timestamptz,
  submitted_at timestamptz,
  revoked_at   timestamptz
);

-- ============================================================ orders

create table orders (
  order_id            uuid primary key,
  basket_id           uuid not null references baskets,
  sender_id           uuid not null references senders,
  recipient_id        uuid not null references recipients,
  platform            text not null,
  state               text not null,        -- status.toml
  quoted_total_minor  bigint  not null,
  quoted_currency     char(3) not null,
  charged_total_minor bigint  not null,
  charged_currency    char(3) not null,
  fx_rate             numeric not null,     -- frozen at quote. never recomputed.
  fx_margin_bps       int     not null,
  quoted_at           timestamptz not null,
  created_at          timestamptz not null default now()
);

create index orders_recipient_state_idx on orders (recipient_id, state);

create table order_lines (
  order_id            uuid not null references orders,
  canonical_sku       uuid not null references canonical_products,
  platform_product_id text   not null,      -- denormalised deliberately: frozen
  qty_ordered         int    not null,
  qty_fulfilled       int,                  -- null until delivery; often < ordered
  unit_price_minor    bigint not null,
  primary key (order_id, canonical_sku)
);

-- source of truth. orders.state is a materialised convenience.
create table order_events (
  event_id   bigserial primary key,
  order_id   uuid not null references orders,
  from_state text,
  to_state   text not null,
  payload    jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================ procurement
-- docs/11-procurement.md 3

create table session_accounts (
  session_account_id   uuid primary key,
  platform             text not null,
  pool                 text not null check (pool in ('read','order')),
  phone_e164           text not null,
  state                text not null,
  profile_dir          text not null unique,   -- two accounts must never share a profile
  egress_id            text not null,          -- sticky identity, D-006
  auth_key_enc         bytea,                  -- pgcrypto sealed
  auth_verified_at     timestamptz,
  wallet_balance_minor bigint,                 -- INR minor units, order pool only
  flagged_reason       text,
  created_at           timestamptz not null default now()
);

-- Leasable set. This predicate is what keeps OTP off the procurement path.
create index session_accounts_leasable_idx
  on session_accounts (platform, pool, state, auth_verified_at);

create sequence lease_fence;

create table account_leases (
  session_account_id uuid primary key references session_accounts,
  order_id           uuid   not null references orders,
  fence              bigint not null,          -- a superseded worker aborts on mismatch
  acquired_at        timestamptz not null default now(),
  expires_at         timestamptz not null
);

create table platform_addresses (
  session_account_id  uuid not null references session_accounts,
  recipient_id        uuid not null references recipients,
  platform_address_id text,                    -- recorded only after read-back
  state               text not null,           -- absent|provisioning|present|orphaned|deleting
  refcount            int  not null default 0 check (refcount >= 0),
  last_verified_at    timestamptz,
  orphaned_at         timestamptz,
  primary key (session_account_id, recipient_id)
);

-- the entire idempotency mechanism. no supplier accepts an idempotency key.
create table procurement_attempts (
  idem_key           text primary key,       -- ours. never sent to the supplier.
  order_id           uuid not null references orders,
  platform           text not null,
  session_account_id uuid not null references session_accounts,
  status             text not null check (status in ('pending','complete','failed','adopted')),
  platform_order_id  text,
  attempt_started_at timestamptz not null,
  resolved_at        timestamptz,
  failure_reason     text
);

-- An adopted order must never be adopted twice. This is what makes the
-- reconciliation predicate in docs/11-procurement.md 8.2 safe.
create unique index procurement_attempts_platform_order_uniq
  on procurement_attempts (platform, platform_order_id)
  where platform_order_id is not null;

create table platform_release_watch (
  platform      text primary key,
  app_version   text,
  observed_at   timestamptz,
  contract_hash text,
  status        text not null default 'ok'   -- ok|drift_suspected|drift_confirmed
);

-- ============================================================ payments

create table payment_intents (
  intent_id         uuid primary key,
  order_id          uuid not null references orders,
  psp_intent_id     text not null,
  auth_amount_minor bigint  not null,        -- quote + drift buffer
  captured_minor    bigint,
  currency          char(3) not null,
  three_ds_result   text,
  state             text not null,
  authorized_at     timestamptz,
  captured_at       timestamptz
);

-- We never capture above auth.
alter table payment_intents add constraint capture_never_exceeds_auth
  check (captured_minor is null or captured_minor <= auth_amount_minor);

-- ============================================================ ledger

create table ledger_accounts (
  account_id uuid primary key,
  code       text unique not null,
  currency   char(3) not null,               -- an account holds exactly ONE currency
  kind       text not null check (kind in ('asset','liability','income','expense','equity'))
);

create table ledger_transactions (
  txn_id      uuid primary key,
  order_id    uuid references orders,
  description text not null,
  created_at  timestamptz not null default now()
);

create table ledger_entries (
  entry_id     bigserial primary key,
  txn_id       uuid    not null references ledger_transactions,
  account_id   uuid    not null references ledger_accounts,
  amount_minor bigint  not null,             -- signed: + debit, - credit
  currency     char(3) not null,
  created_at   timestamptz not null default now()
);

-- Invariant 2 of docs/02-data-model.md 9, in the database rather than the app:
-- an entry's currency must equal its account's currency. Cross-currency
-- movement always goes through an explicit FX account.
create or replace function ledger_entry_currency_matches_account()
returns trigger language plpgsql as $$
begin
  if (select currency from ledger_accounts where account_id = new.account_id)
     is distinct from new.currency then
    raise exception 'ledger_entries.currency % does not match account % currency',
      new.currency, new.account_id;
  end if;
  return new;
end $$;

create trigger ledger_entries_currency_guard
  before insert or update on ledger_entries
  for each row execute function ledger_entry_currency_matches_account();

-- Invariant 1: entries in a transaction sum to zero PER CURRENCY.
-- Deferred so a multi-row transaction can be built up before it balances.
create or replace function ledger_txn_balances_per_currency()
returns trigger language plpgsql as $$
declare offending record;
begin
  select currency, sum(amount_minor) as total into offending
    from ledger_entries where txn_id = new.txn_id
   group by currency having sum(amount_minor) <> 0
   limit 1;
  if found then
    raise exception 'ledger txn % does not balance in %: sum=%',
      new.txn_id, offending.currency, offending.total;
  end if;
  return null;
end $$;

create constraint trigger ledger_entries_balance_guard
  after insert or update on ledger_entries
  deferrable initially deferred
  for each row execute function ledger_txn_balances_per_currency();
