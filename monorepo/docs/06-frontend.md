# 06 — Frontend

**Status:** v1
**Last updated:** 2026-07-25

Surfaces, flows, and the rules that keep a price honest.
Next.js in `apps/web`, components from `packages/ui` ([07-design-system](./07-design-system.md)).

---

## 1. Mobile-first, and what that actually means here

Not "responsive down to mobile." **Designed at 390px and allowed to breathe upward.** Desktop is
a centered column with a maximum width, not a different layout.

- **Thumb zone.** Primary actions live in the bottom third. Sticky cart bar, sticky primary
  action. Every tap target ≥ 44px.
- **No hover-dependent affordances anywhere.** If it only reveals on hover, it does not exist on
  the device most people will use.
- **Skeletons, never spinners**, for anything that fetches live price. A spinner says "something
  is happening"; a skeleton says "here is the shape of what is coming," which is materially less
  anxious when someone is spending money.
- **Optimistic add-to-cart, reconcile on quote.** Adding is instant; the price is truth-checked
  when it matters.

---

## 2. Two audiences, one app

This is the structural thing that makes this frontend unusual, and it comes straight from
[D-004](../DECISIONS.md#d-004--share-link-basket-ships-in-v1).

| | **Sender** | **Recipient** |
|---|---|---|
| Where | abroad, any country | India |
| Auth | email + passkey / OAuth | **none** — holds a link token |
| Timezone | theirs | Asia/Kolkata |
| Currency seen | their own | *never sees money at all* |
| Can | compose, review, pay, track | add items, fix the address, confirm receipt |
| Cannot | know what's actually needed | see prices, see the sender's other data |

**The recipient surface shows no money.** Not the basket total, not line prices, not the service
fee. The recipient is choosing what they need; the sender is deciding what to spend. Mixing
those creates an awkward social dynamic in exactly the relationship this product serves — a
parent who can see the total will order less than they need.

This is a product decision with a security dividend: a leaked share link exposes a grocery list
and an address the recipient already knows, and nothing financial.

---

## 3. The flows

### 3.1 Sender onboarding

```
email → passkey (or Google / Apple) → done
```

**No SMS anywhere.** No phone number on the sender record at all. Passkey-first cuts
account-takeover risk, which matters because a compromised sender account can spend a stored
card.

Do not ask for an address at signup. The sender's own address is irrelevant to this product;
asking for it is a habit from other products and it costs conversion for nothing.

### 3.2 Compose and share — the primary path

```
sender starts a basket
        │
        ├──▶ picks a recipient (or creates one: name + phone + address)
        │
        ├──▶ optionally adds items themselves
        │
        └──▶ SHARE  ──────────▶  link (WhatsApp, SMS, anything)
                                        │
                                        ▼
                            recipient opens — no login
                                        │
                            adds what they actually need
                            fixes the address if it's wrong
                            confirms their phone number
                                        │
                                        ▼
                                    SUBMIT
                                        │
                                        ▼
                            sender reviews  ──▶  pays
```

Four problems solved by one flow, per D-004: the sender does not know what is needed; the
address is verified by the person who lives there; the recipient's phone number is captured
without the sender typing it from memory; and the whole trail becomes chargeback evidence
([04-payments](./04-payments.md) §8).

**Solo compose still works.** A sender can skip the share step entirely and pay directly — a
surprise gift has to be possible. Share is the default, not the only path.

### 3.3 Recipient surface

Reached by link token only. Never indexed, never linkable from anywhere else.

- Opens directly into the basket. **No landing page, no signup prompt, no app install banner.**
  Someone's mother tapped a WhatsApp link; every interstitial loses a percentage of them.
- Add items, adjust quantities, leave a note per line ("the small one").
- Review the address that is already filled in and correct it.
- Confirm the phone number.
- One primary action: **Send back**.

The link expires. An expired link says so plainly and offers to notify the sender — it does not
dead-end.

### 3.4 Sender review and pay

The sender sees what the recipient chose, what it costs, and what will be charged.

Must be visible on this screen, no exceptions:

- Every line, with who added it.
- The total **in the sender's own currency** ([D-003](../DECISIONS.md#d-003--sender-sees-their-own-currency-fx-margin-baked-in)).
- The disclosed drift buffer, in plain words: the amount may vary slightly, you are charged only
  for what is delivered.
- The delivery ETA, **in the recipient's timezone**, labelled as such (§5).
- The out-of-stock policy stated up front, not buried: **an unavailable item is refunded, never
  substituted** ([D-005](../DECISIONS.md#d-005--out-of-stock-means-refund-the-line-deliver-the-rest)).

That last one prevents the single most likely support ticket. Someone whose basket arrives one
item short and who was told in advance is fine. Someone who was not told feels short-changed.

### 3.5 Tracking and confirmation

The sender watches the order move. The recipient gets a confirmation tap on delivery.

The confirmation tap is doing double duty: reassurance for the sender, and the strongest single
piece of representment evidence available to us. Ask for it plainly, do not gamify it.

---

## 4. Never show a stale price

The rule that everything else in this section serves:

> **The UI never shows a price from a platform whose `PlatformHealth.status` is not `ok`.**

Enforcement is in the component layer, **not the caller's job**. Every component that can render
a price takes `health: PlatformHealth` and renders the degraded state itself. A caller cannot
forget to check, because there is no way to pass a price without passing its health.

```ts
type PlatformHealth = {
  platform: Platform;
  status: 'ok' | 'degraded' | 'down';
  reason?: 'release_drift' | 'account_flagged' | 'unserviceable';
  since: string;
}
```

Pushed over SSE from the gateway. When
[drift is confirmed](./08-ops-runbook.md), that platform is greyed out of comparison **within
seconds**, with honest copy rather than a stale number.

Also: **every price carries its as-of timestamp once older than 60 seconds.** A quote is good for
about 90 seconds; a price with no age on it is a claim we cannot support.

---

## 5. Timezones — get this right or produce very angry users

The sender is in Toronto at 11pm choosing a delivery window in Bengaluru. Getting this subtly
wrong is a whole class of bug.

**Rule: every delivery-related time is displayed in the *recipient's* timezone, explicitly
labelled.**

```
Arrives 4:20 PM IST          ✓
Arrives 4:20 PM              ✗   — whose 4:20?
Arrives 6:50 AM              ✗   — technically true, useless, alarming
```

Account-related times (login history, receipts) use the sender's timezone. Delivery-related times
use the recipient's. When both appear on one screen, both are labelled.

`recipients.timezone` exists in the schema for this reason even though it is always
`Asia/Kolkata` in v1 — the column makes the intent explicit and stops anyone hardcoding IST into
a formatter.

---

## 6. Interaction grammar

Per [D-008](../DECISIONS.md#d-008--take-the-interaction-grammar-reject-the-visual-skin), take the
q-commerce grammar and reject the skin. These patterns are industry-standard globally, users
navigate them on muscle memory, and none of them are protectable:

- Category rail across the top, horizontally scrollable
- Dense 2-up product grid, image-dominant tiles
- Add button that **morphs into a stepper in place** — never a separate quantity control
- ETA badge as a persistent, high-prominence element
- Sticky bottom cart bar with item count and total
- **Search as a full-screen takeover**, not an inline dropdown

What we do *not* take: Blinkit's yellow, logo treatment, or illustration style. See
[07-design-system](./07-design-system.md) and [09-legal](./09-legal.md).

---

## 7. Copy discipline

- **Name things by what the user controls.** "Delivery address," never "pin drop."
- **Actions keep their verb through the whole flow.** A button that says "Send basket" produces a
  toast that says "Basket sent." Not "Order placed" — that is a different verb and the user has
  to work out that it means the same thing.
- **Errors state what happened and what to do.** Never apologise, never be vague.
- Every price older than 60 seconds carries its as-of timestamp.
- Prices use **tabular figures**. Not cosmetic — prices sit in vertically aligned comparison rows
  and proportional figures make the column unreadable.

Error copy, concretely:

```
Blinkit isn't available right now. We'll let you know
when it's back — nothing has been charged.              ✓

Oops! Something went wrong 😕 Please try again later.    ✗
```

---

## 8. Client-side contract version

Per [D-002](../DECISIONS.md#d-002--app_number-means-two-different-things-tracked-separately) and
[01-architecture](./01-architecture.md) §5: the gateway returns `api_contract_version` on every
response. The client compares it against the version it was built against, and on mismatch
invalidates cached contract-shaped data and prompts a reload.

**This is ours and has nothing to do with supplier drift**, despite the naming similarity to
`platform_release_watch`. A Blinkit release must never invalidate our frontend caches.
