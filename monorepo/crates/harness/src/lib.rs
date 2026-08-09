//! Contract test harness.
//!
//! The premise, from docs/08-ops-runbook.md: **the integration will break
//! without warning, repeatedly, forever.** This crate is what notices.
//!
//! The one rule that matters (docs/03-adapters.md 4):
//!
//! > Assert on response **bodies**, never status codes.
//!
//! This is not pedantry. `api2.grofers.com` returns HTTP 200 with a complete,
//! plausible layout envelope, `is_success: false` and `snippets: null`. It
//! parses. Anything branching on status would cache that and serve it as a
//! catalog. The `api2_feed_unauthenticated` fixture pins exactly that case and
//! exists to prove this harness rejects it.
//!
//! Deliberately has no HTTP client: validation is pure, so the whole fixture
//! suite runs offline in CI. The live canary lives in the adapter that owns the
//! client and calls [`validate`] on what it fetched.

pub mod money;

use anyhow::{Context, Result, anyhow};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::{collections::BTreeMap, fs, path::Path};

/// What the fixture suite expects [`validate`] to conclude.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Expect {
    /// A healthy response. Every assertion must hold.
    Pass,
    /// A response that must be REJECTED. At least one assertion must fail.
    ///
    /// A suite of only-happy fixtures is a green dashboard over an untested
    /// validator, so at least one fixture must be this.
    Reject,
}

/// Paths are RFC 6901 JSON Pointers: `/response/snippets`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum Assertion {
    /// Path exists and is boolean `true`. This is `is_success`.
    IsTrue { path: String },
    /// Path is an array with at least `min` elements.
    ArrayMinLen { path: String, min: usize },
    /// Path is a string that is not empty.
    NonEmptyString { path: String },
    /// Every element of the array at `path` has a non-null value at `field`
    /// (itself a pointer, relative to the element).
    EachHas { path: String, field: String },
    /// At least one element of the array at `path` has `field == value`.
    AnyEq {
        path: String,
        field: String,
        value: String,
    },
    /// The rendered price string at `path` parses to POSITIVE minor units.
    /// Guards docs/02-data-model.md 0: money is never a float.
    PriceMinorPositive { path: String },
    /// Across the array at `path`: every element that carries `field` must
    /// parse to positive minor units, and at least one must carry it.
    ///
    /// Used instead of a fixed index because a search response interleaves
    /// product cards with headers and grid containers, so "the first product"
    /// has no stable position.
    PricesValid { path: String, field: String },
}

impl Assertion {
    fn path(&self) -> &str {
        match self {
            Self::IsTrue { path }
            | Self::ArrayMinLen { path, .. }
            | Self::NonEmptyString { path }
            | Self::EachHas { path, .. }
            | Self::AnyEq { path, .. }
            | Self::PriceMinorPositive { path }
            | Self::PricesValid { path, .. } => path,
        }
    }

    fn check(&self, body: &Value) -> Result<(), String> {
        let at = |p: &str| body.pointer(p);
        let missing = |p: &str| format!("{p} is absent");

        match self {
            Self::IsTrue { path } => match at(path) {
                Some(Value::Bool(true)) => Ok(()),
                Some(other) => Err(format!("{path} is {other}, expected true")),
                None => Err(missing(path)),
            },
            Self::ArrayMinLen { path, min } => match at(path) {
                Some(Value::Array(a)) if a.len() >= *min => Ok(()),
                Some(Value::Array(a)) => {
                    Err(format!("{path} has {} elements, expected >= {min}", a.len()))
                }
                // null is the silent-circuit-break signature. Name it explicitly.
                Some(Value::Null) => Err(format!("{path} is null, expected an array")),
                Some(other) => Err(format!("{path} is not an array: {other}")),
                None => Err(missing(path)),
            },
            Self::NonEmptyString { path } => match at(path) {
                Some(Value::String(s)) if !s.trim().is_empty() => Ok(()),
                Some(Value::String(_)) => Err(format!("{path} is empty")),
                Some(other) => Err(format!("{path} is not a string: {other}")),
                None => Err(missing(path)),
            },
            Self::EachHas { path, field } => {
                let Some(Value::Array(a)) = at(path) else {
                    return Err(format!("{path} is not an array"));
                };
                for (i, el) in a.iter().enumerate() {
                    match el.pointer(field) {
                        Some(Value::Null) | None => {
                            return Err(format!("{path}[{i}]{field} is absent or null"));
                        }
                        _ => {}
                    }
                }
                Ok(())
            }
            Self::AnyEq { path, field, value } => {
                let Some(Value::Array(a)) = at(path) else {
                    return Err(format!("{path} is not an array"));
                };
                let hit = a.iter().any(|el| {
                    el.pointer(field)
                        .and_then(Value::as_str)
                        .is_some_and(|s| s == value)
                });
                if hit {
                    Ok(())
                } else {
                    Err(format!("no element of {path} has {field} == {value:?}"))
                }
            }
            Self::PriceMinorPositive { path } => {
                let Some(Value::String(s)) = at(path) else {
                    return Err(format!("{path} is not a rendered price string"));
                };
                match money::parse_inr_minor(s) {
                    Ok(m) if m > 0 => Ok(()),
                    Ok(m) => Err(format!("{path} parsed to {m} minor units, expected > 0")),
                    Err(e) => Err(format!("{path} ({s:?}) does not parse: {e}")),
                }
            }
            Self::PricesValid { path, field } => {
                let Some(Value::Array(a)) = at(path) else {
                    return Err(format!("{path} is not an array"));
                };
                let mut seen = 0usize;
                for (i, el) in a.iter().enumerate() {
                    let Some(Value::String(s)) = el.pointer(field) else {
                        continue; // headers and containers carry no price
                    };
                    seen += 1;
                    match money::parse_inr_minor(s) {
                        Ok(m) if m > 0 => {}
                        Ok(m) => return Err(format!("{path}[{i}]{field} parsed to {m}, expected > 0")),
                        Err(e) => {
                            return Err(format!("{path}[{i}]{field} ({s:?}) does not parse: {e}"));
                        }
                    }
                }
                if seen == 0 {
                    // A catalog response with no prices at all is the failure
                    // this exists to catch.
                    return Err(format!("no element of {path} carries a price at {field}"));
                }
                Ok(())
            }
        }
    }
}

/// How to re-fetch this fixture live. The harness does not execute it — the
/// adapter that owns the HTTP client does.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RequestSpec {
    pub method: String,
    pub url: String,
    #[serde(default)]
    pub query: BTreeMap<String, String>,
    #[serde(default)]
    pub headers: BTreeMap<String, String>,
    #[serde(default)]
    pub cookies: BTreeMap<String, String>,
    #[serde(default)]
    pub body: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Fixture {
    pub name: String,
    /// Why this fixture exists. Read at 3am — make it worth reading.
    pub description: String,
    pub platform: String,
    pub request: RequestSpec,
    pub expect: Expect,
    pub assertions: Vec<Assertion>,
}

impl Fixture {
    /// The recorded body lives beside the spec as `<name>.body.json`.
    /// Kept separate because bodies are large and change with every price
    /// move, while the contract does not.
    pub fn body_path(dir: &Path, name: &str) -> std::path::PathBuf {
        dir.join(format!("{name}.body.json"))
    }

    pub fn recorded_body(&self, dir: &Path) -> Result<Value> {
        let p = Self::body_path(dir, &self.name);
        let raw = fs::read_to_string(&p).with_context(|| format!("reading {}", p.display()))?;
        serde_json::from_str(&raw).with_context(|| format!("parsing {}", p.display()))
    }
}

/// A response that parses but is semantically empty is a FAILURE, and it must
/// be indistinguishable from a 500 to everything upstream.
pub fn validate(body: &Value, assertions: &[Assertion]) -> Result<(), Vec<String>> {
    let failures: Vec<String> = assertions
        .iter()
        .filter_map(|a| a.check(body).err())
        .collect();
    if failures.is_empty() {
        Ok(())
    } else {
        Err(failures)
    }
}

pub fn load_all(dir: &Path) -> Result<Vec<Fixture>> {
    let mut out = Vec::new();
    let entries =
        fs::read_dir(dir).with_context(|| format!("reading fixture dir {}", dir.display()))?;
    for e in entries {
        let p = e?.path();
        let file = p.file_name().and_then(|s| s.to_str()).unwrap_or_default();
        let Some(stem) = file.strip_suffix(".fixture.json") else {
            continue;
        };
        let raw = fs::read_to_string(&p)?;
        let f: Fixture =
            serde_json::from_str(&raw).with_context(|| format!("parsing {}", p.display()))?;
        if f.name != stem {
            return Err(anyhow!(
                "fixture {} declares name {:?}; it must match the filename so the body file resolves",
                p.display(),
                f.name
            ));
        }
        out.push(f);
    }
    out.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(out)
}

/// Hash of the fixture set, recorded into `platform_release_watch.contract_hash`.
///
/// Covers the CONTRACT (name, request, expectation, assertions) and
/// deliberately not the recorded bodies — prices move every few minutes and
/// that is not drift.
pub fn contract_hash(fixtures: &[Fixture]) -> String {
    let mut h = Sha256::new();
    for f in fixtures {
        h.update(f.name.as_bytes());
        h.update(f.platform.as_bytes());
        h.update(serde_json::to_vec(&f.request).unwrap_or_default());
        h.update(serde_json::to_vec(&f.expect).unwrap_or_default());
        for a in &f.assertions {
            h.update(a.path().as_bytes());
            h.update(serde_json::to_vec(a).unwrap_or_default());
        }
    }
    format!("{:x}", h.finalize())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn null_snippets_is_a_failure_not_an_empty_result() {
        // The exact api2.grofers.com shape. HTTP 200, parses fine, no data.
        let body = json!({"is_success": false, "response": {"snippets": null}});
        let a = vec![
            Assertion::IsTrue {
                path: "/is_success".into(),
            },
            Assertion::ArrayMinLen {
                path: "/response/snippets".into(),
                min: 1,
            },
        ];
        let errs = validate(&body, &a).unwrap_err();
        assert_eq!(errs.len(), 2, "both assertions should fail: {errs:?}");
        assert!(errs[1].contains("null"), "must name the null: {errs:?}");
    }

    #[test]
    fn a_healthy_body_passes() {
        let body = json!({
            "is_success": true,
            "response": {"snippets": [
                {"widget_type": "product_card_snippet_type_2",
                 "data": {"merchant_id": 33966, "normal_price": {"text": "₹293"}}}
            ]}
        });
        let a = vec![
            Assertion::IsTrue {
                path: "/is_success".into(),
            },
            Assertion::ArrayMinLen {
                path: "/response/snippets".into(),
                min: 1,
            },
            Assertion::EachHas {
                path: "/response/snippets".into(),
                field: "/data/merchant_id".into(),
            },
            Assertion::AnyEq {
                path: "/response/snippets".into(),
                field: "/widget_type".into(),
                value: "product_card_snippet_type_2".into(),
            },
            Assertion::PriceMinorPositive {
                path: "/response/snippets/0/data/normal_price/text".into(),
            },
        ];
        assert!(validate(&body, &a).is_ok());
    }

    #[test]
    fn an_empty_array_is_a_failure() {
        // 200 with `snippets: []` is the other silent-circuit-break shape.
        let body = json!({"is_success": true, "response": {"snippets": []}});
        assert!(
            validate(
                &body,
                &[Assertion::ArrayMinLen {
                    path: "/response/snippets".into(),
                    min: 1
                }]
            )
            .is_err()
        );
    }

    #[test]
    fn missing_field_is_named_not_silently_skipped() {
        let body = json!({"response": {"snippets": [{"data": {}}]}});
        let errs = validate(
            &body,
            &[Assertion::EachHas {
                path: "/response/snippets".into(),
                field: "/data/merchant_id".into(),
            }],
        )
        .unwrap_err();
        assert!(errs[0].contains("merchant_id"), "{errs:?}");
    }

    #[test]
    fn contract_hash_ignores_recorded_data_but_not_the_contract() {
        let mk = |min: usize| Fixture {
            name: "x".into(),
            description: String::new(),
            platform: "blinkit".into(),
            request: RequestSpec {
                method: "GET".into(),
                url: "https://example.test".into(),
                query: BTreeMap::new(),
                headers: BTreeMap::new(),
                cookies: BTreeMap::new(),
                body: None,
            },
            expect: Expect::Pass,
            assertions: vec![Assertion::ArrayMinLen {
                path: "/a".into(),
                min,
            }],
        };
        assert_eq!(contract_hash(&[mk(1)]), contract_hash(&[mk(1)]));
        assert_ne!(
            contract_hash(&[mk(1)]),
            contract_hash(&[mk(2)]),
            "a changed assertion must change the contract hash"
        );
    }
}
