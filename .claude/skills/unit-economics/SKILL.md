---
name: unit-economics
description: Towinly's business model math — take rate, CAC per side, LTV, payback, contribution margin, runway. Use when modelling revenue or pricing, preparing investor materials with financial claims, deciding what to charge, or evaluating whether a growth channel pays for itself.
---

# Unit economics — the model behind the ask

The investor deck has an ask; no model behind it. This skill builds and maintains the math.
Every number that leaves this skill is labelled **actual**, **benchmark**, or **assumption** —
the deck's fact-check discipline (docs/pitch/RESEARCH.md) applies to internal models too.

## The revenue model (candidates, not decisions)

| Model | Shape | Watch out |
|---|---|---|
| Take rate on paid help | 15–25% platform fee (care/services marketplaces cluster here; Papa, TaskRabbit comparables) | Classification rules (`marketplace-payments`) — the fee is for matching+trust, not for managing helpers |
| Family subscription | monthly fee for guardian mode + visibility (the child pays, not the elder) | The elder's core safety features can never be paywalled — trust brand rule |
| Partner/B2B | senior-living operators, agencies, insurers pay for access or reporting | Longest sales cycle; don't model as year-1 revenue |

Default modelling stance: take rate as primary, family subscription as second line once
guardian-mode retention proves out.

## The unit: one matched elder-helper connection

- **Revenue per unit:** helps/month × avg help value × take rate (+ subscription attach).
- **Cost per unit:** background check amortized per helper (a real, chunky COGS line —
  `background-checks`), payment processing, support minutes (`elder-support-desk` — phone
  support is a genuine per-elder cost, model it honestly), insurance allocation.
- **CAC per side:** helpers via ASO/campus channels (cheap); elders via partnerships
  (`institutional-partnerships` — model partner-pilot cost per activated elder, not ad CPMs).
  Blended CAC hides the truth in a two-sided market — always split.
- **LTV:** driven by repeat rate and connection longevity (`product-analytics` retention
  cohorts). A TRUSTED connection that lasts years is the whole thesis — the model should show
  how LTV concentrates in connections that climb the ladder.

## Discipline rules

- Payback per side < 12 months before scaling spend on that side; until then, spend is
  learning, not growth.
- India and US modelled separately (price points, check costs, support costs all differ);
  never average across markets in headline numbers.
- Runway math updates monthly against actuals; the deck's ask ties to named milestones
  (liquidity gates from `marketplace-liquidity`, not vanity counts).
- No number goes to investors that can't survive the RESEARCH.md verification bar.
