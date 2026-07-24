# Cross-Border Quick Commerce

**Status:** v1
**Owner:** Bridge
**Last updated:** 2026-07-25

A merchant-of-record gifting and essentials product. Someone abroad composes a basket, pays by
card, and it arrives at an Indian address in minutes via a quick-commerce supplier.

---

## Start here

| | |
|---|---|
| **[DECISIONS.md](./DECISIONS.md)** | Every resolved question, with rationale and reversal cost. **Read this first.** Where a doc disagrees with it, the doc is wrong. |
| [01 — Architecture](./docs/01-architecture.md) | Service topology, repo layout, constants pipeline |
| [02 — Data model](./docs/02-data-model.md) | Schemas and the invariants that matter |
| [03 — Adapters](./docs/03-adapters.md) | **The hard part.** How we get data out and orders in |
| [04 — Payments](./docs/04-payments.md) | Merchant of record, multi-currency, auth and capture |
| [05 — Ledger](./docs/05-ledger.md) | Double-entry, multi-currency, worked examples |
| [06 — Frontend](./docs/06-frontend.md) | Surfaces, flows, and never showing a stale price |
| [07 — Design system](./docs/07-design-system.md) | Tokens, type, components |
| [08 — Ops runbook](./docs/08-ops-runbook.md) | What runs, what alerts, what to do at 3am |
| [09 — Legal and risk](./docs/09-legal.md) | Honest read on where the exposure is |
| [10 — Build order](./docs/10-roadmap.md) | What to build, in what order, and why |

---

## We are the merchant

Blinkit, Zepto and Swiggy Instamart are **suppliers**, not merchants. This distinction is
load-bearing for payment underwriting and appears in every contract, every page of copy, and
every PSP conversation.

**Never describe the product as a marketplace or aggregator.**

### Non-goals for v1

- Full catalog parity. We ship a curated catalog of ~200 hand-verified staples.
- Automated SKU matching. Human-verified mappings only.
- DoorDash, or any market outside India.
- Real-time cross-platform basket splitting. Compute it, log it, don't act on it yet.

---

## The constraints that shape everything

### Three data classes, three strategies

| Data class | Rate of change | Strategy |
|---|---|---|
| Serviceability, store assignment | weekly | precompute, cache days |
| Catalog identity (brand, pack size, SKU exists) | weekly | precompute, cache days |
| **Price, availability, ETA, fees** | **minutely, per dark store** | **live fetch, TTL 90s** |

Only the third is expensive. Every architectural decision exists to avoid touching it. The
heuristic that follows: **if a request can be answered without a live supplier call, it must be.**

### No supplier exposes a consumer ordering API

Not Blinkit, not Zepto, not Instamart. The seller-side APIs that do exist are purchase-order
flows for brands shipping stock *into* dark stores — the wrong direction, and gated behind
category-manager onboarding.

**Treat adapters as permanent infrastructure, not as a stopgap awaiting rescue.**

Two consequences that drive most of [03-adapters](./docs/03-adapters.md):

- **Cloudflare fingerprints the TLS handshake.** A stock HTTP client is blocked at the socket
  layer before any header is read. The `http` implementation requires a TLS-impersonating client
  or it does not exist.
- **A 200 is not a success.** Instamart silently circuit-breaks with HTTP 200 and an empty body.
  Validate response bodies, never status codes.

> **Search hazard.** Most results for "Zepto API" describe **Zepto Payments**, an unrelated
> Australian A2A payments company. Same for "Blink API." Pin this in any agent prompt that does
> research here, or you will get confidently wrong documentation.

### The recipient needs an Indian phone number

The rider calls it. The supplier requires it at checkout. There is no way around this.

```
sender_identity   = email / passkey / OAuth      (no phone, any country)
recipient_contact = Indian phone + address       (required, per delivery)
```

Recipients are an address-book entity owned by the sender, not user accounts. They never log in.

---

## The decisions in one table

Full rationale in [DECISIONS.md](./DECISIONS.md).

| | Decision |
|---|---|
| Stack | Rust services + TS gateway and web, as blueprinted |
| Currency | Sender's local currency, FX margin baked in. Ledger is multi-currency from day one |
| Basket | **Share-link from v1** — sender starts, recipient adds, sender pays |
| Out of stock | **Refund the line, deliver the rest.** Never substitute without consent |
| Scope | **National India from day one.** No city concept anywhere in the system |
| `app_number` | Two separate mechanisms: supplier build version (drift) and our contract version (cache) |
| Brand name | **OPEN.** Blocks the merchant descriptor, which blocks PSP signup |

---

## The two failure modes that will hurt most

### Quote staleness

A quote is good for ~90 seconds. Re-quote at authorisation and again immediately before
procurement.

- Drift within buffer → absorb silently, capture actual.
- Drift beyond buffer → fail forward, tell the user, offer a re-quote.
- **Never silently charge an amount different from what was shown.**

### Double-order on retry

The worst bug in this system. A retry that places two baskets costs real money and cannot be
undone.

**No supplier accepts an idempotency key.** Ours is enforced locally, out of an attempt table and
a reconciliation read:

```
1. Write idem_key to `procurement_attempts` (pending) — BEFORE the call
2. Call adapter.checkout(..., idem_key)
3. On success: mark complete, store platform_order_id
4. On ambiguous failure (timeout, reset, 5xx, browser crash):
     DO NOT RETRY.
     adapter.list_recent_orders(since = attempt_started_at)
     Match on address + total + timestamp window
       Found     → adopt that order, mark complete
       Not found → mark failed, safe to retry once
```

**Reconcile by reading. Never blind-retry across the procurement boundary.**

---

## Build the harness first

Before any integration. Before any UI.

Golden fixtures per adapter and per browser selector, canary every 10 minutes, assertions on
response bodies, auto-flip to the `browser` implementation on drift.

This is the direct fix for what stalled this project previously. **The failure then was not
authoring speed — it was that nothing told you the integration had broken.**

See [10-roadmap](./docs/10-roadmap.md) for the full sequence, and note that the legal track
starts in week 1 alongside it: it is the only work whose lead time cannot be compressed by trying
harder.
