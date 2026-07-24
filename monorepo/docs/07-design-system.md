# 07 — Design system

**Status:** v1
**Last updated:** 2026-07-25

Tokens, type, components. `packages/ui`, consumed by every surface.

---

## 1. The position: take the grammar, reject the skin

Per [D-008](../DECISIONS.md#d-008--take-the-interaction-grammar-reject-the-visual-skin). Worth
restating because it is the decision this whole document hangs off.

**Structural familiarity is what actually reduces friction, and it is not protectable.** Copy it
freely — category rail, dense 2-up grid, add-morphs-to-stepper, persistent ETA badge, sticky cart
bar, full-screen search. That grammar is industry-standard across q-commerce globally, and users
navigate on muscle memory built from layout and interaction, not from colour.

**Visual mimicry is the part to reject.** Blinkit's specific yellow, logo treatment and
illustration style are trade dress. Copying them closely *while also* procuring through their
consumer accounts and charging for it stacks a passing-off exposure on top of a ToS exposure.
Those are different categories of problem: one is an account ban you recover from, the other is a
cease-and-desist with standing behind it.

We lose nothing functional by staying visually distinct.

---

## 2. Brand name — **OPEN**

Per [D-007](../DECISIONS.md#d-007--merchant-descriptor--open). The blueprint proposes "Airmail"
(§6.3) and explicitly labels it a proposal. It remains unresolved, and it blocks the merchant
descriptor, the domain, and the naming of everything below.

**The direction is good and worth keeping regardless of the final name.** The emotional register
here is not Blinkit's urban-convenience urgency. It is *I am far away and I want to take care of
someone*. The product's own world is postal: airmail envelopes, ink stamps, customs declarations,
luggage tags, tiffin carriers. Nobody in q-commerce is drawing from that vocabulary, which is
exactly why it is available.

**Constraint until resolved:** the name appears in **no identifier anywhere** — not crate names,
not package names, not database identifiers, and not design tokens. Tokens below are named
semantically for this reason (§3.1). A rename must stay a copy change, never a migration.

**Resolve before:** PSP signup, which is before the first live order.

---

## 3. Colour

### 3.1 Token names are semantic, not brand-derived

The blueprint's palette uses `--airmail-red` and `--airmail-blue`. Renamed here — those bake an
unconfirmed brand name into every stylesheet, which is precisely what §2 forbids.

| Token | Value | Role |
|---|---|---|
| `--ink` | `#16233D` | Primary text, headers, nav |
| `--signal` | `#C8322D` | Primary action, in-transit state |
| `--info` | `#2C5AA0` | Secondary, links, informational |
| `--paper` | `#FBFAF7` | Surface |
| `--paper-sunk` | `#F1EEE7` | Cards, sunken wells |
| `--fresh` | `#1E8E63` | In stock, delivered, success |
| `--muted` | `#7A8194` | Secondary text, disabled |

Deliberately not Blinkit yellow, and deliberately not the warm-cream-plus-terracotta palette that
reads as a generated default.

The red/blue pairing is doing real work: it is the airmail envelope border, and §5 turns it into
a functional state indicator rather than decoration.

### 3.2 Contrast — three of these fail at small sizes

Measured against `--paper` (`#FBFAF7`), or white where used as a background.

| Pair | Ratio | AA normal (4.5) | AA large (3.0) |
|---|---:|---|---|
| `--ink` on `--paper` | **14.9** | ✅ | ✅ |
| `--info` + white text | **6.8** | ✅ | ✅ |
| `--signal` + white text | **5.3** | ✅ | ✅ |
| `--fresh` + white text | **4.1** | ❌ | ✅ |
| `--muted` on `--paper` | **3.7** | ❌ | ✅ |
| `--signal` on `--paper` | **4.9** | ✅ | ✅ |

Two real problems, and both are in places the palette invites you to use them:

**`--muted` fails for body text.** At 3.7:1 it is below AA for anything under 18.66px/bold-14px.
It is the natural choice for secondary product text, timestamps and helper copy — all of which
are small. Fix: darken to roughly `#5F6779` for text use (≈5.4:1) and keep `#7A8194` for
non-text purposes such as borders and disabled fills, where contrast minimums do not apply.

**`--fresh` fails with white text.** At 4.1:1, a white-on-green "Delivered" or "In stock" badge is
below AA at badge sizes, which are small by definition. Fix: use `--ink` on `--fresh` (≈8.8:1),
or darken to about `#17754F` for white text. Prefer ink-on-fresh — it also looks better.

Neither is a reason to abandon the palette. Both are a reason to fix the tokens **before**
anything ships, because retrofitting contrast across a built component library is miserable.

> `--signal` on `--paper` at 4.9:1 passes, but only just. Do not use it for long-form text.
> It is an action and state colour.

### 3.3 Light only in v1

The palette is paper-based and commits to a single look. That is a legitimate choice for a
product with this register.

**Skipped:** dark mode. Add when someone asks, and if they do, note that a paper metaphor does
not invert cleanly — it needs a designed dark counterpart, not an algorithmic flip.

---

## 4. Type

| Role | Face | Use |
|---|---|---|
| Display | condensed grotesque with stencil/postal character | prices, ETA, section heads |
| Body | neutral workhorse grotesque | product names, copy |
| Utility | **tabular-figure mono** | quantities, order IDs, timestamps |

**Tabular figures for prices is not cosmetic.** Prices sit in vertically aligned comparison rows
across up to three platforms. Proportional figures make that column unreadable — digits of
different widths mean the decimal points do not line up, and the eye cannot scan it.

```css
font-variant-numeric: tabular-nums;   /* every price, every quantity, always */
```

Currency needs care here. Per
[D-003](../DECISIONS.md#d-003--sender-sees-their-own-currency-fx-margin-baked-in) the sender sees
their own currency, so the symbol varies by user and the widths differ (`$` vs `C$` vs `£`).
Reserve symbol width in the layout; do not let a currency change reflow a price column.

---

## 5. Signature element: the chevron border

The red-and-blue chevron edge of an airmail envelope, used as a **functional state indicator
rather than decoration**.

```
╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲     order in motion
│                    │
│   Order #4821      │
│   Arrives 4:20 PM  │
│                    │
╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲

┌────────────────────┐     delivered — resolves to a flat border
│   Order #4821      │
│   Delivered 4:18   │
└────────────────────┘
```

An order card carries the chevron border **only while the order is in motion**. On delivery it
resolves to a flat border.

One memorable element, and it encodes real information. **Everything else stays quiet.** The
discipline is the point — a system with one signature element has one; a system with five has
none.

Accessibility: the chevron is never the *only* indicator of state. Status is always also in text.
Motion respects `prefers-reduced-motion`.

---

## 6. Component library

```
packages/ui/
  tokens/          generated from /constants + design tokens
  primitives/      Button Input Sheet Toast Skeleton Stepper Badge
  commerce/        ProductTile PriceRow PlatformChip QuantityStepper
                   CartBar ETABadge
  order/           OrderCard StatusTimeline DeliveryProof DisputeSheet
  layout/          AppShell CategoryRail SearchTakeover BottomNav
```

Dropped from the blueprint's list: **`SubstitutionPicker`**. Per
[D-005](../DECISIONS.md#d-005--out-of-stock-means-refund-the-line-deliver-the-rest) we refund
out-of-stock lines rather than substituting, so there is nothing to pick. It returns if and when
per-line substitution policy (§9.4) does.

### Rules

- **Components never fetch.** Data in via props, events out via callbacks. Every one of them
  renders in a story with no network.
- **`PriceRow` is the only component that renders cross-platform comparison**, so pricing display
  logic exists in exactly one place. Resist the second one.
- **Every component that can show a stale price takes `health: PlatformHealth` and renders the
  degraded state itself.** This is not optional and not the caller's job — there is no way to
  pass a price without passing its health, so a caller cannot forget to check. See
  [06-frontend](./06-frontend.md) §4.
- Tokens are generated, never hand-written. `platforms.toml` holds brand-safe platform colours;
  no component hardcodes a hex.

### The two components that carry the most weight

**`PriceRow`** — the cross-platform comparison. Tabular figures, aligned decimals, reserved
currency-symbol width, per-platform health state, as-of timestamp once older than 60 seconds. If
this component is right, price display is right everywhere.

**`OrderCard`** — carries the chevron border and its resolution. The one place the brand's
signature element lives, and the surface a sender stares at while waiting.
