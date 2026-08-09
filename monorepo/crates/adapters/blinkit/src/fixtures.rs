//! The golden fixture set for Blinkit's read path.
//!
//! Defined in code so the recorder and the canary cannot disagree about what
//! is being asked for. `record` writes them out with a live body; `canary`
//! replays them and validates.
//!
//! Two of the five expect [`Expect::Reject`], deliberately. A suite that only
//! contains happy paths tells you the happy path works and nothing about
//! whether the validator would notice if it stopped — which is precisely the
//! failure this project already had once.

use crate::Client;
use harness::{Assertion, Expect, Fixture};

const SNIPPETS: &str = "/response/snippets";

pub fn all(c: &Client) -> Vec<Fixture> {
    let f = |name: &str, description: &str, request, expect, assertions| Fixture {
        name: name.into(),
        description: description.into(),
        platform: "blinkit".into(),
        request,
        expect,
        assertions,
    };

    vec![
        f(
            "search_amul_butter",
            "The core read. Proves we get product cards with a dark store id and \
             prices that parse to integer minor units.",
            c.spec_search("amul butter"),
            Expect::Pass,
            vec![
                Assertion::IsTrue {
                    path: "/is_success".into(),
                },
                Assertion::ArrayMinLen {
                    path: SNIPPETS.into(),
                    min: 5,
                },
                // Not EachHas: a search response interleaves product cards with
                // headers and grid containers, which carry no merchant_id.
                Assertion::AnyEq {
                    path: SNIPPETS.into(),
                    field: "/widget_type".into(),
                    value: "product_card_snippet_type_2".into(),
                },
                Assertion::PricesValid {
                    path: SNIPPETS.into(),
                    field: "/data/normal_price/text".into(),
                },
            ],
        ),
        f(
            "api2_feed_unauthenticated",
            "THE most important fixture. api2.grofers.com answers HTTP 200 with a \
             complete, plausible layout envelope, is_success:false and snippets:null. \
             It parses. Anything branching on status code would cache this and serve \
             it as a catalog. This fixture must stay RED.",
            c.spec_api2_feed_unauthenticated(),
            Expect::Reject,
            vec![
                Assertion::IsTrue {
                    path: "/is_success".into(),
                },
                Assertion::ArrayMinLen {
                    path: SNIPPETS.into(),
                    min: 1,
                },
            ],
        ),
        f(
            "autosuggest_indiranagar",
            "Address resolution. Recipient address text -> place_id + coordinates, \
             which is the front of the whole coverage path.",
            c.spec_autosuggest("indiranagar"),
            Expect::Pass,
            vec![
                Assertion::ArrayMinLen {
                    path: "/ui_data/suggestions".into(),
                    min: 1,
                },
                Assertion::EachHas {
                    path: "/ui_data/suggestions".into(),
                    field: "/meta/place_id".into(),
                },
            ],
        ),
        f(
            "feed_with_location",
            "The home feed for a serviceable pin. Location rides in cookies on the \
             web host, not headers.",
            c.spec_feed(),
            Expect::Pass,
            vec![Assertion::ArrayMinLen {
                path: "/objects".into(),
                min: 1,
            }],
        ),
        f(
            "feed_without_location",
            "The same feed with the location cookies stripped. Blinkit 400s with a \
             bare {message}. Proves a misconfigured location is caught rather than \
             silently serving results for nowhere in particular.",
            {
                let mut s = c.spec_feed();
                s.cookies.clear();
                s
            },
            Expect::Reject,
            vec![Assertion::ArrayMinLen {
                path: "/objects".into(),
                min: 1,
            }],
        ),
    ]
}

// The cart-with-lines fixture from docs/11-procurement.md is deliberately not
// here: a cart response requires an authenticated account, so the canary could
// not replay it. It lands with the order path, alongside the session pool.
