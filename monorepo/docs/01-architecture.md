# 01 — Architecture

**Status:** v1
**Last updated:** 2026-07-25

Service topology, repo layout, and the constants pipeline.
Stack is fixed by [D-001](../DECISIONS.md#d-001--stack-build-it-as-blueprinted): Rust services,
TS gateway and web.

---

## 1. The constraint that shapes everything

Three data classes, three completely different strategies:

| Data class | Rate of change | Strategy | Owner |
|---|---|---|---|
| Serviceability, store assignment | weekly | precompute, cache days | Coverage |
| Catalog identity (brand, pack size, SKU exists) | weekly | precompute, cache days | Catalog |
| **Price, availability, ETA, fees** | **minutely, per dark store** | **live fetch, TTL 90s** | Adapters |

Only the third is expensive. Every decision below exists to avoid touching it.

The corollary is the single most useful architectural heuristic in this codebase: **if a request
can be answered without a live supplier call, it must be.** Coverage gates everything downstream
precisely so that nothing expensive fires for a pin that was never serviceable.

---

## 2. Topology

```
                        ┌─────────────────┐
   mobile web ─────────▶│    Gateway      │  TS / Workers
                        │  auth, idem,    │
                        │  rate limit     │
                        └────────┬────────┘
                                 │
          ┌──────────────┬───────┴───────┬──────────────┐
          ▼              ▼               ▼              ▼
   ┌────────────┐ ┌────────────┐ ┌─────────────┐ ┌────────────┐
   │  Coverage  │ │  Catalog   │ │   Basket    │ │Orchestrator│
   │   (Rust)   │ │   (Rust)   │ │   Engine    │ │   (Rust)   │
   │  PostGIS   │ │  Postgres  │ │   (Rust)    │ │  state m/c │
   └────────────┘ └────────────┘ └──────┬──────┘ └──────┬─────┘
                                        │               │
                                        ▼               ▼
                                 ┌──────────────────────────┐
                                 │     Adapter Layer        │
                                 │  blinkit / zepto / swiggy│
                                 │  http impl │ browser impl│
                                 └────────────┬─────────────┘
                                              │
                                 ┌────────────▼─────────────┐
                                 │      Session Pool        │
                                 │  read pool │ order pool  │
                                 │  national, sticky egress │
                                 └──────────────────────────┘

   ┌──────────┐  ┌──────────┐  ┌──────────────────────────┐
   │ Payments │  │  Ledger  │  │  Contract Test Harness   │
   │   (TS)   │  │  (Rust)  │  │  canary + auto-fallback  │
   └──────────┘  └──────────┘  └──────────────────────────┘
```

Changed from the blueprint: the session pool is split into read and order pools and is
**national, not per-city** — see
[D-006](../DECISIONS.md#d-006--national-from-day-one-no-city-scoping) and
[03-adapters](./03-adapters.md) §5.

### 2.1 Gateway (TS)

Thin. Auth, per-user rate limiting, idempotency key enforcement, request logging. **No business
logic.** If you are tempted to put a rule here, it belongs in a service.

Also terminates the SSE stream that pushes `PlatformHealth` to clients (§5).

### 2.2 Coverage (Rust + PostGIS)

```
coverage(lat, lng) -> [{ platform, store_id, serviceable, eta_band, last_verified }]
```

This gates every downstream call so nothing expensive fires for an unserviceable pin. It is the
only thing safe to cache for days.

**No concept of "city".** A pin resolves to a dark store or it does not. Per D-006, city is not a
unit of anything in this system — not accounts, not pools, not coverage.

Two population strategies, per platform:

- **Zepto: exact, free.** Their `get_page` response hands us `servicableGeofence`, a real
  delivery-boundary polygon. Store it as a PostGIS geometry and serviceability becomes a
  point-in-polygon query against their own data. No probing.
- **Blinkit and Instamart: probe.** No polygon is exposed, so a grid probe runs nightly and we
  store store-assignment plus road distance (Blinkit gives
  `promise_time_state.DistanceInMeter`). Drive the grid by **population density**, not by a city
  list — a raster like WorldPop at a density threshold collapses millions of candidate points to
  a few hundred thousand that could plausibly contain a customer.

Probe results are written with a `last_verified` timestamp and a confidence. Per
[03-adapters](./03-adapters.md) §4, a single failed probe is a transient store outage, not
evidence of unserviceability — retry across a window before writing a negative.

### 2.3 Catalog (Rust + Postgres)

Canonical products and the platform mappings that connect them to supplier SKUs. Schema in
[02-data-model](./02-data-model.md).

**The load-bearing rule: a mapping with `verified_by IS NULL` may never enter the order path.**
The matching pipeline (Python, embeddings + rules) only ever *proposes*. A wrong mapping means
someone's mother receives the wrong item, which in a gifting product is an unrecoverable trust
failure, not a refund event.

v1 catalog: ~200 hand-verified staples. Curated, not comprehensive.

### 2.4 Basket Engine (Rust)

```
landed(platform) = Σ line_price + delivery + handling + surge − discounts
```

Choose `argmin` over whole-basket-per-platform. Evaluate a 2-way split only when:

```
best_single − best_split > second_delivery + ops_cost
```

**Log the split evaluation on every basket, act on none of them in v1.** After ~500 baskets you
will know the real hit rate instead of guessing. Prediction to falsify: it fires under 5% of the
time. Writing the logging now and the action later costs nothing and settles the argument with
data.

In v1 only Blinkit is on the order path, so `argmin` is over a set of one. The engine still runs
the full comparison against Zepto and Instamart read-only shadow data, so the logs are real from
day one.

### 2.5 Orchestrator (Rust)

Durable state machine, Postgres-backed with an outbox table. **Do not pull in Temporal for a
beta.**

```
DRAFT → QUOTED → AUTHORIZED → PROCURING → PLACED → CONFIRMED
      → OUT_FOR_DELIVERY → DELIVERED → CAPTURED → SETTLED

branches:
  QUOTE_STALE           → re-quote or fail forward
  PROCUREMENT_FAILED    → void auth, notify
  PARTIAL_FULFILL       → capture partial, ledger the delta
  CANCELLED_BY_PLATFORM → REFUND_PENDING → REFUND_ISSUED
```

Every transition durably logged, idempotent, and replayable from `order_events`.

**`PARTIAL_FULFILL` is not an edge case.** Per
[D-005](../DECISIONS.md#d-005--out-of-stock-means-refund-the-line-deliver-the-rest) we refund
out-of-stock lines rather than substituting, which makes partial fulfilment the *common* path.
It must work correctly on the first real order, not eventually.

States are generated from `status.toml` (§4), so adding one forces both Rust and TS to handle it
or fail to compile.

### 2.6 Adapters + Session Pool (Rust)

The whole of [03-adapters](./03-adapters.md). Summary: `http` impl for reads with a
TLS-impersonating client, `browser` impl for checkout, per-method runtime flip on drift,
separate read and order session pools.

### 2.7 Payments (TS)

[04-payments](./04-payments.md). Merchant of record, forced 3DS, authorise at quote in the
sender's currency, capture actual at delivery.

### 2.8 Ledger (Rust + Postgres)

[05-ledger](./05-ledger.md). Double-entry, and **multi-currency from day one** because of
[D-003](../DECISIONS.md#d-003--sender-sees-their-own-currency-fx-margin-baked-in) — INR payable
to the supplier against a sender-currency receivable.

### 2.9 Contract Test Harness (Rust + CI)

**Build this first. Before any integration, before any UI.** Operational detail in
[08-ops-runbook](./08-ops-runbook.md).

- Golden fixtures per adapter, per endpoint — **and per browser selector**.
- Canary every 10 minutes, per platform.
- Assertions on response **bodies**, never status codes. See
  [03-adapters](./03-adapters.md) §4 — a 200 with an empty body is a failure.
- On drift: alert, auto-flip that adapter method to `browser`, open a task with the diff
  attached.

This is the direct fix for what stalled this project previously. The failure then was not
authoring speed — it was that nothing told you the integration had broken.

---

## 3. Repo layout

```
monorepo/
  README.md                    blueprint + index
  DECISIONS.md                 every resolved question, ADR style
  docs/                        01..10, this file among them

  constants/                   SINGLE SOURCE OF TRUTH — see §4
    platforms.toml
    categories.toml
    units.toml
    fees.toml
    status.toml
    limits.toml

  crates/
    constants/                 generated.rs — Rust enums + consts
    coverage/                  PostGIS, serviceability
    catalog/                   canonical products, mappings
    basket/                    argmin, split evaluation
    orchestrator/              state machine, outbox
    adapters/
      blinkit/                 http + browser impls
      zepto/                   read-only in v1
      swiggy/                  read-only in v1
      selectors/               versioned selector registry (03 §6.3)
    session/                   read pool + order pool
    ledger/                    double-entry, multi-currency
    harness/                   contract tests, fixtures, canary

  apps/
    gateway/                   TS — auth, idem, rate limit, SSE
    payments/                  TS — PSP integration
    web/                       Next.js — sender + recipient surfaces

  packages/
    constants/                 generated.ts — const objects + literal unions
    ui/                        component library, see 07

  pipelines/
    matching/                  Python — embeddings + rules, PROPOSES ONLY

  infra/
    migrations/
```

**Naming constraint, from [D-007](../DECISIONS.md#d-007--merchant-descriptor--open):** the brand
name is not yet decided. Keep it out of crate names, package names and database identifiers so a
rename stays a copy-change rather than a migration.

---

## 4. Constants: single source of truth, generated outward

Nothing hand-duplicated between Rust and TS. Ever.

| File | Holds |
|---|---|
| `platforms.toml` | platform ids, display names, brand-safe colours, order caps, impersonated client version (03 §4) |
| `categories.toml` | canonical category tree |
| `units.toml` | unit normalisation rules (g/kg/ml/l/piece) |
| `fees.toml` | service fee bands, **FX margin**, drift buffer % |
| `status.toml` | order states and legal transitions |
| `limits.toml` | per-user caps, per-card caps, rate limits, adapter concurrency caps |

Build step emits:

- `crates/constants/src/generated.rs` — Rust enums + consts
- `packages/constants/src/generated.ts` — TS const objects + literal union types
- `packages/constants/src/copy.json` — i18n keys

### Rules

- **No magic strings in either codebase.** A platform is `Platform::Blinkit`, never `"blinkit"`.
- Order states are generated from `status.toml`, so adding a state forces both sides to handle
  it or fail to compile. This is the point of generating them.
- **Fees live here, never in code, never in the DB.** Changing a fee is a PR with a diff you can
  read in review. This includes the FX margin.
- **CI fails if generated files are stale** relative to the TOML.

That last rule is what makes the whole scheme work. Without it, generated files drift from their
source and you get the worst of both worlds.

---

## 5. Our own API contract version

The second half of [D-002](../DECISIONS.md#d-002--app_number-means-two-different-things-tracked-separately),
and **deliberately unrelated to supplier drift** despite the similar name.

```
api_contract_version   monotonic integer, bumped when our public contract changes
```

- Served on every gateway response as a header.
- The web client compares it against the version it was built against. On mismatch: invalidate
  cached contract-shaped data and prompt a reload.
- Bumped by us, in a PR, deliberately.

**Never wire this to `platform_release_watch`.** Supplier drift is something that happens *to*
us and is watched reactively. Our contract version is something we choose. They share a shape
and nothing else; conflating them means a Blinkit release starts invalidating our frontend
caches.

### PlatformHealth

The one field the frontend needs about supplier state:

```ts
type PlatformHealth = {
  platform: Platform;
  status: 'ok' | 'degraded' | 'down';
  reason?: 'release_drift' | 'account_flagged' | 'unserviceable';
  since: string;
}
```

Pushed over SSE from the gateway. **The UI never shows a price from a platform whose status is
not `ok`.** Enforced in the component layer, not left to callers — see
[07-design-system](./07-design-system.md).

Note `reason` has no city-scoped variant, per D-006. We degrade platforms, never regions.
