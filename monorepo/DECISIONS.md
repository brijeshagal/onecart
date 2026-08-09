# Decisions

**Status:** v1
**Last updated:** 2026-08-09

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

## D-009 — The browser adapter is a TS sidecar, not a Rust crate

**This amends [D-001](#d-001--stack-build-it-as-blueprinted).**

**Question.** D-001 puts Adapters and Session Pool in Rust.
[03-adapters](./docs/03-adapters.md) §6.2 mandates Playwright with a persistent context. Playwright
has no maintained Rust binding. Both cannot be satisfied as written.

**Decision.** The order path's browser work moves into a Node/TS `procurement-worker` service. The
Rust orchestrator calls it over a narrow RPC exposing exactly the order-path trait methods —
`build_cart`, `checkout`, `order_status`, `list_recent_orders` — and nothing more. Everything else
D-001 names stays in Rust, including the orchestrator, the ledger, the read-path adapter and the
harness.

**Why.** The contradiction is real and had to be resolved somewhere. Resolving it here costs the
least: Rust keeps every path that touches money or state transitions, which is what D-001's
reasoning was actually about ("the money paths and the adapter layer both benefit from strict
typing", "exhaustive matching over generated enums"). Meanwhile the browser work gets the mature
ecosystem it needs — persistent contexts, role/text locators, tracing for post-mortem — and the
prior working implementation on `legacy` survives as prior art instead of being discarded.

Driving Chrome from Rust over raw CDP was considered and rejected: it hand-rolls auto-waiting,
locators and tracing to satisfy a language boundary that buys nothing on a path that runs once per
order, where correctness dominates and speed does not.

**Consequence.** One more service and one more language on the order path. The RPC surface is
deliberately tiny so the seam stays honest — if it grows past those four methods, business logic has
leaked across it.

**Reversal cost.** Low. The seam is the trait boundary that already exists.

---

## D-010 — OTP is human-in-the-loop in v1, and never on the procurement path

**Question.** Order-pool accounts log in with an SMS OTP to an Indian number. Procurement is
time-critical — payment is authorised, the quote is ~90 seconds old. How does the OTP arrive?

**Decision.** Two parts, and the second matters more than the first.

1. **OTP never blocks a procurement.** An account is leasable only if its session was verified
   healthy in the last ten minutes. Re-auth is a background ritual that evicts the account from the
   eligible pool first, so a procurement is never handed a doubtful session.
2. **v1 intake is a human.** The session keeper pages an operator, who reads the OTP off the SIM and
   types it into a small admin page.

**Why.** Part 1 is the load-bearing half and is free — it is one predicate in the lease query. Part 2
is the laziest thing that satisfies it: with roughly three accounts re-authing rarely, an admin page
is hours of work and no new hardware.

Rented virtual Indian numbers were rejected outright. Delivery from Indian shortcodes is unreliable
and those ranges are commonly flagged — the last property you want on an account carrying a funding
instrument.

**Upgrade path.** A handset running an SMS forwarder that POSTs to a webhook, plus an `otp_inbox`
table and a claim protocol. Build it when the admin page is used more than about weekly.

**Reversal cost.** Low, and the expensive half (part 1) is the half we would keep anyway.

---

## D-011 — The v1 read path reads the web host, not the Android API

**Question.** [03-adapters](./docs/03-adapters.md) §3.1 specs impersonating the Android client
against `api2.grofers.com/v1/layout/feed`. The prior working implementation read the website. Which
is the v1 read path?

**Decision.** The web host. `api2.grofers.com` stays documented as the second implementation.

**Why.** Measured, not assumed — see [11-procurement](./docs/11-procurement.md) §2.3. With a
TLS-impersonating client and only location cookies, the web endpoints return real catalog data:
`/location/autoSuggest`, `/feed/`, and `POST /v1/layout/search?q=` all answer with
`is_success: true` and populated snippets. The same client against `api2.grofers.com` returns
HTTP 200 with `is_success: false` and `snippets: null` because it has no valid app `auth_key` — and
we have no acquisition path for one short of instrumenting an Android emulator.

So the Android route costs a second, unrelated identity system for every disposable read account, to
reach data the web host already gives us unauthenticated. The web host is also the same origin the
browser order path authenticates against, which keeps it to one identity system.

**Consequence.** §3.1's header table describes the Android client and no longer describes what we
send in v1. It is retained there as the reference for the second implementation.

**Reversal cost.** Low. Both sit behind the same trait, and the flip is already per-method.

---

## D-012 — Swiggy MCP is a sanctioned read path for Instamart, and cannot be the order path

**Question.** Swiggy ships an official MCP server at `https://mcp.swiggy.com/im`.
[09-legal](./docs/09-legal.md) §2 says the honest resolution to our ToS exposure is "a supplier
relationship, not a better scraper." Is this that relationship? Does it replace the Instamart
scraping spec in [03-adapters](./docs/03-adapters.md) §3.3, and can Instamart order through it?

**Decision.** **Yes to the read path, no to the order path.**

Instamart's read path becomes MCP: sanctioned, authenticated, no TLS impersonation, no cookie jar.
§3.3's scraping spec is demoted to fallback. The order path stays out of reach for a reason we
cannot engineer around — see the payment finding below — so Instamart remains **read-only in v1**,
which is what [10-roadmap](./docs/10-roadmap.md) item 18 already assumed. Nothing in the roadmap
moves; one task gets easier and one door stays shut.

**Measured 2026-08-09** against the live server, `tools/spikes/swiggy-mcp`. All `[VERIFIED]`, in
the sense of [11-procurement](./docs/11-procurement.md) §2 — run, not inferred.

| | Finding |
|---|---|
| Auth | DCR at `/auth/register` accepts any client, then returns the **shared public `client_id: "swiggy-mcp"`** with `token_endpoint_auth_method: none`. There is no per-integration identity at the dev tier. |
| Sessions | **No refresh token is issued at all**, despite discovery advertising the grant and our client requesting it. What we get is a 5-day RS256 JWT (`iss: ozone-cx`, `iat`→`exp` exactly 432000s). A stored token reconnects with no OTP until it expires, then re-auth is the interactive phone + OTP flow. *(Corrected 2026-08-09: an earlier draft of this row read "refresh_token works headlessly" — that was the 5-day access token still being valid, not a refresh.)* |
| Bill | `get_cart` returns a complete pre-checkout breakdown — item total, handling fee, delivery fee, `toPay` — plus `cartId` and `storeId`. **Byte-stable over 120s.** |
| Stock | `update_cart` with `quantity: 99` **clamped to 5** and reported `maxQuantity: 5` + `isInStockAndAvailable` per line. The shortfall is legible in the response. |
| Identity | `spinId` / `skuId`, `mrp` and `discountedFinalPrice` per variation. §3.3's guess was right. |
| **Payment** | **No API-completable method exists.** `get_payment_options` returns UPI intents (`gpay://upi/`, `phonepe://`…), a desktop scan-QR, and COD. Nothing else. `SwiggyPay` appears in the `checkout` schema but not in this account's live options. |
| Checkout | Not atomic despite the docs. `checkout` creates a `PENDING_PAYMENT` order returning `orderId` + `paasId`; payment settles out of band; `confirm_order` finalises. Also **capped at ₹1000** per cart. |
| Addresses | `create_address` and `delete_address` **do not exist** on the live server — 14 tools, not the 16 documented. `get_addresses` is read-only. |
| Rate limits | **No `X-RateLimit-*` headers on any response**, contrary to the operate docs. The documented 70/min general, 30/min writes must be counted locally. |
| Wire | No `initialize` handshake and no `Mcp-Session-Id` — a bearer token alone is enough. `Accept` **must** offer `text/event-stream` or the server answers `406`, even though it replies `application/json`. |

**Why.** The payment row decides it. Every available method terminates in a human: a UPI intent is
a deep link into an app on a phone, a QR needs scanning, COD needs cash at a door where our
recipient is not the payer. A procurement path that requires an operator to approve each payment is
strictly worse than the Playwright path [D-009](#d-009--the-browser-adapter-is-a-ts-sidecar-not-a-rust-crate)
already specs for Blinkit, and it is the one part of this we cannot automate our way past.

Two of the other rows are independently fatal to ordering even if payment were solved. The **₹1000
cart cap** is below a plausible gift basket. The **absence of `create_address`** breaks
[11-procurement](./docs/11-procurement.md) §1's just-in-time address push outright: we could only
deliver to addresses already saved on the account by hand, and this is a product where every order
goes somewhere new.

The read path has the opposite profile. It is everything §3.3 wanted and could not safely have —
real prices, per-line stock, pod `storeId`, stable product identity — with no impersonation, no
Cloudflare, and no ToS exposure. Two constraints bound it: bulk catalogue export is explicitly
prohibited, and 70 req/min is **per authenticated user**, which the shared `client_id` means we
cannot raise by registering more clients, only by holding more Swiggy accounts. So live price and
availability move to MCP; the precompute crawl in [README](./README.md) does not.

**Consequence.** Instamart no longer needs the impersonation stack or the cookie jar — but it also
never graduates to a supplier we can order from, so basket splitting stays a computed-and-logged
signal for it, per the v1 non-goals. The one-cart-per-account constraint of §1 still holds, so the
lease still holds. Addresses are a per-call `addressId` rather than account state, which removes
the selected-address contention §1 worries about.

[D-010](#d-010--otp-is-human-in-the-loop-in-v1-and-never-on-the-procurement-path) still applies
here, on a **5-day clock rather than an unpredictable one**. Its load-bearing half — OTP never
blocks a procurement — costs nothing to honour on a read path, and its human-intake half is easier
than for Blinkit because expiry is known in advance and can be refreshed before it bites rather
than in response to a failure. It does not need a session keeper; it needs a calendar.

**The open question worth an email.** `SwiggyPay` is named in the `checkout` schema as a payment
group. If it is a prepaid wallet that settles server-side, it is the only thing that would make
this an order path, and it maps exactly onto the funded-account model
[10-roadmap](./docs/10-roadmap.md) item 15 already plans. Ask builders@swiggy.in before writing
this off permanently. Note that production access also has to clear eligibility — the programme
wants "agents for real Swiggy users", and our buyer is abroad and is not one.

**Reversal cost.** Low both ways. The read path sits behind the same trait as the other two
platforms and the flip is already per-method. The order-path half is a decision not to build
something.

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
| D-009 | Browser adapter is a TS sidecar — **amends D-001** | Low |
| D-010 | OTP human-in-the-loop, never on the procurement path | Low |
| D-011 | v1 read path is the web host, not the Android API | Low |
| D-012 | Swiggy MCP is Instamart's read path; it cannot be an order path | Low |
