//! The golden fixture set for Instamart's read path.
//!
//! Defined in code so the recorder and the canary cannot disagree about what is
//! being asked for. `record` writes them out with a live body; `canary` replays
//! them and validates.
//!
//! One of the three expects [`Expect::Reject`]. A suite of only-happy fixtures
//! tells you the happy path works and nothing about whether the validator would
//! notice if it stopped.

use crate::Client;
use harness::{Assertion, Expect, Fixture};

const PRODUCTS: &str = "/data/products";

pub fn all(c: &Client) -> Vec<Fixture> {
    let f = |name: &str, description: &str, request, expect, assertions| Fixture {
        name: name.into(),
        description: description.into(),
        platform: "instamart".into(),
        request,
        expect,
        assertions,
    };

    vec![
        f(
            "search_toor_dal",
            "The core read. Proves we get product cards with stable identity (spinId), \
             a per-variation price and a live stock flag. Prices arrive as JSON numbers \
             here, not rendered strings like Blinkit's — harness::money is not on this \
             path, only get_cart's billBreakdown would need it.",
            c.spec_search("toor dal"),
            Expect::Pass,
            vec![
                Assertion::IsTrue {
                    path: "/success".into(),
                },
                Assertion::ArrayMinLen {
                    path: PRODUCTS.into(),
                    min: 5,
                },
                // Every card carries at least one variation, and identity plus
                // price live on the variation rather than the product.
                Assertion::EachHas {
                    path: PRODUCTS.into(),
                    field: "/variations/0/spinId".into(),
                },
                Assertion::EachHas {
                    path: PRODUCTS.into(),
                    field: "/variations/0/price/offerPrice".into(),
                },
                Assertion::EachHas {
                    path: PRODUCTS.into(),
                    field: "/variations/0/isInStockAndAvailable".into(),
                },
            ],
        ),
        f(
            "search_without_address",
            "THE important fixture. Instamart answers HTTP 200 with isError:true and a \
             human sentence where the payload goes. It parses. Anything branching on \
             status would cache this and serve it as a catalog. Same assertions as the \
             happy path on purpose — this proves the validator would catch it. Must stay RED.",
            c.spec_search_without_address("toor dal"),
            Expect::Reject,
            vec![
                Assertion::IsTrue {
                    path: "/success".into(),
                },
                Assertion::ArrayMinLen {
                    path: PRODUCTS.into(),
                    min: 5,
                },
            ],
        ),
        f(
            "tools_list",
            "Drift detection. The tool surface is the contract, and Swiggy has already \
             shipped one that differs from its own docs — 14 tools live against 16 \
             documented, with create_address absent (D-012). If a tool we depend on is \
             renamed or withdrawn, this goes red before a customer notices.",
            c.spec_tools_list(),
            Expect::Pass,
            vec![
                Assertion::ArrayMinLen {
                    path: "/tools".into(),
                    min: 10,
                },
                Assertion::AnyEq {
                    path: "/tools".into(),
                    field: "/name".into(),
                    value: "search_products".into(),
                },
                Assertion::EachHas {
                    path: "/tools".into(),
                    field: "/inputSchema".into(),
                },
            ],
        ),
    ]
}

// No cart or checkout fixture, and there will not be one: D-012 closed the
// order path for this platform. A canary must never place an order
// (docs/08-ops-runbook.md 1.3), and everything above is read-only and free.
