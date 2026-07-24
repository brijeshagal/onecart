# 08 — Ops runbook

**Status:** v1
**Last updated:** 2026-07-25

What runs continuously, what alerts, and what to do when it fires.

The premise of this document: **the integration will break without warning, repeatedly, forever.**
That is not pessimism, it is the operating condition. Three suppliers ship client releases on
their own cadence and owe us nothing. The system is designed to notice and degrade honestly
rather than to avoid breaking.

> This is the direct fix for what stalled this project previously. The failure then was not
> authoring speed — it was that **nothing told you the integration had broken.**

---

## 1. The contract test harness

**Build this first. Before any integration, before any UI.** `crates/harness`.

### 1.1 What it holds

- **Golden fixtures** per adapter, per endpoint — a recorded real response plus the assertions
  that matter.
- **Selector fixtures** per browser step. A CSS selector that no longer resolves is drift and
  flows through the identical alerting path as a changed JSON shape. See
  [03-adapters](./03-adapters.md) §6.3.
- A `contract_hash` over the whole fixture set, recorded in `platform_release_watch`.

### 1.2 The assertion rule

> **Assert on response bodies. Never on status codes.**

Instamart silently circuit-breaks: HTTP 200 with an empty or placeholder body. Any check that
branches on status alone will pass while the integration is completely broken, which is worse
than failing — it is a green dashboard over a dead system.

Every fixture asserts that the response **deserializes into a strict type** and that the
invariants it depends on hold: a store ID is present and non-empty, prices are positive, the
product list is non-empty when it should be. A response that parses but is semantically empty is
a **failure**.

### 1.3 Canary

Every **10 minutes**, per platform, on the read pool only.

**Never canary by placing an order.** Order-path health is inferred from read-path health plus
account health, never tested directly. There is no such thing as a test order that costs nothing.

---

## 2. Drift detection: the leading indicator

Per [D-002](../DECISIONS.md#d-002--app_number-means-two-different-things-tracked-separately),
the supplier's own app build version is a **leading** signal — it fires before a customer sees a
stale price, rather than after a canary finally notices.

We already send `app_version` on every Blinkit and Zepto request
([03-adapters](./03-adapters.md) §3), so we necessarily track which build we impersonate. Watching
for their bump is nearly free.

### The flow

```
  poller: check published app_version, every 15 min, per platform
                          │
                  version changed?
                          │
                    ┌─────┴─────┐
                   no          yes
                    │            │
                  done    status = drift_suspected
                          run FULL fixture suite immediately
                                 │
                           ┌─────┴─────┐
                        passes       fails
                           │            │
              record new app_version    status = drift_confirmed
              status = ok               flip affected methods → browser
              no action                 PlatformHealth = degraded
              (the common case)         page on-call
                                        open task with the response diff
```

Steps 3 and 4 matter equally. **Most version bumps change nothing**, and a system that pages on
every supplier release gets ignored within a week. The fixture suite is what separates "they
shipped something" from "they broke us."

### Frontend consequence

The web client subscribes to `PlatformHealth` over SSE. A `drift_confirmed` platform is greyed
out of price comparison **within seconds**, with honest copy rather than a stale price.

```ts
type PlatformHealth = {
  platform: Platform;
  status: 'ok' | 'degraded' | 'down';
  reason?: 'release_drift' | 'account_flagged' | 'unserviceable';
  since: string;
}
```

Note there is no city-scoped variant. Per
[D-006](../DECISIONS.md#d-006--national-from-day-one-no-city-scoping), we degrade **platforms**,
never regions.

---

## 3. Alerts and what to do

| Alert | Severity | Action |
|---|---|---|
| `drift_confirmed` on any platform | **page** | Auto-flip already happened. Read the diff, patch the `http` adapter, re-record fixtures, flip back. |
| Order-pool account unhealthy | **page** | Circuit-break that account. If it is the last healthy one, platform → `down`, stop accepting orders. |
| No healthy order-pool account | **page** | Product is down for ordering. Honest copy on the frontend. Do not queue orders you cannot place. |
| `procurement_attempts` stuck `pending` > 10 min | **page** | Run the §4 reconciliation. **Never retry.** |
| Capture > authorised amount attempted | **page** | Bug in the drift buffer. Stop captures until understood. |
| `supplier_wallet_inr` up while `bank_<cur>` down | ticket | The [05-ledger](./05-ledger.md) §6 currency-position alarm. Business-model signal, not an outage. |
| Canary fail, no version bump | ticket | Drift without a release, or a transient. Investigate before it becomes a page. |
| Read-pool account banned | ticket | Expected attrition. Replace it. |
| Coverage probe failure rate up | ticket | Possibly transient dark-store outages, possibly the read path degrading. |
| Wallet balance below threshold | ticket | Manual top-up. Never automate this in v1. |

**The page/ticket split is deliberate.** Everything that can cost a customer money or deliver a
wrong item pages. Everything else waits for business hours. An on-call rotation that pages for
read-pool bans will stop reading pages.

---

## 4. The double-order procedure

The most important runbook entry in this document. A retry that places two baskets costs real
money and **cannot be undone by anyone, at any layer, after the fact.**

**No supplier accepts an idempotency key.** The `IdemKey` on `checkout` is ours, enforced by us,
never forwarded. Every guarantee is one we construct out of a local attempt table and a
reconciliation read.

```
Ambiguous failure during checkout
(timeout, connection reset, 5xx, browser crash)

        ┌──────────────────────────────────────┐
        │            DO NOT RETRY.             │
        └──────────────────────────────────────┘
                          │
                          ▼
   adapter.list_recent_orders(since = attempt_started_at)
                          │
        match on address + total + timestamp window
                          │
              ┌───────────┴───────────┐
            found                 not found
              │                       │
     adopt that order          mark attempt failed
     status = 'adopted'        safe to retry EXACTLY ONCE
     store platform_order_id
```

**Reconcile by reading. Never blind-retry across the procurement boundary.**

`status = 'adopted'` is distinct from `'complete'` on purpose: it means "we are not certain we
placed this, but we found it and claimed it." Count these. A rising adoption rate means the
checkout path is getting less reliable, and it is the earliest signal available.

### Why the browser path makes this worse

A crashed browser is maximally ambiguous — the order may have been placed in the instant before
the crash, and there is no response to inspect. This is not an edge case; it is the normal
failure mode of browser automation.

**Treat every browser-path failure as ambiguous. Always reconcile.** The read is cheap. The
alternative is charging someone twice for their mother's groceries.

---

## 5. Session pool operations

Per [03-adapters](./03-adapters.md) §5 and
[D-006](../DECISIONS.md#d-006--national-from-day-one-no-city-scoping): two pools, national scope,
sticky identity.

| | Read pool | Order pool |
|---|---|---|
| Health check | every few minutes | every few minutes, read-path calls only |
| On failure | circuit-break, replace, ticket | circuit-break, **page** |
| Funding instrument | none | one per account, isolated |
| Egress | rotating Indian datacenter IPs | sticky, one identity per account |

**Never rotate egress identity per request.** An identity that changes every call is more
anomalous than one that never changes — it is the signature of exactly the thing we are trying
not to look like. We are not many anonymous visitors; we are a small number of consistent,
plausible users.

**Never reuse a read session for the order path.** Read sessions get rate-limited and banned as a
matter of course. Order accounts carry a funding instrument and must stay clean.

### Wallet top-up

Manual and monitored. Ticket at threshold, human does it, ledger entry recorded per
[05-ledger](./05-ledger.md) §5. Not automated in v1 — an automated top-up that misfires moves
real money into an account we do not fully control.

---

## 6. Daily and monthly checks

**Daily**

- `psp_receivable_<cur>` matches the PSP settlement report.
- `supplier_wallet_inr` matches the balance read from the supplier account. If it cannot be read,
  alert — an unverifiable asset balance is not an asset balance.
- Every `CAPTURED` order has matching ledger entries.
- Adoption rate on `procurement_attempts`.

**Monthly**

- `fx_clearing_cad` + `fx_clearing_inr` at current rates → realised FX gain/loss.
- `fx_margin_income` vs realised FX cost → is `fees.toml` right?
- Partial-fulfilment rate. This is the number that decides whether
  [D-005](../DECISIONS.md#d-005--out-of-stock-means-refund-the-line-deliver-the-rest) holds or
  whether per-line substitution policy has earned its UI cost.
- Basket-split evaluation log. Prediction to falsify: the split fires under 5% of the time. After
  ~500 baskets you will know instead of guessing.

---

## 7. Degradation ladder

When something breaks, degrade in this order. Never skip a rung upward.

1. **`http` adapter drift** → auto-flip that method to `browser`. Slower, still working. Customer
   sees nothing.
2. **Both impls failing for one platform** → `PlatformHealth = degraded`. Greyed out of
   comparison, honest copy. Other platforms unaffected.
3. **Order pool degraded** → keep browsing and quoting, stop accepting new orders. Existing
   orders continue.
4. **No healthy order account** → `down`. Stop accepting orders entirely. Say so plainly.

**Never** accept an order you cannot place. A queued order against a dead procurement path is a
charge you will have to refund and a promise you will have to break, and it converts an outage
into a trust problem.

---

## 8. Copy under failure

Operational, because the words are pre-written and shipped, not composed under pressure.

```
Blinkit isn't available right now. We'll let you know
when it's back — nothing has been charged.                  ✓

We couldn't get one item: Amul Butter 500g. Everything
else is on the way, and you've only been charged for
what's being delivered.                                     ✓

Oops! Something went wrong 😕 Please try again later.        ✗
```

**Errors state what happened and what to do. Never apologise, never be vague.** And when money is
involved, say what happened to the money in the same breath — that is the sentence the user is
actually looking for.
