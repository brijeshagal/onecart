//! The canary. Replays every fixture live and validates the body.
//!
//!     cargo run -p blinkit --bin canary
//!
//! Exits non-zero if any fixture does not match its expectation. That exit code
//! is the whole product: run it on a schedule and it is the thing that tells
//! you the integration broke, which is what was missing last time.
//!
//! Never canary by placing an order (docs/08-ops-runbook.md 1.3). Everything
//! here is read-path and costs nothing.

use anyhow::Result;
use blinkit::{Client, REF_LAT, REF_LON, fixtures};
use harness::{Expect, validate};
use std::{path::PathBuf, process::ExitCode};

#[tokio::main]
async fn main() -> Result<ExitCode> {
    let dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("fixtures");
    let client = Client::new(REF_LAT, REF_LON)?;
    let set = fixtures::all(&client);

    println!("canary: {} fixtures, contract_hash={}", set.len(), harness::contract_hash(&set));
    if dir.exists() {
        println!("(recorded bodies in {})", dir.display());
    }

    let mut failed = 0usize;

    for f in &set {
        // A transport failure is a canary failure, not a crash. Cloudflare
        // serving a 403 HTML block page lands here as "not JSON" and must be
        // reported red rather than cached as data.
        let outcome = match client.execute(&f.request).await {
            Ok(body) => validate(&body, &f.assertions).map_err(|e| e.join("; ")),
            Err(e) => Err(format!("{e:#}")),
        };

        let ok = matches!(
            (f.expect, &outcome),
            (Expect::Pass, Ok(())) | (Expect::Reject, Err(_))
        );

        if ok {
            let note = match (&f.expect, &outcome) {
                (Expect::Reject, Err(why)) => format!("  (rejected: {why})"),
                _ => String::new(),
            };
            println!("  ok   {:<28} expected {:?}{note}", f.name, f.expect);
        } else {
            failed += 1;
            let why = match &outcome {
                Ok(()) => "passed validation but the fixture expects it to be rejected".into(),
                Err(e) => e.clone(),
            };
            println!("  FAIL {:<28} expected {:?}: {why}", f.name, f.expect);
        }
    }

    if failed == 0 {
        println!("all {} fixtures behaved as expected", set.len());
        Ok(ExitCode::SUCCESS)
    } else {
        println!("{failed} of {} fixtures failed", set.len());
        Ok(ExitCode::FAILURE)
    }
}
