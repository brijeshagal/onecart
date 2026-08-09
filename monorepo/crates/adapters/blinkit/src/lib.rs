//! Blinkit read path.
//!
//! Reads the **web** host, not `api2.grofers.com` — see D-011. With a
//! TLS-impersonating client and only location cookies, the web endpoints
//! return real catalog data unauthenticated, while the Android API answers
//! `is_success: false` without an `auth_key` we have no way to obtain.
//!
//! Cloudflare rejects stock TLS fingerprints at the socket layer, before a
//! single header is read, so the impersonating client is a prerequisite rather
//! than a tuning step. A plain `reqwest`/`fetch` here does not degrade — it
//! returns 403 and nothing works.
//!
//! This crate owns the HTTP client. Validation lives in `harness`, which is
//! deliberately client-free so the fixture suite runs offline.

pub mod fixtures;

use anyhow::{Context, Result, anyhow};
use constants::Platform;
use harness::RequestSpec;
use serde_json::Value;
use std::collections::BTreeMap;
use wreq_util::Emulation;

/// Indiranagar, Bengaluru. The reference coordinate for fixtures — a pin that
/// is reliably serviceable, so a failure means us, not the neighbourhood.
pub const REF_LAT: &str = "12.9716";
pub const REF_LON: &str = "77.5946";

/// Maps the `impersonate` constant to a profile `wreq-util` actually ships.
///
/// Explicit rather than a `FromStr` so an unsupported bump is caught by a test
/// instead of surfacing as a 403 in production.
pub fn emulation(name: &str) -> Result<Emulation> {
    Ok(match name {
        "chrome133" => Emulation::Chrome133,
        "chrome134" => Emulation::Chrome134,
        "chrome135" => Emulation::Chrome135,
        "chrome136" => Emulation::Chrome136,
        "chrome137" => Emulation::Chrome137,
        other => {
            return Err(anyhow!(
                "impersonation profile {other:?} is not supported by wreq-util \
                 (it currently tops out at chrome137). Fix constants/platforms.toml."
            ));
        }
    })
}

pub struct Client {
    http: wreq::Client,
    lat: String,
    lon: String,
}

impl Client {
    pub fn new(lat: &str, lon: &str) -> Result<Self> {
        let spec = Platform::Blinkit.spec();
        let http = wreq::Client::builder()
            .emulation(emulation(spec.impersonate)?)
            .build()
            .context("building the impersonating client")?;
        Ok(Self {
            http,
            lat: lat.to_string(),
            lon: lon.to_string(),
        })
    }

    fn base_headers(&self) -> BTreeMap<String, String> {
        let spec = Platform::Blinkit.spec();
        // Send what the app sends, including the ones that look pointless.
        BTreeMap::from([
            ("accept".into(), "application/json, text/plain, */*".into()),
            ("content-type".into(), "application/json".into()),
            ("lat".into(), self.lat.clone()),
            ("lon".into(), self.lon.clone()),
            ("app_client".into(), spec.app_client.into()),
            ("app_version".into(), spec.app_version.into()),
            ("referer".into(), "https://blinkit.com/".into()),
            ("origin".into(), "https://blinkit.com".into()),
        ])
    }

    /// Location lives in cookies on the web host. Without them `/feed/` 400s
    /// and search answers for nowhere in particular.
    fn cookie_map(&self) -> BTreeMap<String, String> {
        BTreeMap::from([
            ("gr_1_lat".into(), self.lat.clone()),
            ("gr_1_lon".into(), self.lon.clone()),
            ("gr_1_locality".into(), "ref".into()),
            ("gr_1_landmark".into(), "ref".into()),
        ])
    }

    /// Runs a fixture's recorded request verbatim, so the recorder, the canary
    /// and production all issue byte-identical requests. The canary cannot
    /// drift from what was recorded because it replays the same spec.
    pub async fn execute(&self, spec: &RequestSpec) -> Result<Value> {
        let mut req = match spec.method.as_str() {
            "GET" => self.http.get(&spec.url),
            "POST" => self.http.post(&spec.url),
            m => return Err(anyhow!("unsupported method {m}")),
        };

        let q: Vec<(&str, &str)> = spec
            .query
            .iter()
            .map(|(k, v)| (k.as_str(), v.as_str()))
            .collect();
        if !q.is_empty() {
            req = req.query(&q);
        }
        for (k, v) in &spec.headers {
            req = req.header(k.as_str(), v.as_str());
        }
        if !spec.cookies.is_empty() {
            let jar = spec
                .cookies
                .iter()
                .map(|(k, v)| format!("{k}={v}"))
                .collect::<Vec<_>>()
                .join("; ");
            req = req.header("cookie", jar);
        }
        if let Some(b) = &spec.body {
            req = req.body(b.clone());
        }

        let resp = req.send().await.context("request failed at the transport")?;
        let status = resp.status();
        let text = resp.text().await.context("reading the body")?;

        // Status is used for the error message and NOTHING else. A 200 proves
        // the socket opened, not that the answer is real.
        serde_json::from_str(&text).with_context(|| {
            let head: String = text.chars().take(180).collect();
            format!("response was not JSON (http {status}). first 180 chars: {head}")
        })
    }

    // ---- the three read endpoints, as specs -------------------------------

    pub fn spec_autosuggest(&self, query: &str) -> RequestSpec {
        RequestSpec {
            method: "GET".into(),
            url: "https://blinkit.com/location/autoSuggest".into(),
            query: BTreeMap::from([
                ("query".into(), query.into()),
                ("lat".into(), self.lat.clone()),
                ("lng".into(), self.lon.clone()),
            ]),
            headers: self.base_headers(),
            cookies: self.cookie_map(),
            body: None,
        }
    }

    pub fn spec_feed(&self) -> RequestSpec {
        RequestSpec {
            method: "GET".into(),
            url: "https://blinkit.com/feed/".into(),
            query: BTreeMap::from([("template_version".into(), "9".into())]),
            headers: self.base_headers(),
            cookies: self.cookie_map(),
            body: None,
        }
    }

    /// The search term goes in the URL. Putting it in the body returns
    /// `400 {"error":"search query cannot be empty"}` for every key name —
    /// `q`, `query`, `keyword` and `search_query` were all tried.
    pub fn spec_search(&self, q: &str) -> RequestSpec {
        RequestSpec {
            method: "POST".into(),
            url: "https://blinkit.com/v1/layout/search".into(),
            query: BTreeMap::from([("q".into(), q.into())]),
            headers: self.base_headers(),
            cookies: self.cookie_map(),
            body: Some("{}".into()),
        }
    }

    /// The Android host, kept only so the harness can pin its silent-failure
    /// shape. Not a read path — see D-011.
    pub fn spec_api2_feed_unauthenticated(&self) -> RequestSpec {
        RequestSpec {
            method: "POST".into(),
            url: "https://api2.grofers.com/v1/layout/feed".into(),
            query: BTreeMap::new(),
            headers: BTreeMap::from([
                ("app_client".into(), "consumer_android".into()),
                ("app_version".into(), "18.9.3".into()),
                ("lat".into(), self.lat.clone()),
                ("lon".into(), self.lon.clone()),
                ("battery-level".into(), "EXCELLENT".into()),
                ("content-type".into(), "application/json".into()),
                ("accept".into(), "application/json".into()),
            ]),
            cookies: BTreeMap::new(),
            body: Some("{}".into()),
        }
    }
}

/// The dark stores serving a search response. `merchant_id` rides on every
/// product card, which is what makes the docs/03-adapters.md 6.2 assertion
/// "resolved store must equal the quoted store" possible without an extra call.
pub fn merchant_ids(body: &Value) -> Vec<i64> {
    let mut out: Vec<i64> = body
        .pointer("/response/snippets")
        .and_then(Value::as_array)
        .map(|a| {
            a.iter()
                .filter_map(|s| s.pointer("/data/merchant_id").and_then(Value::as_i64))
                .collect()
        })
        .unwrap_or_default();
    out.sort_unstable();
    out.dedup();
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_configured_impersonation_profile_is_supported() {
        // constants/platforms.toml exists so this is tracked and bumped
        // deliberately. Bump it past what wreq-util ships and this fails here,
        // rather than as a 403 nobody can explain.
        let spec = Platform::Blinkit.spec();
        assert!(
            emulation(spec.impersonate).is_ok(),
            "platforms.toml impersonate={:?} is not a wreq-util profile",
            spec.impersonate
        );
    }

    #[test]
    fn an_unknown_profile_is_rejected_loudly() {
        let e = emulation("chrome999").unwrap_err().to_string();
        assert!(
            e.contains("chrome999") && e.contains("platforms.toml"),
            "error should name the bad value and where to fix it: {e}"
        );
    }

    #[test]
    fn search_puts_the_query_in_the_url_not_the_body() {
        // Regression guard for a fact that cost an afternoon to establish.
        let c = Client::new(REF_LAT, REF_LON).unwrap();
        let s = c.spec_search("amul butter");
        assert_eq!(s.query.get("q").map(String::as_str), Some("amul butter"));
        assert_eq!(s.body.as_deref(), Some("{}"));
    }

    #[test]
    fn location_rides_in_cookies_on_the_web_host() {
        let c = Client::new(REF_LAT, REF_LON).unwrap();
        assert_eq!(c.spec_feed().cookies.get("gr_1_lat").unwrap(), REF_LAT);
    }

    #[test]
    fn merchant_ids_are_extracted_and_deduped() {
        let body = serde_json::json!({"response": {"snippets": [
            {"data": {"merchant_id": 33966}},
            {"data": {"merchant_id": 33966}},
            {"data": {}}
        ]}});
        assert_eq!(merchant_ids(&body), vec![33966]);
    }
}
