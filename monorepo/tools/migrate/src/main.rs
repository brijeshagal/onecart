//! Applies `infra/migrations/*.sql` to the database in `DATABASE_URL`.
//!
//! Run it so the credential never lands in a shell history or a transcript:
//!
//!     railway run cargo run -p migrate
//!
//! Railway injects DATABASE_URL into the child process. There is no flag to
//! pass the URL on the command line, deliberately.

use anyhow::{Context, Result};
use sqlx::postgres::PgPoolOptions;

#[tokio::main]
async fn main() -> Result<()> {
    let url = std::env::var("DATABASE_URL").context(
        "DATABASE_URL is not set.\n\
         Run this through Railway so the credential is never typed or logged:\n\
         \n    railway run cargo run -p migrate\n",
    )?;

    let pool = PgPoolOptions::new()
        .max_connections(1)
        .connect(&url)
        .await
        .context("could not connect. is the Railway Postgres service running?")?;

    sqlx::migrate!("../../infra/migrations")
        .run(&pool)
        .await
        .context(
            "migration failed.\n\
             If it failed on `create extension postgis`, the Railway Postgres \
             image does not ship PostGIS — see docs/11-procurement.md.",
        )?;

    println!("migrations applied");
    Ok(())
}
