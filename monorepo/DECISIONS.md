# Decisions

**Status:** v1
**Last updated:** 2026-07-25

Resolves the open questions in the [blueprint](./README.md) §8, plus one correction to the
blueprint itself. Every doc in `docs/` must agree with this file. Where they disagree, this file
wins and the doc is wrong.

Format: what was asked, what we decided, why, and what it would cost to reverse. Reversal cost
is the important column — it tells you which of these are cheap experiments and which are
one-way doors.

---

## D-001 — Stack: build it as blueprinted

**Question.** The blueprint specs four Rust services plus a TS gateway. For a beta that has not
placed a single real order, is that the right shape?

**Decision.** Yes. Build it as specified. Rust for Coverage, Catalog, Basket, Orchestrator,
Adapters, Session Pool, Ledger and the contract harness. TS for the Gateway, Payments and web.

**Why.** The architecture is pre-laid and not up for relitigation. The money paths and the
adapter layer both benefit from strict typing against response shapes that drift without notice,
and the orchestrator is a state machine where exhaustive matching over generated enums is worth
real money in prevented bugs.

**Reversal cost.** High. Collapsing to a single TS service later means rewriting the
orchestrator and ledger. Decide once, here.

---

## D-002 — `app_number` means two different things, tracked separately

**Question.** §8.1 — is `app_number` the supplier's app build version used as a drift signal, or
an internal version for our own product API contract?

**Decision.** Both. Two mechanisms, two tables, documented apart, never conflated.

| | Supplier build version | Our contract version |
|---|---|---|
| What | Blinkit/Zepto/Instamart's own client build | Our public API contract version |
| Purpose | **Leading** drift indicator — their client changed, so their response shape may have | Frontend cache invalidation when *we* change our contract |
| Table | `platform_release_watch` | `api_contract_version` |
| Doc | [08-ops-runbook](./docs/08-ops-runbook.md) | [01-architecture](./docs/01-architecture.md) |

**Why.** The supplier-build reading is confirmed by observation, not inference: `app_version`
and `app_client` are headers *we send* on every request (see
[03-adapters](./docs/03-adapters.md)). We already track which build we impersonate, so watching
for their bump is nearly free and fires before a canary fails. That is a genuinely better
primitive than waiting for breakage.

The internal contract version is an unrelated problem that happens to want a similar name. Kept
separate so nobody wires frontend cache invalidation to a supplier's release cadence.

**Reversal cost.** Low. Either mechanism can be dropped independently.

---

## D-003 — Sender sees their own currency, FX margin baked in

**Question.** §8.2 — INR, sender's local currency, or both?

**Decision.** Quote and reason in INR internally. Present and charge in the sender's local
currency, with our FX margin inside the displayed price. Margin lives in `fees.toml`, never in
code.

**Why.** Three reasons, in order of weight:

1. **Chargebacks.** An unfamiliar INR charge from an unfamiliar merchant is a top driver of "I
   don't recognise this." Charging in the sender's own currency removes an entire dispute
   category.
2. **No foreign-transaction-fee surprise.** The sender's bank adds 2–3% to a foreign-currency
   charge. That fee is invisible to us, lands after the fact, and reads as us overcharging.
3. **Comprehension.** Someone in Toronto cannot evaluate whether ₹840 is reasonable.

We carry FX risk between authorisation and capture. The drift buffer already exists for price
movement (§5.1); FX movement rides in the same buffer. Over a window measured in hours, on
basket-sized amounts, this is not a material exposure.

**Consequence.** The ledger is multi-currency from day one — INR payable to the supplier against
a sender-currency receivable. This is not optional and is why [05-ledger](./docs/05-ledger.md)
is more involved than a single-currency double-entry system.

**Reversal cost.** High. Multi-currency is hard to add to a ledger after the fact and nearly
impossible to backfill correctly.

---

## D-004 — Share-link basket ships in v1

**Question.** §8.4 — does the sender compose the basket, or the recipient?

**Decision.** Both. Sender starts a basket, shares a link, the recipient adds what they actually
need, the sender reviews and pays. §9.1 moves from "feature idea" to core v1 surface.

**Why.** It solves four problems with one flow, and three of them are otherwise unsolved:

- The sender does not know what is needed. This is the real friction in remote gifting, not
  payment.
- The address is verified by the person who lives at it.
- The recipient's Indian phone number — required at checkout, see D-006 — is captured naturally
  instead of being typed from memory by someone abroad.
- The recipient confirms receipt in-flow, which is chargeback representment evidence.

The last point matters more than it looks. We are a new merchant, charging foreign cards, with a
delivery we cannot directly prove. Recipient confirmation is the cheapest strong evidence
available.

**Consequence.** Recipients are a first-class entity with their own validation, not a checkout
field. A link/token model and an unauthenticated recipient session must exist before the first
real order. This pulls work forward from week 4 into the core build — see
[10-roadmap](./docs/10-roadmap.md).

Pure gifting still works: the sender can skip the share step and compose alone. Share-link is
the default path, not the only one.

**Reversal cost.** Medium. Cheap to stop offering, expensive to add later because it reshapes
the recipient model.

---

## D-005 — Out of stock means refund the line, deliver the rest

**Question.** §8.5 — a line goes out of stock mid-procurement, the sender is asleep in another
timezone. What is the default?

**Decision.** Refund that line. Deliver everything else. Never substitute without explicit
consent. Notify the sender with what happened and what we did.

**Why.** In a gifting product a wrong item is not a refund event, it is a trust failure — the
same reasoning that gives us the `verified_by IS NULL` rule on catalog mappings (§2.3). Someone's
mother receiving the wrong thing is unrecoverable in a way that a slightly incomplete basket is
not. We take the incomplete basket every time.

**What this buys us.** No substitution picker UI in v1. No 2am decision. No timeout logic, no
notification round-trip to a sleeping user.

**What it costs.** Partial fulfilment stops being an edge case and becomes the common path. The
orchestrator's `PARTIAL_FULFILL` branch and partial capture in the ledger have to work correctly
from the first order, not eventually.

**Deferred.** §9.4 per-line substitution policy (`exact only` / `same brand, any size` / `any
equivalent` / `refund this line`). Revisit once we have real stock-out rates. If the rate is
high enough that baskets routinely arrive gutted, the per-line policy earns its UI cost. Until
then it is a setting nobody wants to configure.

**Reversal cost.** Low. Adding per-line policy later is additive.

---

## D-006 — National from day one, no city scoping

**Question.** §8.6 — confirm Ahmedabad and Blinkit as the first market?

**Decision.** No city scoping at all. National India from launch. Blinkit is the first and only
supplier on the order path.

**This corrects the blueprint.** §2.5 specs "one account and one funding instrument **per
city**." That is wrong, and the reasoning under it does not hold up.

One Blinkit account orders to any serviceable address in India. Nothing about the account, the
funding instrument, or the plumbing is city-bound. The blueprint's claim that "serviceability is
pin-bound anyway, so per-city costs nothing architecturally" has it backwards: serviceability
being pin-bound is precisely why city is not a useful unit. A pin either resolves to a dark
store or it does not. "City" never enters the query.

What genuinely *is* location-bound is per-dark-store price, availability and ETA — a runtime
lookup keyed on lat-lng with a 90s TTL, not a launch decision.

**Replacement for the per-city pool:**

- A small pool of N accounts, nationally scoped, each with a sticky egress identity.
- Blast radius is capped by pool size, which is the thing the blueprint actually wanted.
- Circuit-break per account. Degrade the **platform** in `PlatformHealth`, never a city.
- Coverage drops "city" as a concept entirely: `lat, lng -> store`, nothing else. The nightly
  grid probe is driven by population density, not by a city list.

**The one thing the blueprint got right here and we keep:** suppliers risk-score the payment
instrument harder than the account. So instrument isolation still matters — one funding
instrument per account in the pool, not one shared across all of them.

**Unaffected by this decision:** the recipient still needs an Indian phone number. The rider
calls it, the supplier requires it at checkout, and there is no way around it. That constraint
is per-delivery, not per-city.

**Reversal cost.** Low. Adding geographic partitioning later is straightforward if we ever find
a reason to want it.

---

## D-007 — Merchant descriptor — **OPEN**

**Question.** §8.3 — what string appears on the card statement?

**Status.** Blocked on the brand name, which is itself unconfirmed.

The blueprint proposes "Airmail" (§6.3) but explicitly labels it a proposal. That name is
load-bearing for more than the design system: it determines the merchant descriptor, the domain,
and every token name we generate.

**What we know the descriptor must do:** name the product, not the legal entity. A sender who
sees an unfamiliar corporate name on a statement disputes the charge. A sender who sees the
product they used does not. Getting this right measurably reduces friendly fraud, and it is one
of the cheapest interventions available to us.

**Constraint carried forward until resolved:** keep the brand name out of crate names, package
names and database identifiers so that a rename stays a copy-change rather than a migration.

**Resolve before:** first live transaction. The MCC and descriptor are both set at PSP signup,
before the first order — see [04-payments](./docs/04-payments.md).

---

## D-008 — Take the interaction grammar, reject the visual skin

Not from §8, but it is a decision and it belongs on the record.

**Decision.** Copy q-commerce interaction patterns freely. Do not copy Blinkit's trade dress.

Structural familiarity — category rail, dense 2-up grid, add-button-morphs-to-stepper,
persistent ETA badge, sticky cart bar, full-screen search takeover — is industry-standard across
q-commerce globally and is not protectable. Users navigate on muscle memory built from layout
and interaction, not from colour.

Blinkit's specific yellow, logo treatment and illustration style are trade dress. Copying them
closely *while also* procuring through their consumer accounts and charging for it stacks a
passing-off exposure on top of a ToS exposure.

Those are different categories of problem, and the distinction is the whole point: a ToS
violation gets you an account ban you recover from. Trade dress gets you a cease-and-desist with
standing behind it. See [09-legal](./docs/09-legal.md).

**Reversal cost.** Low, and asymmetric — staying distinct costs nothing functional.

---

## Decision index

| ID | Decision | Reversal cost |
|---|---|---|
| D-001 | Rust services + TS gateway, as blueprinted | High |
| D-002 | Two `app_number` mechanisms, tracked separately | Low |
| D-003 | Sender's local currency, FX margin baked in | High |
| D-004 | Share-link recipient-composed basket in v1 | Medium |
| D-005 | Refund the line, never substitute | Low |
| D-006 | National from day one, no city scoping | Low |
| D-007 | Merchant descriptor | **OPEN** |
| D-008 | Interaction grammar yes, trade dress no | Low |
