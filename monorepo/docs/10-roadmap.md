# 10 — Build order

**Status:** v1
**Last updated:** 2026-07-25

Reordered from the blueprint §10 for the decisions that moved work. Week numbers are sequencing,
not estimates.

**What changed and why:**

| Change | Cause |
|---|---|
| Recipients + share-link move **into** the core build | [D-004](../DECISIONS.md#d-004--share-link-basket-ships-in-v1) — it is the primary flow, not a week-4 addition |
| `browser` order-path adapter gets its own slot | [03-adapters](./03-adapters.md) §6.1 — checkout is browser-primary, and the blueprint only scheduled the `http` read path |
| Substitution UI drops out entirely | [D-005](../DECISIONS.md#d-005--out-of-stock-means-refund-the-line-deliver-the-rest) — nothing to pick |
| Ledger grows | [D-003](../DECISIONS.md#d-003--sender-sees-their-own-currency-fx-margin-baked-in) — multi-currency from day one |
| Coverage simplifies | [D-006](../DECISIONS.md#d-006--national-from-day-one-no-city-scoping) — no city concept; Zepto hands us a polygon |
| Legal track starts week 1 | [09-legal](./09-legal.md) §7 — weeks of lead time, blocked only on starting |

---

## Week 1 — no UI, no payments, no orders

The most counterintuitive week, and the one that decides whether this survives.

1. **Contract test harness with 5 golden fixtures.** Before any integration. Assertions on
   response **bodies**, never status codes ([08-ops-runbook](./08-ops-runbook.md) §1.2).
2. **`/constants` package and codegen.** Do this before anything reads a constant, or you will be
   retrofitting generated enums into working code.
3. **Coverage probe, Blinkit, population-density driven.** No city list. `lat, lng -> store`.
4. **`canonical_products` + ~200-row hand-mapped catalog.** The long-pole manual task — start it
   week 1 so it runs in the background while everything else is built.

**In parallel, non-engineering:** start every item in [09-legal](./09-legal.md) §7. Entity, PSP
conversation, MCC, terms, privacy policy, DPDP assessment. These have lead times measured in
weeks and are blocked only on someone beginning them.

**Also resolve this week:** the brand name
([D-007](../DECISIONS.md#d-007--merchant-descriptor--open)). It blocks the merchant descriptor,
which blocks PSP signup, which has the longest lead time of anything here.

---

## Week 2 — read path

5. **Blinkit `http` adapter: `set_location`, `quote`.** With a TLS-impersonating client from the
   first commit — a stock HTTP client is blocked at the socket layer and no amount of correct
   headers fixes it ([03-adapters](./03-adapters.md) §4).
6. **Read session pool** with health checks. National scope, sticky egress identity.
7. **`app_version` poller wired to the harness.** Drift detection live before anything depends on
   it.

At the end of week 2 we can answer "is this address serviceable and what does this basket cost"
for real, continuously, and know within 15 minutes when that stops being true.

---

## Week 3 — basket, recipients, and the share link

8. **Basket engine, single platform.** `argmin` over a set of one, but the split evaluation logs
   from the first basket so the 5% prediction has data behind it by the time it matters.
9. **Orchestrator through `PLACED`**, procurement manual (wizard-of-oz). A human places the order
   while the state machine is exercised end to end.
10. **Recipients + share-link basket.** *(Moved forward from week 4.)* Recipients as a first-class
    entity, link tokens, the unauthenticated recipient surface. This is the primary flow — it
    cannot be bolted on afterwards because it reshapes the recipient model.
11. **`packages/ui` primitives + commerce components.** Fix the contrast issues in
    [07-design-system](./07-design-system.md) §3.2 **before** building on the tokens.
    No `SubstitutionPicker`.

**Wizard-of-oz is the point of this week.** A human placing orders while everything else runs for
real tells you what actually breaks, and it costs a week of manual work instead of a month of
building the wrong automation.

---

## Week 4 — real money

12. **Payments: MCC, forced 3DS, auth/capture, caps.** Authorise in the sender's currency with
    the disclosed drift buffer, capture actual at delivery.
13. **Ledger.** Multi-currency, double-entry, balancing per currency. Bigger than the blueprint
    assumed — the FX clearing accounts and the wallet-credit-versus-cash case
    ([05-ledger](./05-ledger.md) §5–6) are core, not later.

> ### Milestone: first real order
>
> A real basket, composed by a real recipient through a share link, paid for by a real card from
> abroad, delivered to a real Indian address. Procurement still manual.
>
> **This is the thing worth reaching.** Everything before it is scaffolding and everything after
> it is scale.

---

## Week 5 — automate procurement

14. **Blinkit `browser` adapter: `build_cart`, `checkout`, `list_recent_orders`.** Playwright with
    persistent context, selector registry with fallback chains, cart assertion before payment.
15. **Order session pool** with one funded account. Prepaid wallet balance, manual top-up.
16. **The double-order guard, wired and tested.** `procurement_attempts` written before the call,
    reconcile-by-reading on ambiguous failure, never blind-retry.

Deliberately after the first real order. Automating a procurement path you have not yet performed
manually means automating your assumptions about it.

**Test 16 by deliberately crashing the browser mid-checkout.** It is the only failure mode that
matters and the only way to know the reconciliation works.

---

## Weeks 6–7 — platforms 2 and 3, read-only

17. **Zepto adapter, read-only.** Serviceability via `servicableGeofence` polygon — exact
    coverage, no probing.
18. **Instamart adapter, read-only — over MCP.** Per
    [D-012](../DECISIONS.md#d-012--swiggy-mcp-is-a-sanctioned-read-path-for-instamart-and-cannot-be-the-order-path)
    this is an OAuth client against `mcp.swiggy.com/im`, not a scrape: no impersonation, no cookie
    jar, no circuit-break guessing. Smaller than it looks. Budget the effort into the 70 req/min
    per-account quota instead, which is the real constraint.
19. **Basket engine over three platforms**, still ordering only through Blinkit. The split
    evaluation now has real comparative data.

Same harness, same fixtures, same drift detection. If adding a platform requires new
infrastructure, the adapter layer is wrong.

---

## Week 8 — the trust layer

20. **Delivery proof pack.** Photo, timestamp, geotag, recipient confirmation tap. One feature,
    two jobs: reassurance for the sender, representment evidence for us.
21. **Dispute queue.** We are structurally exposed — new merchant, cross-border, card-not-present,
    delivered to a third party. Assemble the evidence pack by default, not under deadline.

---

## After

In rough conviction order, not scheduled:

- **Standing orders** (§9.2). Gifting is one-off; monthly staples to parents is a business. Same
  rails, recurring, predictable volume. **This is the retention mechanic**, and it is the thing
  that makes the unit economics legible.
- **Curated care packages** (§9.6) — monsoon kit, festival kit, new-flat starter, unwell-at-home
  kit. Sidesteps catalog navigation entirely, which pairs perfectly with a 200-SKU v1. Likely the
  highest-converting entry point and by far the cheapest thing on this list.
- **Price lock** (§9.7). The buffer already exists; this is mostly a UI promise over machinery we
  have. Visible trust signal.
- **Acting on basket splits.** Only if the logged data says it fires often enough to be worth it.
  Prediction to falsify: under 5%.
- **Per-line substitution policy** (§9.4). Only if the measured partial-fulfilment rate is high
  enough that baskets routinely arrive gutted. Until then it is a setting nobody wants to
  configure.
- **Search.** Deliberately late. With 200 curated SKUs and care packages, browsing works, and the
  share-link flow means the person who knows what they want is the one adding it.

---

## What is deliberately not here

- **Automated SKU matching in the order path.** The pipeline proposes; a human verifies.
  `verified_by IS NULL` never reaches procurement, and no roadmap item changes that.
- **Any market outside India, or DoorDash.**
- **Full catalog parity.** Curated, not comprehensive.
- **Automated wallet top-up.** Manual and monitored in v1.
- **Dark mode.** See [07-design-system](./07-design-system.md) §3.3.
- **Temporal or any workflow engine.** Postgres and an outbox table are sufficient for a beta.

---

## The shape of it

Steps 1–13 get a real basket delivered to a real recipient, paid for by a real card from abroad.
Everything that *feels* like the product — search, order management, disputes, more platforms —
is deliberately after that.

The two things most likely to go wrong are both scheduled first on purpose: **the harness**
(week 1), because nothing telling you the integration broke is what stalled this project before;
and **the legal track** (also week 1), because it is the only work here whose lead time you
cannot compress by trying harder.
