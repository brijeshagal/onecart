//! Instamart read path, over Swiggy's sanctioned MCP server.
//!
//! Per D-012 this platform reads through `https://mcp.swiggy.com/im` and never
//! orders. None of the machinery the Blinkit adapter needs applies here: no TLS
//! impersonation, no cookie jar, no Cloudflare. It is an authorised API we are
//! invited to call, and the only credential is a bearer token.
//!
//! **No MCP SDK.** An MCP tool call over streamable HTTP is one POST with a
//! JSON-RPC body, and this crate needs two tools. More importantly, `harness`
//! replays a [`RequestSpec`] verbatim so the recorder, the canary and
//! production issue byte-identical requests — an SDK between us and the wire
//! would break that and force a second, parallel contract mechanism.
//!
//! Three wire facts, all measured against the live server rather than read off
//! the docs, which are wrong about several of them:
//!
//! 1. **No `initialize` handshake.** `tools/call` works with a bearer token
//!    alone. There is no `Mcp-Session-Id` to carry.
//! 2. **`Accept` must offer `text/event-stream`** even though every response so
//!    far has come back `application/json`. Omit it and the server answers
//!    `406` before looking at the body.
//! 3. **Errors arrive as HTTP 200** with `result.isError: true` and a plain
//!    human sentence where the JSON payload would be. Same doctrine as
//!    Blinkit's `api2_feed_unauthenticated`: assert on the body, never status.
//!
//! Validation lives in `harness`, which is client-free, so the fixture suite
//! runs offline in CI. Only the canary needs a token.

pub mod fixtures;

use anyhow::{Context, Result, anyhow};
use constants::Platform;
use harness::RequestSpec;
use serde_json::{Value, json};
use std::collections::BTreeMap;

/// The account's saved address that fixtures are recorded against.
///
/// Every read tool takes an `addressId` — Instamart has no notion of a bare
/// coordinate, so this is the equivalent of Blinkit's `REF_LAT`/`REF_LON`. It
/// must be an address on whichever account `SWIGGY_ACCESS_TOKEN` belongs to, so
/// it is configurable; the default is the one the D-012 spike used.
pub const REF_ADDRESS_ENV: &str = "SWIGGY_ADDRESS_ID";
pub const TOKEN_ENV: &str = "SWIGGY_ACCESS_TOKEN";

/// Protocol version echoed on every request. Bumped deliberately, like the
/// supplier `app_version` in D-002 — if Swiggy starts rejecting it, that is a
/// drift signal and not something to paper over.
const PROTOCOL_VERSION: &str = "2025-06-18";

pub struct Client {
    http: wreq::Client,
    url: String,
    token: String,
    address_id: String,
}

impl Client {
    /// Reads the token and reference address from the environment.
    ///
    /// The token is a ~5 day JWT and there is **no refresh token** — Swiggy's
    /// authorisation server advertises the `refresh_token` grant but did not
    /// issue one. Re-auth is the interactive phone + OTP flow in
    /// `tools/spikes/swiggy-mcp`. This is why the error below names that path.
    pub fn from_env() -> Result<Self> {
        let token = std::env::var(TOKEN_ENV).map_err(|_| {
            anyhow!(
                "{TOKEN_ENV} is not set. Instamart's read path is authenticated — unlike \
                 Blinkit's. Get a token with `pnpm spike` in tools/spikes/swiggy-mcp \
                 (interactive: phone + OTP), then export the access_token from .tokens.json. \
                 Tokens last about 5 days and there is no refresh token."
            )
        })?;
        let address_id = std::env::var(REF_ADDRESS_ENV).map_err(|_| {
            anyhow!(
                "{REF_ADDRESS_ENV} is not set. Every Instamart read tool needs an addressId \
                 belonging to the token's account — there is no bare-coordinate read. \
                 Call get_addresses to list them."
            )
        })?;
        Self::new(&token, &address_id)
    }

    pub fn new(token: &str, address_id: &str) -> Result<Self> {
        // Plain client, no .emulation(). Sending a forged Chrome fingerprint to
        // an API that issued us a token would be both pointless and dishonest.
        let http = wreq::Client::builder()
            .build()
            .context("building the http client")?;
        Ok(Self {
            http,
            url: format!("https://{}/im", Platform::Instamart.spec().read_host),
            token: token.to_string(),
            address_id: address_id.to_string(),
        })
    }

    pub fn address_id(&self) -> &str {
        &self.address_id
    }

    /// Deliberately **without** `authorization`. A [`RequestSpec`] gets
    /// serialised into a committed fixture file, so a credential placed here
    /// would be a token in the repository. [`Client::execute`] applies it at
    /// send time instead — every caller goes through there, so the requests
    /// stay byte-identical. A test below fails if this regresses.
    fn base_headers(&self) -> BTreeMap<String, String> {
        BTreeMap::from([
            ("content-type".into(), "application/json".into()),
            // Both types are required. `application/json` alone gets a 406.
            (
                "accept".into(),
                "application/json, text/event-stream".into(),
            ),
            ("mcp-protocol-version".into(), PROTOCOL_VERSION.into()),
        ])
    }

    fn spec_rpc(&self, method: &str, params: Value) -> RequestSpec {
        let mut body = json!({ "jsonrpc": "2.0", "id": 1, "method": method });
        if !params.is_null() {
            body["params"] = params;
        }
        RequestSpec {
            method: "POST".into(),
            url: self.url.clone(),
            query: BTreeMap::new(),
            headers: self.base_headers(),
            cookies: BTreeMap::new(),
            body: Some(body.to_string()),
        }
    }

    /// Runs a fixture's recorded request verbatim and returns the **unwrapped**
    /// payload — see [`unwrap_result`]. Mirrors `blinkit::Client::execute` so
    /// the canary is the same program.
    pub async fn execute(&self, spec: &RequestSpec) -> Result<Value> {
        let mut req = match spec.method.as_str() {
            "POST" => self.http.post(&spec.url),
            m => return Err(anyhow!("unsupported method {m}")),
        };
        for (k, v) in &spec.headers {
            req = req.header(k.as_str(), v.as_str());
        }
        // The one header the spec must never carry. See base_headers.
        req = req.header("authorization", format!("Bearer {}", self.token));
        if let Some(b) = &spec.body {
            req = req.body(b.clone());
        }

        let resp = req.send().await.context("request failed at the transport")?;
        let status = resp.status();
        let text = resp.text().await.context("reading the body")?;

        // Status is used for the error message and NOTHING else, except 401,
        // which has exactly one cause here and a fix worth naming.
        if status.as_u16() == 401 {
            return Err(anyhow!(
                "401 from the MCP server: {TOKEN_ENV} is expired or revoked. Tokens last \
                 about 5 days and there is no refresh token — re-run the interactive flow \
                 in tools/spikes/swiggy-mcp."
            ));
        }

        let envelope: Value = serde_json::from_str(&text).with_context(|| {
            let head: String = text.chars().take(180).collect();
            format!("response was not JSON (http {status}). first 180 chars: {head}")
        })?;
        unwrap_result(&envelope)
    }

    // ---- the read tools, as specs -----------------------------------------

    /// The drift detector. If Swiggy adds, removes or renames a tool, this is
    /// what notices — the MCP equivalent of the D-002 `app_version` signal.
    pub fn spec_tools_list(&self) -> RequestSpec {
        self.spec_rpc("tools/list", Value::Null)
    }

    /// The core read. Returns product cards carrying `spinId`, per-variation
    /// price and a live stock flag.
    pub fn spec_search(&self, query: &str) -> RequestSpec {
        self.spec_rpc(
            "tools/call",
            json!({
                "name": "search_products",
                "arguments": { "addressId": self.address_id, "query": query },
            }),
        )
    }

    /// The same search with `addressId` omitted. Kept so the harness can pin
    /// Instamart's silent-failure shape, exactly as `spec_api2_feed_unauthenticated`
    /// does for Blinkit. Not a read path.
    pub fn spec_search_without_address(&self, query: &str) -> RequestSpec {
        self.spec_rpc(
            "tools/call",
            json!({ "name": "search_products", "arguments": { "query": query } }),
        )
    }
}

/// Unwraps a JSON-RPC envelope into the body the harness asserts against.
///
/// MCP nests the real payload twice: `result.content[0].text` is a **string**
/// containing JSON. Left wrapped, every assertion path would have to point into
/// a string, which JSON Pointer cannot do.
///
/// Three shapes come back, and all three must stay distinguishable:
///
/// - `tools/call` success — `content[0].text` parses. Return the inner object.
/// - `tools/call` failure — HTTP 200, `isError: true`, and `text` is a human
///   sentence, not JSON. Return the **envelope**, so `isError` survives and the
///   happy-path assertions fail on it. Swallowing this would cache an error as
///   a catalog, which is the exact failure docs/03-adapters.md 4 is about.
/// - `tools/list` — no `content` at all. Return `result` unchanged.
pub fn unwrap_result(envelope: &Value) -> Result<Value> {
    if let Some(e) = envelope.get("error") {
        // A JSON-RPC level error is a transport failure, not data.
        return Err(anyhow!("json-rpc error: {e}"));
    }
    let result = envelope
        .get("result")
        .ok_or_else(|| anyhow!("envelope has neither result nor error: {envelope}"))?;

    let text = result.pointer("/content/0/text").and_then(Value::as_str);
    match text {
        Some(t) => match serde_json::from_str::<Value>(t) {
            Ok(inner) => Ok(inner),
            // Not JSON: an error sentence, or a shape we have not seen. Either
            // way the envelope is the honest thing to hand the validator.
            Err(_) => Ok(result.clone()),
        },
        None => Ok(result.clone()),
    }
}

/// The dark stores — "pods" — backing a cart response. Instamart puts the pod
/// on each line as `storeId`, so a multi-store cart is visible without an extra
/// call. Mirrors `blinkit::merchant_ids`.
pub fn store_ids(body: &Value) -> Vec<i64> {
    let mut out: Vec<i64> = body
        .pointer("/data/items")
        .and_then(Value::as_array)
        .map(|a| {
            a.iter()
                .filter_map(|i| i.pointer("/storeId").and_then(Value::as_i64))
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

    fn client() -> Client {
        Client::new("test-token", "test-address").unwrap()
    }

    #[test]
    fn this_platform_is_never_impersonated() {
        // D-012: MCP is sanctioned. Filling this in would mean forging a
        // browser fingerprint at an API that issued us a token — pointless,
        // and it would make us look like the thing we are not.
        assert_eq!(
            Platform::Instamart.spec().impersonate,
            "",
            "instamart must not carry an impersonation profile; fix constants/platforms.toml"
        );
    }

    #[test]
    fn instamart_never_orders() {
        // D-012: checkout exists on the server but no payment method completes
        // without a human, so the order path is closed for this platform.
        assert!(!Platform::Instamart.spec().order_enabled);
    }

    #[test]
    fn accept_offers_event_stream() {
        // Regression guard for a fact that cost a 406 to establish: the server
        // rejects a request that only accepts application/json, even though
        // that is what it answers with.
        let s = client().spec_search("toor dal");
        let accept = s.headers.get("accept").unwrap();
        assert!(
            accept.contains("text/event-stream") && accept.contains("application/json"),
            "accept must offer both: {accept}"
        );
    }

    #[test]
    fn no_spec_carries_a_credential() {
        // RequestSpec is serialised into a fixture file that gets committed.
        // A token here would be a token in git history, which is not something
        // you undo. Blinkit has no equivalent test because its read path is
        // unauthenticated and it has no credential to leak.
        let c = client();
        for s in [
            c.spec_search("toor dal"),
            c.spec_search_without_address("toor dal"),
            c.spec_tools_list(),
        ] {
            for (k, v) in &s.headers {
                assert_ne!(k, "authorization", "spec must not carry the bearer token");
                assert!(
                    !v.contains("test-token"),
                    "header {k} leaks the credential: {v}"
                );
            }
            let body = s.body.unwrap_or_default();
            assert!(!body.contains("test-token"), "body leaks the credential");
        }
    }

    #[test]
    fn search_sends_the_address_in_the_arguments() {
        // There is no bare-coordinate read on Instamart. A search without an
        // addressId is the reject fixture, not a degraded result.
        let s = client().spec_search("toor dal");
        let body: Value = serde_json::from_str(s.body.as_ref().unwrap()).unwrap();
        assert_eq!(body["params"]["name"], "search_products");
        assert_eq!(body["params"]["arguments"]["addressId"], "test-address");
        assert_eq!(body["params"]["arguments"]["query"], "toor dal");
    }

    #[test]
    fn unwrap_lifts_the_json_out_of_the_text_block() {
        // The payload is JSON serialised into a string, and structuredContent
        // came back empty on every real response.
        let env = json!({"result": {
            "content": [{"type": "text", "text": "{\"success\":true,\"data\":{\"products\":[1]}}"}],
            "structuredContent": {}
        }});
        let got = unwrap_result(&env).unwrap();
        assert_eq!(got["success"], true);
        assert_eq!(got["data"]["products"].as_array().unwrap().len(), 1);
    }

    #[test]
    fn an_error_envelope_is_surfaced_not_swallowed() {
        // HTTP 200, parses fine, carries no data. The validator must be able to
        // see isError, and the happy-path assertions must fail on it.
        let env = json!({"result": {
            "content": [{"type": "text", "text": "addressId is required\nReport ID: ERR-X"}],
            "isError": true
        }});
        let got = unwrap_result(&env).unwrap();
        assert_eq!(got["isError"], true, "isError must survive unwrapping");
        assert!(
            got.pointer("/data/products").is_none(),
            "an error must not present as an empty result set"
        );
    }

    #[test]
    fn tools_list_has_no_content_block_and_passes_through() {
        let env = json!({"result": {"tools": [{"name": "search_products"}]}});
        let got = unwrap_result(&env).unwrap();
        assert_eq!(got["tools"][0]["name"], "search_products");
    }

    #[test]
    fn a_json_rpc_error_is_an_error_not_a_body() {
        let env = json!({"error": {"code": -32601, "message": "method not found"}});
        assert!(unwrap_result(&env).is_err());
    }

    #[test]
    fn store_ids_are_deduped_from_cart_lines() {
        let body = json!({"data": {"items": [
            {"storeId": 1402439}, {"storeId": 1402439}, {"storeId": 99}
        ]}});
        assert_eq!(store_ids(&body), vec![99, 1402439]);
    }
}
