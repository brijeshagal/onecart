//! Records the golden fixture set against live Blinkit.
//!
//!     cargo run -p blinkit --bin record
//!
//! Re-run when a fixture legitimately changes shape, then read the diff before
//! committing. A fixture re-recorded without reading the diff is how drift gets
//! laundered into the baseline.

use anyhow::Result;
use blinkit::{Client, REF_LAT, REF_LON, fixtures};
use std::{fs, path::PathBuf};

#[tokio::main]
async fn main() -> Result<()> {
    let dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("fixtures");
    fs::create_dir_all(&dir)?;

    let client = Client::new(REF_LAT, REF_LON)?;
    let set = fixtures::all(&client);
    println!("recording {} fixtures into {}", set.len(), dir.display());

    let mut failed = 0usize;

    for f in &set {
        // Record what we can. One blocked endpoint must not cost us the
        // others — and a hard Cloudflare block hits every fixture at once,
        // so aborting on the first turns a bad day into no data at all.
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
            "\n{failed} of {} fixtures could not be recorded. If every one failed, \
             the egress identity is probably blocked rather than the fixtures being \
             wrong — check with `cargo run -p blinkit --bin tlsprobe` and read its \
             advice before retrying.",
            set.len()
        );
    }
    Ok(())
}
