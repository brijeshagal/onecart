//! Does Cloudflare accept our TLS fingerprint right now?
//!
//!     cargo run -p blinkit --bin tlsprobe              # the configured profile
//!     cargo run -p blinkit --bin tlsprobe -- chrome136 # one specific profile
//!
//! **One fingerprint per run, deliberately.**
//!
//! An earlier version of this file swept every profile `wreq-util` ships, in a
//! loop, from one IP. That is precisely the signature docs/03-adapters.md 5.2
//! warns about — "an identity that changes every call is more anomalous than
//! one that never changes" — and the egress it ran from was hard-blocked by
//! Cloudflare within minutes, taking the read path down with it.
//!
//! So: no loop, no sweep. If you want to compare profiles, run this repeatedly
//! with a real gap between runs, and understand you are spending the
//! reputation of that egress identity to do it.

use anyhow::Result;
use constants::Platform;
use wreq_util::Emulation;

#[tokio::main]
async fn main() -> Result<()> {
    let configured = Platform::Blinkit.spec().impersonate;
    let name = std::env::args().nth(1).unwrap_or_else(|| configured.into());
    let emu: Emulation = blinkit::emulation(&name)?;

    println!("probing blinkit.com/location/autoSuggest as {name} (one request)");

    let client = wreq::Client::builder().emulation(emu).build()?;
    let r = client
        .get("https://blinkit.com/location/autoSuggest")
        .query(&[
            ("query", "indiranagar"),
            ("lat", blinkit::REF_LAT),
            ("lng", blinkit::REF_LON),
        ])
        .header("accept", "application/json, text/plain, */*")
        .send()
        .await?;

    let status = r.status();
    let body = r.text().await.unwrap_or_default();

    // Body, not status. A 200 would still have to parse into the right shape.
    let verdict = match serde_json::from_str::<serde_json::Value>(&body) {
        Ok(v) if v.pointer("/ui_data/suggestions").is_some() => "PASS — real JSON",
        Ok(_) => "JSON, but not the expected shape",
        Err(_) if body.contains("you have been blocked") => {
            "BLOCKED — this egress identity is denied, not merely challenged. \
             Back off; do not retry in a loop."
        }
        Err(_) if status == 403 => "403 — fingerprint rejected",
        Err(_) => "not JSON",
    };

    println!("http={status} bytes={} -> {verdict}", body.len());
    Ok(())
}
