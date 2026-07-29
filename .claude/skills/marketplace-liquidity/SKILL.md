---
name: marketplace-liquidity
description: Solving Towinly's cold-start and growth as a two-sided market — city-by-city launch, seeding supply, density thresholds, and the metrics that matter (match rate, time-to-first-help, repeat rate). Use for launch planning, growth strategy, expansion decisions, or when someone proposes a broad/national launch or install-count goals.
---

# Marketplace liquidity — the cold-start problem

No helpers means no elders, and vice versa. An empty Towinly is worse than no Towinly: an elder
who finds nobody nearby doesn't retry next month. Liquidity strategy is therefore a *product*
constraint, not just marketing.

## Rules of the launch

1. **One geography at a time.** A neighborhood/borough, not a country. Density within a small
   radius is the only thing that matters at the start; 500 users spread across a state is zero
   liquidity, 200 in one suburb is a working market.
2. **Seed the helper side first.** Helpers are reachable through normal channels (students,
   part-timers, `app-store-launch` ASO) and tolerate an empty app better — they can be recruited
   and verified (`background-checks`) *before* elders ever arrive. Target a helper:elder ratio
   of roughly 1:3 at open.
3. **Elders arrive through institutions, not ads** — open the elder side through the partners in
   `institutional-partnerships`, timed to when helper coverage in that radius is real.
4. **Don't open the next area** until the current one clears thresholds (below).
5. **Concierge the first hundred matches.** Manually introduce, call both sides, watch what
   breaks. This is research, not scale — but it also guarantees early elders a good experience,
   which the trust brand cannot gamble on.

## Density thresholds (defaults — tune with data)

| Gate | Threshold |
|---|---|
| Open elder acquisition in an area | ≥15 verified, active helpers within the help radius |
| Declare an area healthy | ≥70% of new elder requests get a helper response < 24h |
| Open the next area | current area healthy for 4 consecutive weeks |

## Metrics that matter (and the ones that don't)

Track: **match rate** (requests with ≥1 accepted helper), **time-to-first-help** per new elder,
**repeat rate** per side (elder asks again; helper helps again within 30 days), active balance
(requests per active helper — too high = churn from overload, too low = helper churn from
emptiness), and ladder progression (connections reaching FIRST_MEET).

Ignore: installs, signups, follower counts. A signup that never matches is a cost, not a win.

## Anti-patterns to flag on sight

- National/state-wide launch plans, or marketing spend not tied to an open area.
- Growth mechanics that rush trust (skip-the-ladder promos, urgency, streak-pressure) — the
  ladder's slowness is the product (`PRODUCT.md`: "Slow is the point").
- Paying helpers to be "available" (classification risk — `marketplace-payments`).
- Vanity dashboards: any growth report that leads with installs gets rewritten around match rate.
