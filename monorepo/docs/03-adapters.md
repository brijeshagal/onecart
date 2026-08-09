# 03 — Adapters: data acquisition and order placement

**Status:** v1
**Last updated:** 2026-07-25

How we get supplier data out, and how we get orders in, given that
**no supplier exposes a consumer ordering API we can actually complete**.

Swiggy is the near miss and the reason that sentence is worded carefully: its MCP server does
expose `checkout`, but no payment method settles without a human, so it is a read path only
(D-012). Blinkit and Zepto expose nothing.

This is the highest-risk component in the system and the one most likely to break without
warning. Read [08-ops-runbook](./08-ops-runbook.md) alongside it — this doc says how it works,
that one says what to do at 3am when it stops working.

---

## 1. The boundary that matters most: read path vs order path

These are two different systems with different mechanisms, different failure modes, and very
different risk profiles. Conflating them is the most expensive mistake available here, so the
distinction is enforced in the code layout, not just in prose.

| | **Read path** | **Order path** |
|---|---|---|
| What | serviceability, catalog, price, availability, ETA | place a real order, pay for it, track it |
| Auth | mostly unauthenticated or a throwaway session | a real account with a real funding instrument |
| Volume | continuous, thousands of calls/day | low, one call per customer order |
| Failure | stale prices, degraded UI | **money lost, wrong item delivered, account banned** |
| If blocked | back off, degrade the platform, show honest copy | product is down |
| Public knowledge | well documented by scrapers, see §3 | **undocumented anywhere — we are on our own** |
| Risk | rate limits, IP blocks | ToS violation, account termination, chargebacks |

Everything in §3 below is the **read path**, and it is known because a scraping community has
mapped it. The order path in §6 is not documented publicly by anyone, because nobody else is
placing real paid orders programmatically through consumer accounts at scale.

**Practical rule:** never reuse a read-path session for the order path. Read-path sessions get
rate-limited, fingerprinted and occasionally banned as a matter of course — that is the cost of
doing business. Order-path accounts are scarce, carry a funding instrument, and must stay clean.
They are separate pools with separate egress identities. See §5.

---

## 2. The trait

From the blueprint §2.4, with the annotations that matter:

```rust
pub trait PlatformAdapter: Send + Sync {
    fn platform(&self) -> Platform;

    // ---- read path ----
    fn set_location(&self, s: &Session, pin: LatLng) -> Result<StoreCtx>;
    fn quote(&self, ctx: &StoreCtx, ids: &[PlatformProductId]) -> Result<Vec<LineQuote>>;

    // ---- order path ----
    fn build_cart(&self, ctx: &StoreCtx, lines: &[LineItem]) -> Result<Cart>;

    /// `key` is OUR idempotency key, enforced by US. See §7 — this is not
    /// forwarded to the supplier, because no supplier accepts one.
    fn checkout(&self, ctx: &StoreCtx, cart: Cart,
                addr: Address, key: IdemKey) -> Result<PlatformOrder>;

    fn order_status(&self, ctx: &StoreCtx, id: &PlatformOrderId) -> Result<OrderStatus>;
    fn list_recent_orders(&self, ctx: &StoreCtx, since: Timestamp)
        -> Result<Vec<PlatformOrder>>;   // reconciliation path — see §7
}
```

Implementations per platform:

| Impl | Mechanism | Speed | Durability | Where |
|---|---|---|---|---|
| `http` | replay the app's own JSON endpoints | fast | fragile | Blinkit, Zepto |
| `browser` | Playwright, persistent context | slow | survives shape drift | Blinkit order path |
| `mcp` | authorised JSON-RPC, OAuth bearer | fast | **contractual, not scraped** | Instamart read path |

Default `http`. Auto-flip to `browser` when the contract harness reports drift. **This dual path
is the single reason this survives their release cadence instead of dying to it.**

`mcp` (D-012) is the exception that does not need the flip: a sanctioned API does not drift
without a deprecation notice, so there is no `browser` fallback behind it and the `tools_list`
fixture watches for change instead. It is available on exactly one platform and cannot order.

Both impls satisfy the same trait and are swapped behind a runtime flag per platform per method.
The flip is per-method, not per-adapter — `quote` can be on `http` while `checkout` is on
`browser`, which is in fact the expected steady state (see §6).

---

## 3. Read path: what each platform actually exposes

> **Search hazard.** Most results for "Zepto API" describe **Zepto Payments**, an unrelated
> Australian A2A payments company. Same for "Blink API." Pin this in any agent prompt that does
> research here, or you will get confidently wrong documentation.

Source for the endpoint details below:
[dark store teardown, all three platforms](https://jatin-dot-py.medium.com/how-i-scraped-most-dark-stores-in-india-blinkit-zepto-swiggy-instamart-ad939ff17af9).
Treat every field as observed-not-guaranteed and re-verify against the contract harness fixtures
before relying on it.

### 3.1 Blinkit — our first supplier

```
POST https://api2.grofers.com/v1/layout/feed
```

`grofers.com` is the pre-rebrand domain and is still the live API host. Not a typo.

| Header | Value | Notes |
|---|---|---|
| `app_client` | `consumer_android` | which client we impersonate |
| `app_version` | *(build string)* | **this is the D-002 drift signal** — see §8 |
| `lat` | decimal | delivery coordinate |
| `lon` | decimal | delivery coordinate |
| `auth_key` | token | session token |
| `battery-level` | `EXCELLENT` | device-telemetry header; omitting it is a fingerprint |

Response carries the merchant store ID and `promise_time_state.DistanceInMeter` — road distance
to the assigned dark store, which is a better serviceability signal than straight-line distance
because it reflects their own routing.

That `battery-level` header is worth pausing on. It is a real device telemetry field, and
sending a plausible one costs nothing while omitting it marks the request as non-app. There will
be more headers like it. **The rule for all of them: send what the app sends, in the order the
app sends it, including the ones that look pointless.**

### 3.2 Zepto — read-only shadow in v1

```
GET  <serviceability endpoint>      # unauthenticated, returns storeId
POST /lms/api/v2/get_page           # authenticated
```

| Header | Value |
|---|---|
| `Authorization` | `Bearer <token>` |
| `app_version` | e.g. `26.3.1` |
| `User-Agent` | `okhttp/4.12.0` |
| `tenant` | `ZEPTO` |
| `platform` | `android` |
| `Content-Type` | `application/json` |

Payload: `latitude`, `longitude`, `page_type: HOME`, `version: v2`, cart metadata.

The response widget tree contains `storeDetailsResponse` with store name, coordinates, and
**`servicableGeofence`** — an actual polygon of the delivery boundary. *(Their misspelling. Match
it exactly; do not "fix" it in the deserializer.)*

That polygon is a significant find. It means Zepto serviceability is a point-in-polygon query
against data they hand us, not something we have to discover by probing a grid. Where Zepto
covers, coverage is free and exact. See [01-architecture](./01-architecture.md) §Coverage.

Zepto's defences are notably weak — a single IP has been reported sustaining tens of thousands
of requests before hitting a limit.

### 3.3 Swiggy Instamart — sanctioned MCP, read-only in v1

Per [D-012](../DECISIONS.md#d-012--swiggy-mcp-is-a-sanctioned-read-path-for-instamart-and-cannot-be-the-order-path),
Instamart reads through Swiggy's **official MCP server**, not through the scrape below. No TLS
impersonation, no cookie jar, no ToS exposure. §4 and §5 do not apply to this platform.

```
POST https://mcp.swiggy.com/im                # JSON-RPC, OAuth 2.1 bearer
```

Auth is OAuth 2.1 + PKCE against `https://mcp.swiggy.com/auth`, dynamically registered. **No
refresh token is issued** — the access token is a 5-day JWT, after which re-auth is interactive
phone + OTP. So D-010 applies here too, just on a predictable clock: refresh it before it expires
rather than in response to a failure. No session keeper.

Three wire facts, all measured, all of which the published docs get wrong:

- **No `initialize` handshake and no `Mcp-Session-Id`.** A bearer token alone is enough.
- **`Accept` must offer `text/event-stream`**, or the server answers `406` before reading the
  body — even though it always replies `application/json`.
- **The payload is JSON serialised into a string** at `result.content[0].text`.
  `structuredContent` came back `{}` on every response. `instamart::unwrap_result` lifts it out.

This is why the adapter speaks JSON-RPC directly instead of using an MCP SDK: `harness` replays a
`RequestSpec` verbatim so the recorder, canary and production issue byte-identical requests, and
an SDK between us and the wire would break that. The whole client is one POST.

| Tool | Gives us |
|---|---|
| `search_products` (`addressId`, `query`) | `spinId` / `skuId`, `mrp`, `discountedFinalPrice`, `isInStockAndAvailable` |
| `update_cart` (`selectedAddressId`, `items[{spinId, quantity}]`) | replaces the whole cart; clamps to `maxQuantity` and says so |
| `get_cart` | full bill breakdown, `cartId`, and the pod as `storeId` |
| `get_addresses` | read-only — **there is no `create_address`** |

Product identity is `spinId`, confirming the guess the scraping spec below made. The pod arrives as
`storeId` on each cart line rather than something we resolve separately.

The bill is rendered money, not numbers — `"₹495.00"` and `"₹498"` in the same response — so it goes
through `harness::money`, which already exists for Blinkit's identical habit. Do not write a second
parser. The whole breakdown was byte-stable over 120s, so it is a usable quote at the 90s TTL.

**Two limits that shape how we use it.** Bulk catalogue export is explicitly prohibited, and the
quota is 70 req/min general / 30 writes, **per authenticated Swiggy account** — dynamic
registration hands every integration the same public `client_id`, so more clients buys nothing and
only more accounts do. Live price and availability go through MCP; the precompute crawl in
[README](../README.md) does not. There are no `X-RateLimit-*` headers despite the docs promising
them, so the budget is counted locally or not at all.

**Implemented** in `crates/adapters/instamart`, mirroring the Blinkit crate file for file. Three
fixtures, one of which (`search_without_address`) must stay red — Instamart's HTTP 200 error
envelope is its version of `api2_feed_unauthenticated`. Its canary is authenticated where
Blinkit's is not, so with no token it skips with an explanation rather than reporting a false red;
CI runs `cargo test --workspace`, never the canary. The bearer token is applied at send time and
never stored in a `RequestSpec`, because those get committed as fixtures.

The original exploratory spike is `tools/spikes/swiggy-mcp` (gitignored — its captures carry the
account's real address book).

#### The scrape, retained as fallback

What follows is the unauthenticated path, kept for the case where MCP access is withdrawn. It is
not what v1 runs.

```
GET  <select-location home API>                              # returns podId
POST /api/instamart/checkout/v2/cart?pageType=INSTAMART_CART
```

| Header / cookie | Value |
|---|---|
| `Cookie` | `lat=<value>; lng=<value>` — **must match the pod's service zone** |
| `Content-Type` | `application/json` |

Payload is a cart object; product identity is the `spin` / `spinId` field. Request carries
`primaryStoreId` and `serviceLine: INSTAMART`. Response contains a `storesInfo` array with store
coordinates and operational status.

Instamart calls its dark stores "pods". Location lives in cookies rather than headers, so the
session and the coordinate are coupled in a way the other two do not have — changing the
coordinate means rebuilding the cookie jar, not swapping a header.

---

## 4. Why the naive `http` client does not work

**Cloudflare fingerprints the TLS handshake.** A stock `reqwest` (or `axios`, or Python
`requests`) call is identified and blocked at the socket layer, before the request ever reaches
the application. No amount of correct headers fixes this, because the rejection happens before
any header is parsed.

This is not a tuning detail to discover during integration. It decides whether the `http`
implementation exists at all, so it goes in the first commit of the adapter crate.

**What is required:**

- A TLS-impersonating client that reproduces a real browser's JA3 fingerprint. In Rust:
  `rquest` or `reqwest-impersonate`. The published reference implementation used Python
  `curl_cffi` with `impersonate="chrome110"`.
- The impersonated browser version is a **constant that goes in `platforms.toml`**, not a magic
  string. It ages, and when it ages badly it starts looking anomalous. Treat it like the
  supplier's `app_version`: something we track and deliberately bump.
- Indian egress. Indian datacenter IPs have been reported working; non-Indian egress is an
  obvious anomaly for a consumer grocery app and should be assumed blocked.

**Three failure modes to code against from day one:**

1. **HTTP 429, frequently.** Blinkit rate-limits aggressively. Exponential backoff with jitter,
   a concurrency cap per identity, and a circuit breaker. The cap belongs in `limits.toml`.

2. **A 200 is not a success.** Instamart silently circuit-breaks — it returns HTTP 200 with an
   empty or placeholder body rather than an error. Any code that branches on status alone will
   cheerfully cache garbage and serve it as a price.

   > **This is the single most important line in this document.**
   > Validate response **bodies**, never status codes. Every adapter method deserializes into a
   > strict type and asserts the invariants it depends on. Every contract fixture asserts on
   > body content. A response that parses but is semantically empty is a **failure**, and it
   > must be indistinguishable from a 500 to everything upstream.

3. **Transient store offline.** Dark stores drop out and come back. A single failed probe is not
   evidence of unserviceability. Retry across a window before writing a negative coverage result,
   or the coverage table slowly fills with false negatives that nothing ever corrects.

---

## 5. Session pool

Per [D-006](../DECISIONS.md#d-006--national-from-day-one-no-city-scoping), sessions are
**national, not per-city**. One account orders to any serviceable address in India; "city" is not
a unit of anything here.

### 5.1 Two pools, never mixed

| | Read pool | Order pool |
|---|---|---|
| Accounts | many, disposable | few, precious |
| Funding instrument | **none** | one per account, isolated |
| Egress | rotating Indian datacenter IPs | sticky residential-grade, one per account |
| On ban | shrug, replace | page a human immediately |
| Used by | `set_location`, `quote` | `build_cart`, `checkout`, `order_status` |

The blueprint's §2.5 instinct that "suppliers risk-score the payment instrument harder than the
phone number" is correct and is why the order pool gets **one funding instrument per account**,
never one shared across the pool. A flagged instrument should take down one account, not the
product.

### 5.2 Identity stickiness

**Do not rotate egress identity per request.** An identity that changes every call is more
anomalous than one that never changes — it is the signature of exactly the thing we are trying
not to look like. Each account keeps its identity for the life of the account.

This is the opposite of standard scraping advice, and it is correct here because we are not
trying to be many anonymous visitors. We are trying to be a small number of consistent,
plausible users.

### 5.3 Health and blast radius

- Health check every few minutes per account, on the read path only. Never health-check by
  placing an order.
- On failure: circuit-break **that account**, page a human.
- When the order pool has no healthy account: mark the **platform** `degraded` in
  `PlatformHealth`. Never a city — cities do not exist in this system.
- Blast radius is capped by pool size. That is the property the blueprint wanted from per-city
  scoping, obtained directly instead of via a geographic proxy that does not hold.

### 5.4 The recipient phone number

Unaffected by any of the above and worth restating because it surprises people: **the recipient
still needs an Indian phone number.** The rider calls it. The supplier requires it at checkout.
There is no way around this.

It is a per-delivery requirement, not a per-account or per-city one, which is part of why
[D-004](../DECISIONS.md#d-004--share-link-basket-ships-in-v1) share-link baskets matter — the
recipient supplies their own number instead of the sender typing it from memory.

---

## 6. Order path

Where the CSS clicks live, and where nobody else's documentation helps us.

### 6.1 Expect `browser` to be the steady state here

The `http` implementation is the default for reads. For `checkout`, assume the opposite: the
**`browser` implementation is primary and `http` is the optimisation**, if it ever works at all.

Reasons:

- Checkout is the most heavily defended flow on any commerce platform. It is where bot detection
  budget is spent.
- It is stateful across many requests, with tokens minted mid-flow that are painful to replay.
- Payment authorisation may involve a redirect, a 3DS-style step, or a UPI handoff that has no
  sane HTTP replay.
- The blast radius of getting it subtly wrong is a real charge on a real card for a real basket
  that never arrives.

`http` for reads because it runs thousands of times a day and speed compounds. `browser` for
checkout because it runs once per order and correctness dominates.

### 6.2 The browser implementation

Playwright with a **persistent context** per order-pool account — cookies, local storage and
device fingerprint survive across runs, because a checkout from a browser with no history is
itself an anomaly.

The flow, per order:

1. **Attach** to the account's persistent context. Never a fresh incognito profile.
2. **Set the delivery address** on the account to the recipient address. Assert the resolved
   dark store matches the one we quoted against — if it does not, the quote is void, fail
   forward rather than proceeding.
3. **Build the cart.** Prefer the authenticated cart endpoint if it is stable; fall back to
   driving the UI. This is the step where per-item add-button clicks happen.
4. **Assert the cart.** Read the rendered cart back and compare line-by-line against our
   intended basket: product identity, quantity, unit price, and total. **A cart we did not
   verify is not a cart we may pay for.**
5. **Re-quote check.** Compare the cart total against the authorised amount. Within the drift
   buffer, proceed. Outside it, abandon — see [04-payments](./04-payments.md) §drift.
6. **Place the order**, then immediately capture the platform order ID.
7. **Record** the platform order ID against our `procurement_attempt` before doing anything else.

Steps 4 and 7 are the ones that will feel like overhead and are the ones that save you.

### 6.3 Selectors are fragile — make them data, not code

CSS selectors break on every frontend deploy, which is more often than their API changes.

- Selectors live in a **versioned registry keyed by platform and step**, not inline in Rust.
- Every selector has an ordered fallback chain: stable test id → ARIA role + accessible name →
  structural CSS. Try in order.
- Prefer role/text-based location over structural CSS wherever it exists. It is dramatically
  more stable across redesigns.
- **The contract harness tests selectors too**, not just JSON shapes. A selector that no longer
  resolves is drift, and it flows through the exact same alerting path as a changed API
  response. See [08-ops-runbook](./08-ops-runbook.md).
- Never click by coordinates. Never `sleep` and hope — wait on a specific condition.

### 6.4 Funding instrument

The order-pool account needs a stored payment method. Prefer a **prepaid wallet balance** over a
stored card, for three reasons:

1. It caps exposure to the balance if an account is compromised.
2. It avoids repeated card authorisations against an Indian merchant from our accounts, which is
   its own risk-scoring signal.
3. Supplier refunds land as wallet credit anyway, so the money returns to where it can be spent
   again rather than stranding.

That third point creates the exact accounting situation the blueprint flags in §2.9: **the
supplier refunds us in wallet credit while we owe the customer cash.** Two entries and a
payable. See [05-ledger](./05-ledger.md).

Top-up is a manual, monitored operation. It is never automated in v1.

---

## 7. The double-order problem

The worst bug in this system. A retry that places two baskets costs real money and cannot be
undone by anyone, at any layer, after the fact.

### 7.1 No supplier accepts an idempotency key

The `key: IdemKey` parameter on `checkout` is **our** key, enforced by **us**. It is not
forwarded. There is no header to put it in. Every guarantee here is one we construct ourselves
out of a local attempt table and a reconciliation read.

If you internalise one thing from this section: the supplier will happily place the same order
twice and will consider that correct behaviour.

### 7.2 The procedure

```
1. Write idem_key to `procurement_attempts` (status = pending)  — BEFORE the call
2. Call adapter.checkout(..., idem_key)
3. On success:            mark complete, store platform_order_id
4. On ambiguous failure (timeout, connection reset, 5xx, browser crash):

     ┌─────────────────────────────┐
     │   DO NOT RETRY.             │
     └─────────────────────────────┘

     Call adapter.list_recent_orders(since = attempt_started_at)
     Match on address + total + timestamp window
       Found      → adopt that order, mark complete, store its id
       Not found  → mark failed. Safe to retry exactly once.
```

**Reconcile by reading. Never blind-retry across the procurement boundary.**

This is why `list_recent_orders` is on the trait despite having no product-facing use. It exists
solely for this procedure, and an adapter without a working implementation of it may not be put
on the order path.

### 7.3 Why the browser path makes this worse

A crashed browser is maximally ambiguous — the order may have been placed in the instant before
the crash, and there is no response to inspect. This is not an edge case; it is the normal
failure mode of browser automation.

Treat **every** browser-path failure as ambiguous. Always reconcile. The read is cheap and the
alternative is charging someone twice.

---

## 8. Drift detection

Per [D-002](../DECISIONS.md#d-002--app_number-means-two-different-things-tracked-separately),
the supplier's app build version is our **leading** drift indicator. Full operational procedure
in [08-ops-runbook](./08-ops-runbook.md); the adapter-side contract is:

- We already send `app_version` on every Blinkit and Zepto request, so we necessarily track
  which build we impersonate.
- A poller watches the published build for each platform every 15 minutes.
- On a bump: `drift_suspected`, run the full fixture suite immediately.
- Suite passes → record the new build, back to `ok`, no action. This is the common case.
- Suite fails → `drift_confirmed`, flip that adapter's affected methods to `browser`, page,
  open a task with the response diff attached.

The value is that it fires *before* a customer sees a stale price, rather than after a canary
finally notices. That is the difference between a leading and a lagging indicator, and it is the
direct fix for what stalled this project previously — the failure then was not authoring speed,
it was that nothing told you the integration had broken.

**A `drift_confirmed` platform is greyed out of price comparison in the UI within seconds, with
honest copy rather than a stale price.**

---

## 9. Legal position, stated plainly

Ordering through consumer accounts is against every one of these platforms' terms of service.
That is a fact about this business model, not a risk we can engineer away, and it should be
understood rather than hedged.

What follows from it:

- **The realistic downside is account termination**, which the pool design exists to survive.
- Do not compound it. [D-008](../DECISIONS.md#d-008--take-the-interaction-grammar-reject-the-visual-skin)
  — copying trade dress on top of a ToS violation converts a recoverable account ban into a
  cease-and-desist with standing behind it. Different category of problem.
- Be a good citizen on the read path anyway: respect rate limits, cap concurrency, do not probe
  during peak hours. Aggressive scraping is what gets a platform to go looking.
- We pay full retail price for every order. We are a real customer, at real volume, with real
  money. That is a meaningfully different posture from freeloading, and it is worth being able
  to say plainly.

Full treatment in [09-legal](./09-legal.md).

---

## 10. Build order for this component

Per [10-roadmap](./10-roadmap.md), and deliberately harness-first:

1. **Contract test harness with 5 golden fixtures.** Before any integration. Before any UI.
2. Blinkit `http` read path: `set_location`, `quote`, with a TLS-impersonating client.
3. Read session pool, health checks.
4. `app_version` poller wired to the harness.
5. Blinkit `browser` order path: `build_cart`, `checkout`, `list_recent_orders`.
6. Order session pool with one funded account.
7. Zepto and Instamart read-only, on the same harness.

Note what is missing from steps 1–4: any ability to place an order at all. That is intentional.
The read path has to be trustworthy before the order path is allowed to exist, because an order
placed on an untrustworthy quote is a charge we cannot defend.
