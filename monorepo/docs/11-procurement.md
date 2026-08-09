# 11 — Procurement: accounts, sessions, addresses, and the browser

**Status:** v1
**Last updated:** 2026-07-25

[03-adapters](./03-adapters.md) says *what* the order path does. This document says what it runs
**on**: the accounts, the leases that make them safe to share, the sessions that keep them logged
in, and the address book we push into them and take back out again.


It exists because the blueprint left four things undefined, and all four are load-bearing:

1. `procurement_attempts.session_account_id` in [02-data-model](./02-data-model.md) §6 references a
   `session_accounts` table **that appears nowhere**.
2. Nothing says how an account logs in, or what happens when a session dies.
3. Nothing says where recipient addresses live on the supplier side, or when they are removed.
4. Nothing says what happens when an order is **already ongoing** on the account we want to use.

---

## 1. The one idea this document is built on

**A supplier account is a single shared mutable resource.** One cart. One selected address. One
location context. One saved-address list. Every procurement mutates global state that every other
procurement can see.

That is the whole problem. Everything below is a consequence of it:

| Because the account has… | We need… |
|---|---|
| one cart | an exclusive lease — one procurement at a time, ever |
| one selected address | an ordering discipline, and a rule that an in-flight order's address is never deleted |
| one saved-address list, capped and shared across strangers | our own address book, pushed just-in-time and reference-counted |
| one login, which expires | a background session keeper, and a hard rule that OTP never blocks a procurement |
| one browser profile directory | the same lease, because a profile opened twice is a corrupted profile |

The lease is not a concurrency optimisation. It is the thing that makes the profile directory safe
to open, and it is the smallest mechanism that solves four problems at once.

---

## 2. Empirical findings

Run 2026-07-25 from Indian egress (`loc=IN`, `colo=BOM`). These replace inference with fact, and
several correct or extend [03-adapters](./03-adapters.md) §3–4.

### 2.1 Cloudflare blocks stock TLS clients — confirmed

`curl` with its own TLS fingerprint gets **HTTP 403** and a Cloudflare block page from both
`blinkit.com` and `api2.grofers.com`, from an Indian IP, regardless of `User-Agent`. The same
requests through `curl_cffi` with `impersonate="chrome146"` return **HTTP 200 and real JSON**.

[03-adapters](./03-adapters.md) §4 is therefore `[VERIFIED]`, not inferred, and the impersonating
client is a **prerequisite**, not a tuning step. Nothing on the read path can be built or manually
explored without it.

The impersonation target is a tracked constant in `platforms.toml`, exactly like the supplier's own
`app_version`. It ages, and when it ages badly it starts looking anomalous.

### 2.1a The egress identity was hard-blocked within hours — by us

**This is the most important operational finding here, and it was self-inflicted.**

Hours after §2.1 succeeded, the *same* client and the *same* request from the *same* IP began
returning a 561 KB Cloudflare page reading **"access denied / you have been blocked"** — no
`retry-after`, no `cf-mitigated`, no JS challenge. A denial, not a challenge.

What changed in between: a diagnostic that swept **fourteen different TLS fingerprints in a few
seconds from one IP**, to find out which profiles Cloudflare accepted.

That is exactly the signature §5.2 of [03-adapters](./03-adapters.md) warns against —

> An identity that changes every call is more anomalous than one that never changes.

— applied to TLS fingerprints instead of IPs. The rule is not about IPs specifically. It is about
*coherence*: one consistent, plausible user. Fourteen browsers from one socket in ten seconds is
not a user.

Three things follow, all now enforced in code:

1. **`tlsprobe` tests exactly one fingerprint per run.** The sweep is deleted, not parameterised.
   Comparing profiles means separate runs with real gaps, spending that identity's reputation
   knowingly.
2. **`record` no longer aborts on the first failure.** A hard block hits every fixture at once;
   aborting early turns a bad day into no data at all.
3. **Verification traffic is real traffic.** Probing, recording and canarying all spend the same
   reputation as production reads. The read pool's rotating disposable identities exist for this;
   development must borrow from that pool rather than burning the one good egress.

The honest read on cost: one developer IP is denied, and the read path cannot be verified live from
it until that decays. Nothing about the design changed — if anything this is the design's central
claim being demonstrated at our own expense, and the canary correctly went red rather than caching
the block page as data.

### 2.2 A 200 is not a success — now confirmed on **Blinkit**, not just Instamart

`POST api2.grofers.com/v1/layout/feed` with the documented header set and no valid `auth_key`
returns:

```
HTTP 200
{ "is_success": false,
  "response": { "snippets": null,
                "layout_config": {...}, "page_config": {...},
                "tracking": { "le_meta": { "id": "app_update", "title": "App Update" } } } }
```

It parses. It has a full, plausible layout envelope. `snippets` is `null` and `is_success` is
`false`. Code that branched on the status code would cache this and serve it as a catalog.

[08-ops-runbook](./08-ops-runbook.md) §1.2 attributes silent circuit-breaking to Instamart. **It
happens on Blinkit too.** The body assertion is not optional and not platform-specific:

> Every layout-API response must satisfy `is_success == true` **and** carry a non-empty `snippets`
> array. Anything else is a failure, indistinguishable from a 500 to everything upstream.

`le_meta.id == "app_update"` is a bonus: the supplier is telling us directly that the build we
impersonate is stale. That is a **more direct drift signal than polling the store listing**, it
arrives on the same call we were making anyway, and it should be wired into
`platform_release_watch` alongside the poller.

### 2.3 The read path is the web host, not the Android API

This resolves the tension between [03-adapters](./03-adapters.md) §3.1 (which specs the Android
client against `api2.grofers.com`) and the working prior implementation (which read the website).

| Endpoint | Auth needed | Result |
|---|---|---|
| `GET blinkit.com/location/autoSuggest?query&lat&lng` | none | 200, 5 suggestions with `place_id` + `session_token` |
| `GET blinkit.com/feed/?template_version=9` | location cookies only | 200, real widget `objects` |
| `POST blinkit.com/v1/layout/search?q=<query>` | location cookies only | 200, 176 KB, `is_success: true`, 14 snippets |
| `POST api2.grofers.com/v1/layout/feed` | a real app `auth_key` | 200 but `is_success: false`, `snippets: null` |

**Decision: v1 reads from the web host.** It returns real catalog data with no account at all — only
location cookies — while the Android API needs an `auth_key` we have no acquisition path for short
of instrumenting an emulator. Using the web host also means one identity system rather than two,
and it is the same origin the browser order path already authenticates against.

`api2.grofers.com` stays documented here as the second implementation to reach for if the web
endpoints prove weaker. This is a deliberate deviation from §3.1 and is recorded as **D-011**.

Note the search query goes in the **URL query string**. Sending it in the JSON body returns
`400 {"error":"search query cannot be empty"}` for every key name tried (`q`, `query`, `keyword`,
`search_query`). This is the kind of detail that costs an afternoon; it is why it is written down.

### 2.4 The product card, and two traps in it

`product_card_snippet_type_2`, the shape `quote` deserialises:

| Field | Example | Use |
|---|---|---|
| `product_id` | `498972` | the `platform_product_id`. Opaque — never parsed |
| `merchant_id` | `33966` | **the dark store.** This is how we assert store identity |
| `inventory` / `is_sold_out` | `1` / `false` | availability |
| `normal_price.text` | `"₹293"` | selling price, **as a rendered string** |
| `mrp.text` | `"₹325"` | list price, as a rendered string |
| `eta_tag` | object | delivery promise |
| `name.text` | `"Nutralite DoodhShakti…"` | display name |

**Trap one: `merchant_id` is the dark store**, and it comes back on every product card. That is the
signal [03-adapters](./03-adapters.md) §6.2 step 2 requires for "assert the resolved dark store
matches the one we quoted against" — we do not need a separate call to get it.

**Trap two: prices are rendered strings, not numbers.** `"₹293"` must be parsed to `29300` paise as
an integer. The previous implementation did `parseFloat(text.replace(/[^\d.]/g,""))`, which is
exactly the float that [02-data-model](./02-data-model.md) §0 forbids. The parser returns
`bigint` minor units or it errors — it never returns a float, and it never silently yields `0` from
an unparseable string.

---

## 3. Schema

Three tables. Each is justified by a query something actually runs.

```sql
-- The pool. Referenced by procurement_attempts.session_account_id, which
-- 02-data-model already assumes exists.
create table session_accounts (
  session_account_id   uuid primary key,
  platform             text        not null,
  pool                 text        not null,   -- 'read' | 'order'   never mixed
  phone_e164           text        not null,   -- the operator SIM for this account
  state                text        not null,   -- §4
  profile_dir          text        not null unique,  -- persistent context, one per account
  egress_id            text        not null,   -- sticky identity, D-006
  auth_key_enc         bytea,                  -- extracted for the http read path
  auth_verified_at     timestamptz,            -- leasability depends on this
  wallet_balance_minor bigint,                 -- INR minor units, order pool only
  flagged_reason       text,
  created_at           timestamptz not null default now()
);

-- The lease. Absence of a row means the account is free.
create table account_leases (
  session_account_id uuid        primary key references session_accounts,
  order_id           uuid        not null,
  fence              bigint      not null,   -- monotonic; a stale holder aborts
  acquired_at        timestamptz not null default now(),
  expires_at         timestamptz not null
);

-- Our address book, mirrored into a supplier account just-in-time.
create table platform_addresses (
  session_account_id  uuid not null references session_accounts,
  recipient_id        uuid not null references recipients,
  platform_address_id text,                   -- Blinkit's numeric id, null until confirmed
  state               text not null,          -- §6
  refcount            int  not null default 0 check (refcount >= 0),
  last_verified_at    timestamptz,
  orphaned_at         timestamptz,
  primary key (session_account_id, recipient_id)
);
```

`profile_dir` is `unique` because two accounts sharing a browser profile is the same corruption as
one account opened twice.

`platform_addresses` is keyed on **both** ids: the same recipient pushed into two different accounts
is two different supplier address records with two different numeric ids.

`auth_key_enc` is sealed with a single key from the environment via `pgcrypto`. For a pool of three
accounts that is sufficient; a KMS abstraction here would be one implementation behind an interface.

> **Never commit session state.** The previous implementation wrote cookies *and localStorage* to a
> flat `session.json` and committed it — including a populated 64-character `authKey`, which is
> precisely the credential §2.3 describes. Session state lives in `profile_dir` and Postgres, both
> gitignored, and never in the tree.

---

## 4. Account lifecycle

```
never_logged_in ──▶ logging_in ──▶ awaiting_otp ──▶ healthy_idle ◀──┐
                         │              │               │  ▲        │
                         │   (timeout / wrong OTP)      │  │        │
                         ▼              ▼               ▼  │        │
                     login_failed ◀─────┘             leased        │
                         │                              │           │
        ┌────────────────┴──────────┬───────────────────┼───────────┤
        ▼                           ▼                   ▼           │
     flagged ──▶ banned ──▶ retired │            session_expired ───┘
                                    ▼               (background re-auth)
                                  dirty ──────────────────┘
                          (cart non-empty / unknown)   (cleanup verified)
```

| Transition | Trigger |
|---|---|
| `never_logged_in → logging_in` | operator starts a login from the admin page |
| `logging_in → awaiting_otp` | phone submitted, supplier accepted it |
| `awaiting_otp → healthy_idle` | correct OTP, session captured to `profile_dir`, `auth_key` extracted |
| `awaiting_otp → login_failed` | wrong OTP, or no OTP within the window |
| `healthy_idle → leased` | a procurement acquired the lease (§5) |
| `leased → healthy_idle` | procurement finished, cart verified empty |
| `leased → dirty` | procurement failed leaving unknown cart state |
| `leased → session_expired` | logged out mid-run — **always ambiguous**, reconcile first |
| `dirty → healthy_idle` | cleanup emptied the cart **and** re-verified it |
| `any → flagged` | supplier challenge, captcha, or a refused checkout |
| `flagged → banned → retired` | confirmed termination; page a human |
| `session_expired → healthy_idle` | background re-auth succeeded |

**The leasable set is exactly one predicate:**

```sql
state = 'healthy_idle'
  and auth_verified_at > now() - interval '10 minutes'
```

That single line is what keeps OTP off the procurement path. An account whose session is even
slightly doubtful is not eligible, so a procurement never *discovers* a dead session — it is never
handed one.

---

## 5. The lease

### 5.1 Acquire

```sql
begin;
  select session_account_id
    from session_accounts
   where platform = $1
     and pool = 'order'
     and state = 'healthy_idle'
     and auth_verified_at > now() - interval '10 minutes'
     and session_account_id not in (
           select session_account_id from account_leases where expires_at > now())
   order by auth_verified_at desc
   limit 1
     for update skip locked;          -- no row => no capacity, do not queue

  insert into account_leases (session_account_id, order_id, fence, expires_at)
       values ($acct, $order, nextval('lease_fence'), now() + interval '10 minutes')
  on conflict (session_account_id) do update
          set order_id = excluded.order_id, fence = excluded.fence,
              acquired_at = now(), expires_at = excluded.expires_at
        where account_leases.expires_at <= now();   -- only steal an EXPIRED lease

  update session_accounts set state = 'leased' where session_account_id = $acct;
commit;
```

`for update skip locked` gives mutual exclusion without blocking, and returning no row is a
meaningful answer — it means *no capacity*, which admission control needs (§5.3).

### 5.2 The fence, and why a TTL alone is not enough

A lease TTL cannot by itself prevent two workers driving one profile: worker A can stall past its
expiry, worker B takes the lease, and A wakes up and keeps clicking. The `fence` is a monotonic
counter that resolves this.

- Every worker carries the fence it acquired.
- Every write-shaped step (`select address`, `add to cart`, `place order`) re-reads the lease row
  and **aborts if the stored fence is not its own**.
- A worker that finds a foreign fence has been superseded. It stops immediately and marks its
  attempt ambiguous. It does **not** clean up — the new holder owns the account now.

Renewal is a heartbeat that extends `expires_at` while the fence still matches. The browser process
is killed if the heartbeat cannot be renewed, so a stalled worker cannot outlive its lease at the OS
level either.

### 5.3 Admission control

[08-ops-runbook](./08-ops-runbook.md) §7 is absolute: *never accept an order you cannot place.* With
N accounts each usable serially, capacity is:

```
free_capacity = count(healthy_idle, auth fresh) − count(live leases)
```

Checked **before authorising payment**, not after. When it is zero the sender is told the truth
before any money moves. There is no order queue: a queued order against a dead procurement path is a
charge we must refund and a promise we must break.

`limits.toml`:

```toml
[order_pool]
lease_ttl_seconds      = 600
lease_heartbeat_seconds = 30
auth_freshness_seconds = 600
max_live_orders_per_account = 1   # until probe 5 says otherwise
```

---

## 6. Address book

Our `recipients` table is the source of truth. The supplier account holds a **cache** of it that we
push just-in-time and take back out.

Why, plainly: the account is shared across unrelated recipients, so its saved-address list would
otherwise accumulate hundreds of strangers' home addresses — a privacy problem, a supplier-side cap
problem, and a global-state problem, since the *selected* address is what every concurrent order
fights over.

The risk this introduces is that churn on the address list is itself an anomalous signal. It is
mitigated by the grace period in §6.2 (addresses linger for a day, not minutes) and by the fact that
a small pool at beta volume produces a handful of writes a day, not hundreds.

### 6.1 Lifecycle

```
absent ──provision──▶ provisioning ──verified──▶ present (refcount > 0)
   ▲                       │                        │
   │                    (failed)            (refcount hits 0)
   │                       ▼                        ▼
   └──────── deleting ◀── GC ◀────────────────── orphaned
                                              (grace: 24h)
```

- **Provision** on procurement start if `absent`; otherwise bump `refcount`.
- **Verify by reading back.** Never trust the write. `platform_address_id` is only recorded after
  the address is read back from the account and matched on line, pin and phone.
- **Decrement** `refcount` when the order reaches a terminal state.
- **Orphan** at `refcount = 0`, stamping `orphaned_at`.
- **Delete** only after the grace period, and only under the invariant below.

### 6.2 The hard invariant

> **Never delete a supplier address that has a non-terminal order against it.**

Enforced in the GC query itself, not in application logic that could be bypassed — the same
discipline [02-data-model](./02-data-model.md) §1 applies to `verified_by IS NULL`:

```sql
update platform_addresses pa
   set state = 'deleting'
 where pa.state = 'orphaned'
   and pa.orphaned_at < now() - interval '24 hours'
   and pa.refcount = 0
   and not exists (
         select 1 from orders o
          where o.recipient_id = pa.recipient_id
            and o.state not in ('DELIVERED','CANCELLED_BY_PLATFORM',
                                'REFUND_ISSUED','PROCUREMENT_FAILED','SETTLED'));
```

The grace period is not politeness. The rider may still call, support may need to read the address
back during a dispute, and a refund can land days after delivery.

The GC runs on a schedule, in small batches, rate-limited. Deleting forty addresses in a burst is
its own anomaly. Three consecutive delete failures on one row page a human rather than retrying
forever.

---

## 7. Sessions, OTP, and the keeper

### 7.1 The rule

**OTP never happens on the procurement path.** Payment is already authorised, the quote is ~90
seconds old, and an OTP round trip needs a human. Re-auth is a background ritual, and §4's freshness
predicate guarantees a procurement is never handed a doubtful session.

If a session dies mid-lease anyway, that is `session_expired` — **ambiguous**, because the order may
have been placed in the instant before. Reconcile by reading (§8) before anything else.

### 7.2 OTP intake

Human-in-the-loop for v1 (**D-010**). The keeper detects a dead session out of band, evicts the
account, and pages an operator, who reads the OTP off the SIM and types it into a small admin page.
At three accounts re-authing rarely, this is hours of work rather than weeks, and it buys the
invariant in §7.1 immediately.

The upgrade, when the page gets used more than about weekly, is a handset running an SMS-forwarder
that POSTs to a webhook, plus an `otp_inbox` table and a claim protocol keyed on the requesting
account. Rented virtual numbers are deliberately rejected: delivery from Indian shortcodes is
unreliable and those ranges are commonly flagged, which is the last thing an account carrying a
funding instrument needs.

### 7.3 Session storage

| Artifact | Home | Why |
|---|---|---|
| cookies, localStorage, fingerprint | `profile_dir` (Playwright persistent context) | [03-adapters](./03-adapters.md) §6.2 — a checkout from a browser with no history is itself an anomaly |
| `auth_key` | `session_accounts.auth_key_enc` | the http read path needs it as a header, and cannot open a browser profile |

The profile directory is authoritative for the browser; Postgres is authoritative for the HTTP path.
The keeper is the only writer that reconciles them, so they cannot diverge silently.

### 7.4 The keeper

Every few minutes per account, **on the read path only** — [08-ops-runbook](./08-ops-runbook.md)
§5 is explicit that we never health-check by placing an order.

The check asserts on the body (§2.2): `is_success == true`, `snippets` non-empty, **and** an
account-scoped field proving we are still logged in rather than silently downgraded to a guest
session. A guest response is a 200 with a perfectly valid body — it is the same trap as §2.2 wearing
a different hat.

On success, stamp `auth_verified_at`. On failure, `session_expired`, evict, page.

---

## 8. When an order is already ongoing

The question this document was written for.

First, the thing that surprises people: **placing an order empties the cart**, so the cart is
usually free. The contention is over the *selected address* and the *account*, not the cart.

| # | Situation | Decision |
|---|---|---|
| a | Live order, new order to a **different** recipient | Allowed. A placed order snapshots its address supplier-side, so re-selecting does not disturb it. `[ASSUMED]` — probe 4 |
| b | Live order, **same** recipient | Allowed and cheaper: address is already `present`, just bump `refcount` |
| c | Cart non-empty from a crashed run | Account is `dirty` and not leasable. Cleanup empties and re-verifies first |
| d | Two procurements, one healthy account | Second gets no row from §5.1. Admission control refuses **before** taking payment |
| e | Live order's address is selected, new order needs another | Switch it. Never *delete* the old one — its `refcount` is still above zero |
| f | Supplier caps concurrent live orders per account | Unknown. Cap at 1 in `limits.toml`, relax when probe 5 answers |
| g | Active-order sheet occludes the cart controls | Selector registry fallback chain, plus an explicit dismiss step that is a no-op when absent. `[ASSUMED]` — probe 6 |
| h | Wallet balance insufficient mid-checkout | **Definite** failure. `PROCUREMENT_FAILED`, void the auth, page — balance is also a precondition, so reaching this means it moved under us |
| i | Logged out or flagged during a lease | **Ambiguous.** Reconcile by reading before anything else |

### 8.1 Ambiguous versus definite

Getting this classification wrong is the double-charge bug. The rule:

> **Definite** means we can prove no order was placed. Everything else is **ambiguous**, and
> ambiguous means reconcile by reading — never retry.

Definite: a precondition failed before the irreversible step (cart assertion mismatch, store
mismatch, drift beyond buffer, insufficient balance, product missing from search).

Ambiguous: anything at or after the place action, plus every browser crash, worker kill, lease
supersession and mid-run logout. [03-adapters](./03-adapters.md) §7.3 is right that a crashed
browser is maximally ambiguous — there is no response to inspect.

### 8.2 The reconciliation trap this document adds

`list_recent_orders(since)` matching on address + total + timestamp has a failure mode the blueprint
does not call out: **two of our own customers' orders, minutes apart, on the same account.**

Matching on total alone can adopt the wrong one. The predicate must be:

```
platform_order.placed_at   >= attempt_started_at
AND platform_order.address_id == the platform_address_id we selected for THIS attempt
AND platform_order.total     == our expected total (within the drift buffer)
AND platform_order.id NOT already claimed by another procurement_attempt
```

The address match is what makes it safe, and it is available precisely *because* we push one address
per recipient per account and record its id. If two candidates still match, adopt **neither** — mark
the attempt for human review and page. Adopting the wrong order is worse than adopting none.

---

## 9. Probes

`[ASSUMED]` claims above, each with the cheapest thing that settles it. Probes 1–3 and 10 are
answered; the rest need a funded account and cost real baskets, which is why
[10-roadmap](./10-roadmap.md) puts automated procurement *after* a hand-placed real order — those
orders double as these probes.

| # | Question | How | Status |
|---|---|---|---|
| 1 | Does TLS impersonation defeat Cloudflare? | one `curl_cffi` call per host | **answered — yes**, §2.1 |
| 2 | Web host or `api2`? | compare bodies for one query | **answered — web**, §2.3 |
| 3 | Is the web search param in the body or the URL? | try both | **answered — URL**, §2.3 |
| 4 | Does switching the selected address disturb a placed order? | place one small order, switch, watch the tracker | open |
| 5 | Does Blinkit cap concurrent live orders per account? | reach checkout on a second order while one is live | open |
| 6 | Does an active-order sheet occlude cart controls? | screenshot during probe 5 | open |
| 7 | Saved-address cap? near-duplicate dedupe? | add ~20 addresses, then a near-duplicate, read back | open |
| 8 | Does deleting the selected address silently re-point the account? | delete it, re-read the resolved store | open |
| 9 | Are the address create/delete endpoints callable directly? | intercept what the site itself sends during probe 7 | open |
| 10 | Is the store listing a reliable `app_version` source? | listing publishes `18.9.3`; `le_meta.id == "app_update"` is a better in-band signal | **partly answered**, §2.2 |
| 11 | Is the web login OTP flow completable headless? | run the ported login once against a spare account | open |

---

## 10. What we are not building in v1

| Skipped | Add when |
|---|---|
| SMS forwarder / GSM gateway | the human-in-the-loop page is used more than about weekly |
| `otp_inbox` and the claim protocol | same trigger — it is the forwarder's table, not the operator's |
| Automated wallet top-up | never in v1; [08-ops-runbook](./08-ops-runbook.md) §5 is explicit |
| A KMS abstraction | one env key plus `pgcrypto` covers a three-account pool |
| Per-account queueing of orders | admission control refuses instead, which is the honest behaviour |
| Rust CDP browser driver | the TS sidecar becomes the bottleneck, which it will not at beta volume |
| `api2.grofers.com` adapter | the web endpoints prove weaker than they look today |
