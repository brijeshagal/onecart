//! Parsing rendered money strings into integer minor units.
//!
//! Blinkit does not send numbers. It sends `"₹293"` — a string built for a
//! label. docs/02-data-model.md 0 is absolute: **money is never a float**, so
//! this converts straight to `i64` paise without touching `f64` on the way.
//!
//! The previous implementation did:
//!
//! ```text
//! parseFloat(priceText.replace(/[^\d.]/g, ""))
//! ```
//!
//! which is wrong three times over: it is a float, it silently yields `NaN`
//! for junk, and stripping everything but digits and dots turns `"₹1.2.3"`
//! into a plausible-looking number. This returns an error instead. A price we
//! cannot parse is a failure, not a zero.

use std::fmt;

#[derive(Debug, PartialEq, Eq)]
pub enum ParseError {
    Empty,
    NoDigits,
    /// More precision than paise can hold — refuse rather than round.
    TooPrecise(usize),
    /// More than one decimal separator, stray characters between digits, etc.
    Malformed,
    Overflow,
}

impl fmt::Display for ParseError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Empty => write!(f, "empty string"),
            Self::NoDigits => write!(f, "no digits"),
            Self::TooPrecise(n) => write!(f, "{n} decimal places, paise holds 2"),
            Self::Malformed => write!(f, "malformed"),
            Self::Overflow => write!(f, "overflows i64 minor units"),
        }
    }
}

impl std::error::Error for ParseError {}

/// `"₹293"` -> `29300`. `"₹1,234.50"` -> `123450`. `"-₹5"` -> `-500`.
///
/// Rejects anything it cannot represent exactly.
pub fn parse_inr_minor(s: &str) -> Result<i64, ParseError> {
    let t = s.trim();
    if t.is_empty() {
        return Err(ParseError::Empty);
    }

    // A minus may sit either side of the symbol: "-₹5" or "₹-5".
    let negative = t.contains('-');

    // Keep only digits and dots; everything else (₹, "Rs.", commas, spaces,
    // NBSP, the minus we already noted) is presentation.
    //
    // "Rs." is the one trap here: its dot would read as a decimal point, so
    // strip a leading currency word before the dot filter runs.
    let cleaned: String = {
        let lower = t.to_ascii_lowercase();
        let body = lower
            .trim_start_matches('-')
            .trim_start()
            .strip_prefix("rs.")
            .or_else(|| lower.trim_start_matches('-').trim_start().strip_prefix("rs"))
            .unwrap_or_else(|| t.trim_start_matches('-'));
        body.chars()
            .filter(|c| c.is_ascii_digit() || *c == '.')
            .collect()
    };

    if cleaned.is_empty() || !cleaned.chars().any(|c| c.is_ascii_digit()) {
        return Err(ParseError::NoDigits);
    }

    let mut parts = cleaned.split('.');
    let whole = parts.next().unwrap_or("");
    let frac = parts.next().unwrap_or("");
    if parts.next().is_some() {
        return Err(ParseError::Malformed); // "1.2.3"
    }
    if frac.len() > 2 {
        return Err(ParseError::TooPrecise(frac.len()));
    }

    let whole_n: i64 = if whole.is_empty() {
        0
    } else {
        whole.parse().map_err(|_| ParseError::Overflow)?
    };
    // "99.5" is 50 paise, not 5.
    let frac_n: i64 = match frac.len() {
        0 => 0,
        1 => frac.parse::<i64>().map_err(|_| ParseError::Malformed)? * 10,
        _ => frac.parse::<i64>().map_err(|_| ParseError::Malformed)?,
    };

    let minor = whole_n
        .checked_mul(100)
        .and_then(|w| w.checked_add(frac_n))
        .ok_or(ParseError::Overflow)?;

    Ok(if negative { -minor } else { minor })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_what_blinkit_actually_sends() {
        // Observed live on 2026-07-25, product 498972.
        assert_eq!(parse_inr_minor("₹293"), Ok(29_300));
        assert_eq!(parse_inr_minor("₹325"), Ok(32_500));
    }

    #[test]
    fn handles_separators_and_decimals() {
        assert_eq!(parse_inr_minor("₹1,234.50"), Ok(123_450));
        assert_eq!(parse_inr_minor("₹1,23,456"), Ok(12_345_600)); // Indian grouping
        assert_eq!(parse_inr_minor("  ₹ 42 "), Ok(4_200));
        assert_eq!(parse_inr_minor("Rs. 99"), Ok(9_900));
        assert_eq!(parse_inr_minor("293"), Ok(29_300));
    }

    #[test]
    fn one_decimal_digit_is_tenths_not_hundredths() {
        // The bug that would make ₹99.5 cost 5 paise more than ₹99.
        assert_eq!(parse_inr_minor("₹99.5"), Ok(9_950));
        assert_eq!(parse_inr_minor("₹99.05"), Ok(9_905));
    }

    #[test]
    fn negatives_survive_either_placement() {
        assert_eq!(parse_inr_minor("-₹5"), Ok(-500));
        assert_eq!(parse_inr_minor("₹-5"), Ok(-500));
    }

    #[test]
    fn zero_parses_but_is_not_positive() {
        // parse succeeds; PriceMinorPositive is what rejects it.
        assert_eq!(parse_inr_minor("₹0"), Ok(0));
    }

    #[test]
    fn junk_errors_rather_than_yielding_zero() {
        // This is the whole point. parseFloat gave NaN -> 0 -> a free product.
        assert_eq!(parse_inr_minor(""), Err(ParseError::Empty));
        assert_eq!(parse_inr_minor("   "), Err(ParseError::Empty));
        assert_eq!(parse_inr_minor("₹"), Err(ParseError::NoDigits));
        assert_eq!(parse_inr_minor("out of stock"), Err(ParseError::NoDigits));
        assert_eq!(parse_inr_minor("₹1.2.3"), Err(ParseError::Malformed));
        assert_eq!(parse_inr_minor("₹1.234"), Err(ParseError::TooPrecise(3)));
    }

    #[test]
    fn never_rounds_silently() {
        // Refusing is the correct answer: rounding here is money invented or
        // destroyed, and nobody would ever see it happen.
        assert!(parse_inr_minor("₹10.999").is_err());
    }
}
