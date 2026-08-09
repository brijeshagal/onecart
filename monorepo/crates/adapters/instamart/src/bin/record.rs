//! Records the golden fixture set against live Instamart.
//!
//!     SWIGGY_ACCESS_TOKEN=… SWIGGY_ADDRESS_ID=… cargo run -p instamart --bin record
//!
//! Re-run when a fixture legitimately changes shape, then read the diff before
//! committing. A fixture re-recorded without reading the diff is how drift gets
//! laundered into the baseline.
//!
//! Unlike Blinkit's recorder this needs a token — Instamart's read path is
//! authenticated. See the canary for why that asymmetry matters.

use anyhow::Result;
use instamart::{Client, fixtures};
use std::{fs, path::PathBuf};

#[tokio::main]
async fn main() -> Result<()> {
    let dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("fixtures");
    fs::create_dir_all(&dir)?;

    let client = Client::from_env()?;
    let set = fixtures::all(&client);
    println!("recording {} fixtures into {}", set.len(), dir.display());

    let mut failed = 0usize;

    for f in &set {
        // Record what we can. One failing tool must not cost us the others.
        let body = match client.execute(&f.request).await {
            Ok(b) => b,
            Err(e) => {
                failed += 1;
                println!("  {:<28} NOT RECORDED: {e:#}", f.name);
                continue;
            }
        };

        fs::write(
            dir.join(format!("{}.fixture.json", f.name)),
            serde_json::to_string_pretty(f)? + "\n",
        )?;
        fs::write(
            harness::Fixture::body_path(&dir, &f.name),
            serde_json::to_string_pretty(&body)? + "\n",
        )?;

        // Report what the validator makes of what we just recorded, so a
        // fixture that no longer matches its own expectation is obvious now
        // rather than at the next canary run.
        let verdict = match (f.expect, harness::validate(&body, &f.assertions)) {
            (harness::Expect::Pass, Ok(())) => "PASS as expected".to_string(),
            (harness::Expect::Reject, Err(e)) => format!("REJECTED as expected ({})", e.len()),
            (harness::Expect::Pass, Err(e)) => format!("!! expected PASS but got {e:?}"),
            (harness::Expect::Reject, Ok(())) => "!! expected REJECT but it passed".into(),
        };
        println!("  {:<28} {verdict}", f.name);
    }

    println!("contract_hash = {}", harness::contract_hash(&set));
    if failed > 0 {
        println!(
            "\n{failed} of {} fixtures could not be recorded. If every one failed, the \
             token is the first thing to check — it lasts about 5 days and there is no \
             refresh token.",
            set.len()
        );
    }
    Ok(())
}
