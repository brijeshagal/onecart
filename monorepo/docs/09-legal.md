# 09 — Legal and risk

**Status:** v1
**Last updated:** 2026-07-25

> **This is an engineering document, not legal advice.** It exists so the team shares an honest
> picture of where the exposure is and stops re-litigating it in slack threads. §7 lists what
> actually needs a lawyer, and those items need one before the first live order, not after.

The point of this document is to be plain. A risk you have named and sized is manageable. A risk
everyone privately knows about and nobody writes down is the one that surprises you.

---

## 1. Merchant of record — the framing that has to hold everywhere

**We are the merchant.** Blinkit, Zepto and Swiggy Instamart are **suppliers**.

We set the price, take the payment, own the customer relationship, and carry the liability. That
is the definition of a merchant of record, and it is what we tell the PSP, what appears in
contracts, and what the copy reflects.

**Never describe the product as a marketplace or aggregator.** Not in copy, not in a contract,
not in a PSP conversation, not casually in an email to an underwriter. A marketplace has
different regulatory treatment, different underwriting, and a worse answer to "who is responsible
when it goes wrong." Casually calling ourselves an aggregator in one email can undo a careful
merchant-of-record position.

This is cheap to get right at signup and expensive to correct afterwards. See
[04-payments](./04-payments.md) §1.

---

## 2. Terms of service — the primary, known exposure

**Ordering through consumer accounts is against every one of these platforms' terms of service.**

That is a fact about this business model. It is not a risk we can engineer away, and pretending
otherwise in internal documents helps nobody. What we can do is understand its actual shape.

### What the realistic downside is

**Account termination.** That is the mechanism these platforms have and the one they use. The
entire session pool design in [03-adapters](./03-adapters.md) §5 exists to survive it: multiple
accounts, isolated funding instruments, blast radius capped by pool size, circuit-break and
replace.

### What makes it worse, and is therefore avoidable

- **Aggressive scraping on the read path.** Rate-limit compliance, concurrency caps and
  off-peak probing are not just politeness — heavy load is what makes a platform go looking in
  the first place. Most enforcement starts with someone noticing traffic.
- **Looking like a bot.** Rotating identity per request, missing device headers, no browsing
  history before checkout. Consistency is safer than anonymity here, which is the reasoning
  behind sticky identity.
- **Copying their trade dress.** See §3. This is the one that changes the *category* of problem.

### What is genuinely in our favour, and worth being able to say

We pay full retail price for every order. We are a real customer, at real volume, with real
money, generating real GMV for them. That is a materially different posture from freeloading or
from reselling scraped data, and it is worth being able to state plainly if a conversation ever
happens.

It is not a defence to a ToS claim. It is a reason a commercial conversation is possible, and
the honest long-term resolution here is a supplier relationship, not a better scraper.

---

## 3. Trade dress — a different category of problem

Per [D-008](../DECISIONS.md#d-008--take-the-interaction-grammar-reject-the-visual-skin). This
distinction is the single most useful idea in this document.

| | **Interaction grammar** | **Visual trade dress** |
|---|---|---|
| Examples | category rail, 2-up grid, add-morphs-to-stepper, sticky cart bar, ETA badge, full-screen search | Blinkit's specific yellow, logo treatment, illustration style |
| Protectable | **No** — industry-standard across q-commerce globally | **Yes** |
| Our position | copy freely | reject entirely |
| Cost of avoiding | **none** — we lose nothing functional | none |

**Why it matters that these are different:**

- A ToS violation gets you an **account ban**. You recover from it. The pool design assumes it.
- Trade dress infringement gets you a **cease-and-desist with standing behind it** — a legal
  claim, from a party with resources, that does not go away when you make a new account.

Copying trade dress *while also* procuring through their consumer accounts and charging for it
stacks a passing-off exposure on top of the ToS exposure. It converts a recoverable operational
problem into a legal one, in exchange for nothing.

Users navigate on muscle memory built from layout and interaction, not from colour. We get all
the friction reduction from the grammar and none of the exposure from the skin.

---

## 4. Personal data

We hold personal data about **Indian residents who are not our customers** — recipients. Names,
phone numbers, precise delivery addresses, and geolocation.

That is a more sensitive position than it first appears:

- The data subject (the recipient) never signed up, never agreed to terms, and may not know we
  exist as a company.
- It is precise location data tied to an identified individual, which is a sensitive category
  under most regimes.
- India's Digital Personal Data Protection Act applies to processing the personal data of people
  in India, including by entities outside India offering goods or services to them.

**Practical commitments, which are good engineering regardless of the legal analysis:**

- Collect the minimum: name, phone, address. Nothing else, no enrichment, no inference.
- The share-link flow means the recipient **supplies their own data directly** and can see and
  correct it. That is a genuinely better consent posture than a sender typing it in from memory,
  and it happens to be a product decision we made for usability reasons
  ([D-004](../DECISIONS.md#d-004--share-link-basket-ships-in-v1)).
- Recipient data is visible only to the sender who owns it. A share link exposes a grocery list
  and an address the recipient already knows, and nothing financial or cross-recipient
  ([06-frontend](./06-frontend.md) §2).
- Deletion on request, propagating to the supplier where possible.
- Never sell it, never share it beyond the supplier the order is placed with.
- Retention limits on delivery-proof photos, which are images of someone's doorstep.

**Needs proper advice before launch:** DPDP applicability and obligations for a foreign entity
serving Indian recipients, and whether a local representative is required.

---

## 5. Cross-border money

We take foreign-currency card payments abroad and spend INR inside India through a consumer
account funded by us. Money crosses a border in a way that is not a normal retail purchase.

**Needs proper advice.** Specifically: how the wallet top-up is characterised, whether the
structure implicates Indian exchange-control rules, and what the correct tax treatment is on
both sides. This is not something to reason about from first principles or resolve in a design
document.

Do not launch on the assumption that it is fine because the amounts are small.

---

## 6. Consumer-facing obligations

As merchant of record, the customer relationship is entirely ours. When a supplier fails, the
customer's counterparty is us — not Blinkit.

- **Refunds are our obligation**, regardless of whether the supplier refunded us and regardless
  of the form they refunded in. The wallet-credit-versus-cash asymmetry in
  [05-ledger](./05-ledger.md) §6 is our problem to absorb, never the customer's.
- Terms, refund policy and support contact must be clear and reachable before payment.
- **Never silently charge an amount different from what was shown**
  ([04-payments](./04-payments.md) §5). Beyond being a trust failure, this is the sort of thing
  consumer-protection regimes are specifically written about.
- The disclosed drift buffer must be genuinely disclosed — in the flow, in plain words, not in a
  linked document nobody opens.

---

## 7. Before the first live order

| Item | Why | Who |
|---|---|---|
| Entity and jurisdiction | Determines everything below | Lawyer + accountant |
| MCC set correctly (gifting/retail) | Set at PSP signup, painful to change | Us + PSP |
| Merchant descriptor — [D-007](../DECISIONS.md#d-007--merchant-descriptor--open) | Names the product, not the entity. **Still OPEN.** | Us |
| Terms of service and refund policy | Consumer-facing obligation | Lawyer |
| Privacy policy covering recipient data | We hold data on non-customers | Lawyer |
| DPDP applicability assessment | Indian residents' personal data | Lawyer, India |
| Cross-border money structure | §5 | Lawyer + accountant |
| Chargeback and dispute process | We are structurally exposed | Us + PSP |

**None of these are blocked on engineering.** All of them are blocked on someone starting them,
and several have lead times measured in weeks. Start them in parallel with week 1 of
[10-roadmap](./10-roadmap.md), not after.

---

## 8. The honest summary

- The ToS exposure is **real, known, and unavoidable** in the current model. The mitigation is
  operational — account pools, blast-radius limits, good-citizen rate limiting — not legal.
- The trade-dress exposure is **entirely avoidable at zero functional cost**, so avoid it.
- The data and cross-border exposures are **ordinary compliance work** that needs professional
  input, not novel risks. They are boring and they are also the ones most likely to be skipped.
- The long-term resolution to §2 is a **supplier relationship**, not a better scraper. Build so
  that becoming legitimate is a configuration change rather than a rewrite: the
  `PlatformAdapter` trait is the seam where a real partnership would plug in, and keeping it
  clean is the cheapest option we have on the future.
