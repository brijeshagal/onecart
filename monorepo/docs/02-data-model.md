# 02 — Data model

**Status:** v1
**Last updated:** 2026-07-25

Postgres, with PostGIS for coverage. Schemas are indicative, not migration-ready — they show
shape, keys, and the invariants that matter.

---

## 0. Conventions

**Money is never a float.** Every amount is a `bigint` of minor units plus an explicit currency
code. Per [D-003](../DECISIONS.md#d-003--sender-sees-their-own-currency-fx-margin-baked-in) we
handle at least two currencies on every order, so an amount without a currency beside it is a
bug waiting to happen.

```sql
-- the pattern, repeated throughout
amount_minor   bigint not null,     -- 84000 = ₹840.00
currency       char(3) not null     -- 'INR', 'USD', 'CAD'
```

Other conventions:

- Timestamps are `timestamptz`, always. The sender and recipient are in different timezones by
  definition — see [06-frontend](./06-frontend.md) §timezone.
- Enum-ish text columns are generated from `constants/*.toml` and validated at the app boundary,
  not with Postgres enums (which are painful to alter).
- Soft delete only where an audit trail requires it. Otherwise delete.

---

## 1. Catalog

Straight from the blueprint, unchanged.

```sql
canonical_products (
  canonical_sku   uuid pk,
  brand           text,
  name            text,
  net_qty         numeric,
  unit            text,          -- g | ml | piece, from units.toml
  pack_count      int,
  category        text,          -- from categories.toml
  gtin            text null,
  active          bool
)

platform_product_map (
  canonical_sku       uuid,
  platform            text,
  platform_product_id text,      -- blinkit id | zepto id | instamart `spin`
  confidence          numeric,   -- 1.0 = human verified
  verified_by         text null, -- required for order path
  last_seen_at        timestamptz,
  primary key (canonical_sku, platform)
)
```

> **`verified_by IS NULL` may never enter the order path.**
>
> The matching pipeline (`pipelines/matching/`, Python, embeddings + rules) only ever
> *proposes*. A wrong mapping means someone's mother receives the wrong item, which in a gifting
> product is an unrecoverable trust failure, not a refund event.
>
> Enforce this in the query that builds a cart, not in application logic that could be bypassed:
> the join that resolves canonical SKUs to platform IDs for procurement filters
> `verified_by is not null`. There is no code path that can opt out.

Note `platform_product_id` is a single text column across platforms with quite different
identity schemes — Instamart's is `spin`/`spinId`, per [03-adapters](./03-adapters.md) §3.3.
Keeping it opaque is deliberate; we never parse it.

v1: ~200 hand-verified staples.

---

## 2. Coverage

```sql
platform_stores (
  platform        text,
  store_id        text,
  geom            geometry(Point, 4326),
  geofence        geometry(Polygon, 4326) null,  -- Zepto only, see below
  active          bool,
  last_seen_at    timestamptz,
  primary key (platform, store_id)
)

coverage_cells (
  platform        text,
  cell            geometry(Point, 4326),
  store_id        text null,
  serviceable     bool,
  eta_band        text null,
  road_distance_m int null,       -- Blinkit promise_time_state.DistanceInMeter
  last_verified   timestamptz,
  probe_failures  int default 0,
  primary key (platform, cell)
)
```

Two population strategies, per [01-architecture](./01-architecture.md) §2.2:

- **Zepto** fills `geofence` directly from `storeDetailsResponse.servicableGeofence`. Coverage is
  then a point-in-polygon query against their own data — exact and free. *(Their misspelling; we
  match it in the deserializer and normalise on the way in.)*
- **Blinkit and Instamart** have no exposed polygon, so `coverage_cells` is filled by a nightly
  grid probe driven by population density.

`probe_failures` exists because a single failed probe is a transient store outage, not evidence
of unserviceability. Only write `serviceable = false` after repeated failures across a window —
otherwise the table slowly fills with false negatives that nothing ever corrects.

**No `city` column anywhere.** Per
[D-006](../DECISIONS.md#d-006--national-from-day-one-no-city-scoping), city is not a unit of
anything here.

---

## 3. People

Senders authenticate. Recipients do not — per the blueprint §7, they are an address-book entity
owned by a sender, never a user account.

```sql
senders (
  sender_id       uuid pk,
  email           citext unique not null,
  display_name    text,
  home_currency   char(3) not null,   -- what we charge them in, D-003
  home_timezone   text not null,      -- IANA, for display only
  created_at      timestamptz
)

sender_credentials (
  sender_id       uuid,
  kind            text,               -- passkey | oauth_google | oauth_apple
  external_id     text,
  created_at      timestamptz,
  primary key (sender_id, kind, external_id)
)

recipients (
  recipient_id    uuid pk,
  sender_id       uuid not null,      -- owned by, not shared
  display_name    text not null,
  phone_e164      text not null,      -- Indian number, REQUIRED, see below
  address_line    text not null,
  landmark        text null,
  pin             text not null,
  geo             geometry(Point, 4326) not null,
  timezone        text not null,      -- always Asia/Kolkata in v1
  verified_at     timestamptz null,   -- set when recipient confirms via share link
  created_at      timestamptz
)
```

**No phone number on `senders`, deliberately.** Sender auth is email + passkey with OAuth as the
fast path. No SMS anywhere — it removes an entire account-takeover vector, which matters because
a compromised sender account can spend a stored card.

**`recipients.phone_e164` is mandatory and Indian.** The rider calls it and the supplier requires
it at checkout. There is no way around this; see [03-adapters](./03-adapters.md) §5.4. It is the
one place a phone number is unavoidable, and it belongs to the recipient rather than the sender.

`verified_at` is set when a recipient confirms their own address through a share link — which is
one of the four things [D-004](../DECISIONS.md#d-004--share-link-basket-ships-in-v1) buys us.

---

## 4. Baskets and share links

```sql
baskets (
  basket_id       uuid pk,
  sender_id       uuid not null,
  recipient_id    uuid null,          -- null until chosen
  status          text not null,      -- draft | shared | submitted | ordered | abandoned
  created_at      timestamptz,
  updated_at      timestamptz
)

basket_lines (
  basket_id       uuid,
  canonical_sku   uuid,
  qty             int not null check (qty > 0),
  added_by        text not null,      -- sender | recipient
  note            text null,          -- recipient's free text, e.g. "the small one"
  primary key (basket_id, canonical_sku)
)

basket_share_links (
  token           text pk,            -- URL-safe, high entropy, single basket
  basket_id       uuid not null,
  expires_at      timestamptz not null,
  opened_at       timestamptz null,
  submitted_at    timestamptz null,
  revoked_at      timestamptz null
)
```

The share link is the v1 flow, not a feature flag — see D-004.

**Security notes, because this is an unauthenticated surface:**

- The token is the only credential. High entropy, single-use in spirit, always expiring.
- A share link grants exactly two capabilities: read the basket's line items, and modify its
  lines and the recipient contact details. **It never exposes the sender's identity, payment
  details, order history, or other recipients.**
- The sender always reviews before paying. A recipient can propose a basket; only the sender
  authorises money.
- Rate-limit token guesses at the gateway.

`added_by` is worth keeping — it tells us over time whether recipients actually use this, which
is the assumption D-004 rests on.

---

## 5. Orders

```sql
orders (
  order_id            uuid pk,
  basket_id           uuid not null,
  sender_id           uuid not null,
  recipient_id        uuid not null,
  platform            text not null,       -- chosen by basket engine
  state               text not null,       -- from status.toml
  quoted_total_minor  bigint not null,     -- INR, what the supplier quoted
  quoted_currency     char(3) not null,    -- always 'INR' in v1
  charged_total_minor bigint not null,     -- sender currency, what we authorised
  charged_currency    char(3) not null,
  fx_rate             numeric not null,    -- INR per unit of charged_currency
  fx_margin_bps       int not null,        -- from fees.toml, recorded at quote
  quoted_at           timestamptz not null,
  created_at          timestamptz
)

order_lines (
  order_id            uuid,
  canonical_sku       uuid,
  platform_product_id text not null,       -- resolved at order time, frozen
  qty_ordered         int not null,
  qty_fulfilled       int null,            -- null until delivery
  unit_price_minor    bigint not null,     -- INR
  primary key (order_id, canonical_sku)
)

order_events (
  event_id        bigserial pk,
  order_id        uuid not null,
  from_state      text null,
  to_state        text not null,
  payload         jsonb,
  created_at      timestamptz not null
)
```

**`order_events` is the source of truth.** `orders.state` is a materialised convenience that must
be reconstructible by replaying events. Every transition is durably logged, idempotent, and
replayable.

`fx_rate` and `fx_margin_bps` are frozen onto the order at quote time. Never look them up later
— the rate that applied is a fact about that order, and recomputing it retroactively makes the
ledger unreconcilable.

`qty_fulfilled` is nullable and frequently less than `qty_ordered`. Per
[D-005](../DECISIONS.md#d-005--out-of-stock-means-refund-the-line-deliver-the-rest) we refund
out-of-stock lines rather than substituting, so partial fulfilment is the **common** path.

`order_lines.platform_product_id` is denormalised deliberately: the mapping in
`platform_product_map` can change, but what we actually ordered must not.

---

## 6. Procurement

The double-order guard from [03-adapters](./03-adapters.md) §7. This table is the entire
idempotency mechanism, because **no supplier accepts an idempotency key.**

```sql
procurement_attempts (
  idem_key            text pk,             -- ours, never sent to the supplier
  order_id            uuid not null,
  platform            text not null,
  session_account_id  uuid not null,
  status              text not null,       -- pending | complete | failed | adopted
  platform_order_id   text null,
  attempt_started_at  timestamptz not null,
  resolved_at         timestamptz null,
  failure_reason      text null
)
```

The row is written **before** the checkout call, never after. On an ambiguous failure we do not
retry — we call `list_recent_orders(since = attempt_started_at)`, match on address + total +
timestamp window, and either adopt the order (`status = 'adopted'`) or mark it failed.

`status = 'adopted'` is distinct from `'complete'` on purpose. It means "we are not certain we
placed this, but we found it and claimed it." Worth being able to count.

---

## 7. Supplier release watch

The **supplier build version** half of
[D-002](../DECISIONS.md#d-002--app_number-means-two-different-things-tracked-separately).

```sql
platform_release_watch (
  platform        text pk,
  app_version     text,          -- e.g. "19.4.2" — the build we impersonate
  observed_at     timestamptz,
  contract_hash   text,          -- hash of our golden fixture set
  status          text           -- ok | drift_suspected | drift_confirmed
)
```

Our own `api_contract_version` lives in config, not here, and the two are **never joined**. See
[01-architecture](./01-architecture.md) §5 for why that separation is load-bearing.

---

## 8. Payments

```sql
payment_intents (
  intent_id           uuid pk,
  order_id            uuid not null,
  psp_intent_id       text not null,
  auth_amount_minor   bigint not null,     -- includes drift buffer
  captured_minor      bigint null,
  currency            char(3) not null,    -- sender currency
  three_ds_result     text null,
  state               text not null,       -- requires_auth | authorized | captured
                                           -- | partially_captured | voided | refunded
  authorized_at       timestamptz null,
  captured_at         timestamptz null
)
```

`auth_amount_minor` is the quote plus the drift buffer from `fees.toml`. **We never capture above
auth**, and per the blueprint §5.1 we never silently charge an amount different from what was
shown. Detail in [04-payments](./04-payments.md).

`partially_captured` is a first-class state, again because D-005 makes partial fulfilment normal.

---

## 9. Ledger

Double-entry, multi-currency. Full treatment in [05-ledger](./05-ledger.md); shape here.

```sql
ledger_accounts (
  account_id      uuid pk,
  code            text unique not null,  -- e.g. 'customer_receivable',
                                         -- 'supplier_wallet', 'fx_margin_income'
  currency        char(3) not null,      -- an account holds ONE currency
  kind            text not null          -- asset | liability | income | expense | equity
)

ledger_transactions (
  txn_id          uuid pk,
  order_id        uuid null,
  description     text not null,
  created_at      timestamptz not null
)

ledger_entries (
  entry_id        bigserial pk,
  txn_id          uuid not null,
  account_id      uuid not null,
  amount_minor    bigint not null,       -- signed; + debit, − credit
  currency        char(3) not null,      -- must match the account's currency
  created_at      timestamptz not null
)
```

**Two invariants, both enforced in the database, not the application:**

1. Entries in a transaction sum to zero **per currency**. Not across currencies — a multi-currency
   transaction balances independently in each, with the FX difference booked explicitly to an FX
   account. This is what makes D-003 tractable.
2. `ledger_entries.currency` must equal the account's currency. An account holds exactly one
   currency; cross-currency movement always goes through an explicit FX account, never by
   implicit conversion.

The case that motivates all of this, from the blueprint §2.9: **the supplier refunds us in
wallet credit while we owe the customer cash.** That is two entries and a payable, in two
currencies. Without a real ledger you lose the plot around order 50 and cannot tell whether the
unit economics work.

---

## 10. Entity relationships

```
senders ──┬── sender_credentials
          ├── recipients
          └── baskets ──┬── basket_lines ──── canonical_products
                        ├── basket_share_links
                        └── orders ──┬── order_lines
                                     ├── order_events
                                     ├── procurement_attempts
                                     ├── payment_intents
                                     └── ledger_transactions ── ledger_entries

canonical_products ──── platform_product_map
platform_stores ──── coverage_cells
platform_release_watch                        (standalone)
```
