//! The canary. Replays every fixture live and validates the body.
//!
//!     SWIGGY_ACCESS_TOKEN=… SWIGGY_ADDRESS_ID=… cargo run -p instamart --bin canary
//!
//! Exits non-zero if any fixture does not match its expectation. Run it on a
//! schedule and that exit code is what tells you the integration broke.
//!
//! **This canary is authenticated and Blinkit's is not.** Blinkit's read path is
//! unauthenticated, so its canary runs anywhere; Instamart's needs a ~5 day
//! token with no refresh (D-012). Two consequences worth knowing at 3am:
//!
//! - CI runs `cargo test --workspace`, never this. A missing token cannot turn
//!   CI red, and this canary refuses to report red for one either — an absent
//!   credential is our problem, not a broken supplier, and conflating the two
//!   is how a real outage gets ignored. It exits 0 with an explanation.
//! - A red canary here is more likely an expired token than a shape change.
//!   The 401 path in `Client::execute` says so explicitly.
//!
//! Never canary by placing an order (docs/08-ops-runbook.md 1.3). Everything
//! here is read-path and costs nothing — and D-012 closed the order path for
//! this platform anyway.

use anyhow::Result;
use harness::{Expect, validate};
use instamart::{Client, TOKEN_ENV, fixtures};
use std::{path::PathBuf, process::ExitCode};

#[tokio::main]
async fn main() -> Result<ExitCode> {
    let dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("fixtures");

    let client = match Client::from_env() {
        Ok(c) => c,
        Err(e) => {
            // Not a failure of the integration. Say so, and say it in a way
            // that does not read as green either.
            println!("canary SKIPPED, no credential:\n  {e:#}");
            println!("\nThis is not a supplier problem. Set {TOKEN_ENV} and run again.");
            return Ok(ExitCode::SUCCESS);
        }
    };

    let set = fixtures::all(&client);
    println!(
        "canary: {} fixtures, contract_hash={}",
        set.len(),
        harness::contract_hash(&set)
    );
    if dir.exists() {
        println!("(recorded bodies in {})", dir.display());
    }

    let mut failed = 0usize;

    for f in &set {
        // A transport failure is a canary failure, not a crash.
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
