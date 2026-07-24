# 04 — Payments

**Status:** v1
**Last updated:** 2026-07-25

Money in. TS service, PSP-integrated.
Currency model fixed by [D-003](../DECISIONS.md#d-003--sender-sees-their-own-currency-fx-margin-baked-in).

---

## 1. We are the merchant. This is load-bearing.

Blinkit, Zepto and Swiggy Instamart are **suppliers**, not merchants. We are the merchant of
record: we set the price, we take the payment, we own the customer relationship, we carry the
liability.

**Never describe the product as a marketplace or aggregator** — not in copy, not in a contract,
not in a PSP conversation, not casually in an email to an underwriter. A marketplace has
different regulatory treatment, different underwriting, and a different (worse) answer to "who
is responsible when it goes wrong."

This distinction appears in every contract, every page of copy, and every PSP conversation. It
is the sort of thing that is cheap to get right at signup and expensive to correct after.

---

## 2. Set these before the first live order

Both are set at PSP signup and are painful to change later.

### 2.1 MCC

Gifting / retail. **Not** food delivery, not marketplace, not "other."

The MCC drives interchange, risk tier, and how the acquirer's fraud models treat us. A
cross-border card-not-present charge from a new merchant is already the highest-scrutiny
category available; a mismatched MCC on top of that is what gets an account held.

### 2.2 Merchant descriptor — **OPEN**

Per [D-007](../DECISIONS.md#d-007--merchant-descriptor--open), blocked on the brand name.

What we know it must do: **name the product, not the legal entity.** A sender who sees an
unfamiliar corporate name on a statement disputes the charge. A sender who sees the product they
used does not.

This is one of the cheapest measurable interventions available against friendly fraud, and it
must be resolved before the first live transaction.

Include a contact fragment if the descriptor length allows — a support URL or short domain in
the descriptor converts a would-be chargeback into a support ticket, which is enormously cheaper.

---

## 3. The currency model

Per D-003: **quote in INR, present and charge in the sender's currency.**

```
supplier quote (INR)
        │
        ├── × fx_rate                 market rate at quote time
        ├── × (1 + fx_margin_bps)     our margin, from fees.toml
        ├── + service_fee             from fees.toml, band-based
        │
        ▼
   displayed price (sender currency)  ← the ONLY number the sender ever sees
        │
        ├── × (1 + drift_buffer)      ~12%, from fees.toml
        ▼
   authorised amount                  ← never displayed as "the price"
```

**Every one of those coefficients lives in `fees.toml`**, never in code and never in the
database. Changing a fee is a PR with a diff you can read in review. See
[01-architecture](./01-architecture.md) §4.

`fx_rate` and `fx_margin_bps` are **frozen onto the order at quote time** (`orders.fx_rate`,
`orders.fx_margin_bps`). Never recompute them later. The rate that applied is a fact about that
order; looking it up again at capture makes the ledger unreconcilable.

### Why sender-currency rather than INR

1. **Chargebacks.** An unfamiliar INR charge from an unfamiliar merchant is a top driver of "I
   don't recognise this." Charging in the sender's own currency removes an entire dispute
   category.
2. **No foreign-transaction-fee surprise.** The sender's bank adds 2–3% to a foreign-currency
   charge. That fee is invisible to us, arrives after the fact, and reads as us overcharging.
3. **Comprehension.** Someone in Toronto cannot evaluate whether ₹840 is reasonable.

### What it costs us

FX exposure between authorisation and capture. On basket-sized amounts over a window of hours,
this is immaterial — and the drift buffer already exists for price movement, so FX movement
rides in the same envelope rather than needing its own.

The real cost is that **the ledger is multi-currency from day one**. See
[05-ledger](./05-ledger.md).

---

## 4. Authorisation and capture

### 4.1 Authorise at quote

- **3DS forced on every transaction. No frictionless exceptions.**
- Authorise the displayed price plus the drift buffer.
- The buffer is **disclosed**. The sender is told that the final amount may vary slightly and
  that they are charged only what is actually delivered. Never hide it and hope nobody reads the
  statement.

Forcing 3DS costs conversion. It is still correct here: we are a new cross-border merchant
charging foreign cards for delivery to a third party at an address the cardholder does not live
at. That is, feature for feature, the profile of a fraudulent transaction. 3DS shifts liability
and is the difference between a sustainable dispute rate and an account termination.

### 4.2 Capture at delivery confirmation

- Capture the **actual** delivered amount.
- **Never capture above auth.** If the actual exceeds the authorised amount, that is a bug in
  the buffer, not a licence to charge more.
- Partial fulfilment → partial capture. Per
  [D-005](../DECISIONS.md#d-005--out-of-stock-means-refund-the-line-deliver-the-rest) this is
  the **common** path, not an exception. `partially_captured` is a first-class state on
  `payment_intents`.
- Void the remainder of the authorisation immediately. Do not sit on an unused hold — a stale
  hold on a customer's card generates support tickets and ill will.

### 4.3 The window between

An authorisation is not money. Between auth and capture the order can fail to procure, be
cancelled by the platform, or partially fulfil. Every one of those paths must void or reduce the
hold, and every one of them is a state in the orchestrator, not an ad-hoc branch in the payments
service. See [01-architecture](./01-architecture.md) §2.5.

---

## 5. Quote staleness

A quote is good for roughly **90 seconds** — that is the TTL on live price, availability, ETA and
fees, which change minutely and per dark store.

**Re-quote at authorisation, and again immediately before procurement.**

| Drift | Action |
|---|---|
| Within buffer | Absorb silently. Capture actual at delivery. |
| Beyond buffer | **Fail forward.** Tell the user what changed, offer a re-quote. |

> **Never silently charge an amount different from what was shown.**

The re-quote immediately before procurement is the one people skip, and it is the one that
matters — it is the last moment before real money moves through a system we do not control.

Optional, cheap, and worth it: **price lock** (blueprint §9.7). Hold the quote for N minutes so
the sender is not surprised by drift mid-checkout. The buffer already exists, so this is mostly
a UI promise over machinery we have, and it is a visible trust signal.

---

## 6. Caps

All values in `limits.toml`, generated to both codebases.

| Cap | Purpose |
|---|---|
| Per-user daily total | Bounds damage from a compromised sender account |
| Per-card lifetime, until 3+ clean deliveries | Bounds damage from a stolen card |
| Per-order maximum | Sanity bound; also bounds supplier-side scrutiny |
| Per-recipient velocity | Catches the same address being hammered from many accounts |

The per-card lifetime cap lifting after three clean deliveries is the important one. It is a
cheap reputation system that costs nothing for real users and is expensive for fraudsters,
because it requires patience they generally do not have.

---

## 7. Refunds

Three sources, and they are genuinely different:

| Trigger | What happens |
|---|---|
| Line out of stock | Reduce capture. Never captured, so never refunded. Cleanest case. |
| Cancelled by platform after capture | Full refund to the original card. |
| Dispute / goodwill | Refund to card, booked against a goodwill account. |

**The awkward one:** the supplier refunds *us* in wallet credit while we owe the customer
*cash*. Our money comes back as spendable balance on a Blinkit account; the customer's money has
to leave our bank in their currency. That is two ledger entries and a payable, across two
currencies, and it is exactly why [05-ledger](./05-ledger.md) is not optional.

Refund in the **original charge currency at the original rate**. Do not re-convert at today's
rate — a refund that differs from the charge because FX moved is a support conversation nobody
wins.

---

## 8. Disputes

We are structurally exposed: new merchant, cross-border, card-not-present, delivered to someone
who is not the cardholder. Assume disputes will happen and build the evidence pack by default
rather than assembling it under deadline.

**Representment evidence, collected automatically per order:**

- Delivery proof: photo, timestamp, geotag (blueprint §9.3).
- **Recipient confirmation tap** — the recipient affirming they received it. This is the
  strongest single piece of evidence available to us.
- The share-link trail: the recipient opened a link, edited the basket, supplied their own
  address and phone. That is a documented relationship between cardholder and recipient, which
  is precisely what a "I don't know this person" dispute claims does not exist.
- Quote-to-capture history with timestamps, showing what was shown and what was charged.

Note that [D-004](../DECISIONS.md#d-004--share-link-basket-ships-in-v1) — a product decision made
for usability reasons — happens to produce the best dispute evidence in the system. That is not a
coincidence worth ignoring: **the flows that prove the customer was really involved are the same
flows that make the product good.**

Delivery proof is one feature doing two jobs: reassurance for the sender, representment evidence
for us.
