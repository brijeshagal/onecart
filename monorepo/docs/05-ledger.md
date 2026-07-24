# 05 — Ledger

**Status:** v1
**Last updated:** 2026-07-25

Double-entry, multi-currency, Rust + Postgres. Schema in
[02-data-model](./02-data-model.md) §9.

---

## 1. Why this is non-negotiable

Two currencies, two directions, and a supplier who refunds us in a currency-like thing that is
not money.

The specific case, from the blueprint §2.9: **the supplier refunds us as wallet credit while we
owe the customer cash.** That is two entries and a payable, in two different currencies. There is
no way to represent it in a running balance, and if you try, you will not notice that it is
happening.

Without a ledger you lose the plot by order 50 and cannot tell whether the unit economics work.
That is not a figure of speech — §6 below shows a failure mode that is invisible to a
bank-balance view and obvious in a ledger.

---

## 2. The two invariants

Enforced in the database, not the application.

### 2.1 Transactions balance per currency, not across

```
for each currency c in txn:
    Σ entries(txn, c).amount_minor == 0
```

Not one sum across all entries. A multi-currency transaction balances **independently in each
currency**, with the FX difference booked explicitly.

This is the whole trick that makes [D-003](../DECISIONS.md#d-003--sender-sees-their-own-currency-fx-margin-baked-in)
tractable. Attempting to balance across currencies means picking a rate to balance *at*, which
smuggles an FX opinion into every transaction and makes historical reconstruction impossible.

### 2.2 An account holds exactly one currency

```
ledger_entries.currency == ledger_accounts.currency
```

Cross-currency movement never happens by implicit conversion. It goes through an explicit pair
of **FX clearing accounts** — one per currency — which is how a real conversion gets represented
as two independently-balanced halves. See §5.

---

## 3. Chart of accounts

Minimal v1 set. Suffix is the currency; every account is single-currency by 2.2.

| Code | Currency | Kind | Holds |
|---|---|---|---|
| `psp_receivable_<cur>` | sender | asset | Captured, not yet settled by the PSP |
| `bank_<cur>` | sender | asset | Our actual bank balance |
| `supplier_wallet_inr` | INR | asset | Prepaid balance on a supplier account |
| `cogs_supplier_inr` | INR | expense | What the goods actually cost us |
| `revenue_goods_<cur>` | sender | income | Goods revenue at market rate |
| `revenue_service_fee_<cur>` | sender | income | Our service fee |
| `fx_margin_income_<cur>` | sender | income | The FX spread, booked separately |
| `psp_fees_<cur>` | sender | expense | Processing costs |
| `customer_payable_<cur>` | sender | liability | Refunds owed but not yet issued |
| `fx_clearing_<cur>` | each | asset | The bridge between currencies, §5 |
| `goodwill_<cur>` | sender | expense | Discretionary refunds |

**`fx_margin_income` is separate from `revenue_goods` on purpose.** It is the number that tells
you whether the margin in `fees.toml` is set correctly, and burying it inside goods revenue means
never finding out.

---

## 4. Worked example: the happy path

Sender in Canada. Supplier quote ₹840.00. Market rate 60 INR/CAD. FX margin 250bps. Service fee
CAD 2.50. Drift buffer 12%.

```
₹840.00 / 60          = CAD 14.00
        × 1.025       = CAD 14.35     (FX margin: CAD 0.35)
        + 2.50        = CAD 16.85     ← displayed to the sender
        × 1.12        = CAD 18.87     ← authorised, never displayed as "the price"
```

### T0 — Authorisation

**No ledger entries.** An authorisation is not money; it is a promise about money. It is a state
on `payment_intents`, not a ledger event.

Getting this wrong — booking revenue at auth — is the most common way to end up with a ledger
that overstates income and cannot explain the gap.

### T1 — Capture, all lines delivered. CAD 16.85

| Account | Debit | Credit |
|---|---:|---:|
| `psp_receivable_cad` | 1685 | |
| `revenue_goods_cad` | | 1400 |
| `fx_margin_income_cad` | | 35 |
| `revenue_service_fee_cad` | | 250 |

CAD sums to zero. No INR entries in this transaction.

### T2 — Procurement: ₹840.00 leaves the supplier wallet

| Account | Debit | Credit |
|---|---:|---:|
| `cogs_supplier_inr` | 84000 | |
| `supplier_wallet_inr` | | 84000 |

INR sums to zero. No CAD entries.

T1 and T2 are economically one event and accountingly two transactions in two currencies, each
balancing on its own. Neither needs to know the other's rate. **This is the pattern for
everything in this system.**

### T3 — PSP fees

| Account | Debit | Credit |
|---|---:|---:|
| `psp_fees_cad` | 55 | |
| `psp_receivable_cad` | | 55 |

**Contribution on this order:** CAD 16.85 revenue − CAD 14.00 goods cost − CAD 0.55 PSP =
**CAD 2.30**, of which CAD 0.35 is FX margin and CAD 2.50 is service fee, less processing.

That number is the entire reason this document exists. It is not visible from a bank balance.

---

## 5. Cross-currency: topping up the wallet

The only transaction that legitimately spans currencies. CAD 1,000 out of our bank, ₹60,000 into
the supplier wallet.

| Account | Currency | Debit | Credit |
|---|---|---:|---:|
| `fx_clearing_cad` | CAD | 100000 | |
| `bank_cad` | CAD | | 100000 |
| `supplier_wallet_inr` | INR | 6000000 | |
| `fx_clearing_inr` | INR | | 6000000 |

CAD balances. INR balances. Neither half knows the other's rate.

**The two clearing accounts are where FX truth lives.** They accumulate offsetting positions, and
the difference between them — valued at current rates — is realised FX gain or loss. Reconcile
them monthly. If `fx_clearing` is drifting in one direction, the margin in `fees.toml` is wrong,
and this is the only place that says so.

Wallet top-up is a **manual, monitored operation** in v1, never automated. See
[03-adapters](./03-adapters.md) §6.4.

---

## 6. The case that motivates everything: wallet-credit refund

Platform cancels an order **after** we captured. The supplier returns ₹840 to our wallet. We owe
the customer CAD 16.85 in cash.

### T4 — Supplier refunds to wallet (INR)

| Account | Debit | Credit |
|---|---:|---:|
| `supplier_wallet_inr` | 84000 | |
| `cogs_supplier_inr` | | 84000 |

### T5 — We now owe the customer (CAD)

| Account | Debit | Credit |
|---|---:|---:|
| `revenue_goods_cad` | 1400 | |
| `fx_margin_income_cad` | 35 | |
| `revenue_service_fee_cad` | 250 | |
| `customer_payable_cad` | | 1685 |

### T6 — Refund issued

| Account | Debit | Credit |
|---|---:|---:|
| `customer_payable_cad` | 1685 | |
| `psp_receivable_cad` | | 1685 |

### What just happened

The INR wallet is whole. The CAD bank is down CAD 16.85. **We are long INR and short CAD.**

The refund did not cost us goods — it cost us *currency position*. Our money came back as
balance that can only be spent on Blinkit, while real cash left in Canadian dollars.

At one order this is noise. At scale, a persistent platform-cancellation rate means steadily
accumulating INR we can only spend one way while bleeding the currency we actually need. That is
a genuine business risk, it is completely invisible on a bank statement, and the ledger surfaces
it as a single obvious number: **`supplier_wallet_inr` growing while `bank_<cur>` shrinks.**

**Alert on that ratio.** It is the closest thing this system has to a canary for the business
model itself.

Refund at the **original rate**, not today's — see [04-payments](./04-payments.md) §7. That is
why T5 reverses the exact original amounts rather than recomputing.

---

## 7. Partial fulfilment — the common path, not the exception

Per [D-005](../DECISIONS.md#d-005--out-of-stock-means-refund-the-line-deliver-the-rest), we
refund out-of-stock lines rather than substituting. Most orders will land here.

Same order, one ₹120.00 line unavailable. Delivered ₹720.00.

```
₹720.00 / 60 × 1.025  = CAD 12.30
              + 2.50  = CAD 14.80     ← captured
                         CAD 18.87 auth − 14.80 captured → void the remainder
```

| Account | Debit | Credit |
|---|---:|---:|
| `psp_receivable_cad` | 1480 | |
| `revenue_goods_cad` | | 1200 |
| `fx_margin_income_cad` | | 30 |
| `revenue_service_fee_cad` | | 250 |

Procurement books INR 72000 rather than 84000. Nothing else changes.

**Note the service fee is unchanged at CAD 2.50.** We did the work regardless of a supplier's
stock position. Whether that holds — and whether it should be waived past some fulfilment
threshold — is a policy question, and its answer belongs in `fees.toml`, not in code.

Because there is no capture above the delivered amount and no refund transaction at all, this is
the **cleanest** of the three money-back paths. Which is a quiet argument in favour of D-005
beyond the trust reasoning: not substituting is also the cheapest thing to account for.

---

## 8. Reconciliation

| Cadence | Check |
|---|---|
| Per order | Ledger entries exist for every `CAPTURED` order; no order captured without a matching transaction |
| Daily | `psp_receivable_<cur>` matches the PSP's settlement report |
| Daily | `supplier_wallet_inr` matches the actual balance read from the supplier account |
| Monthly | `fx_clearing_cad` + `fx_clearing_inr` valued at current rate → realised FX gain/loss |
| Monthly | `fx_margin_income` vs realised FX cost → is `fees.toml` right? |
| Continuous | `supplier_wallet_inr` growth vs `bank_<cur>` decline → the §6 alarm |

The supplier wallet check is the one that requires reading a balance out of a consumer account
we do not control, which is an adapter read-path call like any other. If it cannot be read, that
is a degraded state worth alerting on — an unverifiable asset balance is not an asset balance.
