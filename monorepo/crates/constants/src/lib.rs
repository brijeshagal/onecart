//! Generated constants. Nothing in here is hand-written.
//!
//! No magic strings in either codebase: a platform is `Platform::Blinkit`,
//! never `"blinkit"`. See docs/01-architecture.md 4.

mod generated;

pub use generated::*;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn blinkit_is_the_only_order_platform() {
        // README non-goals: only Blinkit is on the order path in v1.
        let ordering: Vec<_> = Platform::ALL
            .iter()
            .filter(|p| p.spec().order_enabled)
            .collect();
        assert_eq!(ordering.len(), 1);
        assert_eq!(ordering[0].spec().id, "blinkit");
    }

    #[test]
    fn transitions_are_acyclic_into_terminals() {
        // A terminal state must not lead anywhere, or the orchestrator can loop.
        for st in [
            OrderState::Settled,
            OrderState::ProcurementFailed,
            OrderState::RefundIssued,
            OrderState::Abandoned,
        ] {
            for next in [OrderState::Draft, OrderState::Quoted, OrderState::Placed] {
                assert!(
                    !st.can_transition_to(next),
                    "{:?} must be terminal but leads to {:?}",
                    st,
                    next
                );
            }
        }
    }

    #[test]
    fn the_happy_path_is_walkable() {
        let path = [
            OrderState::Draft,
            OrderState::Quoted,
            OrderState::Authorized,
            OrderState::Procuring,
            OrderState::Placed,
            OrderState::Confirmed,
            OrderState::OutForDelivery,
            OrderState::Delivered,
            OrderState::Captured,
            OrderState::Settled,
        ];
        for pair in path.windows(2) {
            assert!(
                pair[0].can_transition_to(pair[1]),
                "{:?} -> {:?} is not a legal transition",
                pair[0],
                pair[1]
            );
        }
    }

    #[test]
    fn partial_fulfil_is_reachable() {
        // D-005 makes this the COMMON path, not an edge case.
        assert!(OrderState::OutForDelivery.can_transition_to(OrderState::PartialFulfill));
        assert!(OrderState::PartialFulfill.can_transition_to(OrderState::Delivered));
    }

    #[test]
    fn address_gc_terminals_really_are_terminal_or_settled() {
        // The GC query trusts this list. A non-final state in it would delete
        // an address out from under a live order.
        for st in OrderState::TERMINAL_FOR_ADDRESS_GC {
            assert!(
                !st.can_transition_to(OrderState::Procuring)
                    && !st.can_transition_to(OrderState::Placed),
                "{:?} is in TERMINAL_FOR_ADDRESS_GC but can still reach procurement",
                st
            );
        }
    }

    #[test]
    fn auth_freshness_is_below_lease_ttl() {
        // If a session could go stale for longer than a lease lasts, a
        // procurement could be handed a dead session. D-010.
        assert!(limits::order_pool::AUTH_FRESHNESS_SECONDS <= limits::order_pool::LEASE_TTL_SECONDS);
        assert!(
            limits::order_pool::LEASE_HEARTBEAT_SECONDS < limits::order_pool::LEASE_TTL_SECONDS,
            "a heartbeat slower than the TTL cannot keep a lease alive"
        );
    }
}
