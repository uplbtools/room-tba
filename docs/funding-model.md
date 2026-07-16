# Funding model

Room TBA is funded by curated, campus-relevant sponsors (see
[ad-policy.md](ad-policy.md) for what we do and don't accept). This document
describes where the money goes and what sponsors get.

## Revenue split

| Share | Goes to                                                            |
| ----- | ------------------------------------------------------------------ |
| 40%   | Core team incentives                                               |
| 30%   | Top maintainers / contributor payouts                              |
| 30%   | Operational expenses (hosting, database, domains, upgrades)        |

## Contributor payouts

Payouts are points-based, tallied monthly from merged work and accepted
reports:

| Contribution                  | Points |
| ----------------------------- | ------ |
| Merged feature PR             | 5      |
| Bug fix                       | 3      |
| Data contribution             | 2      |
| QA report                     | 2      |
| Docs PR                       | 2      |
| Triage                        | 1      |

Minimum **5 points/month** to receive a payout for that month.

**Payment methods:** TBD — GCash, bank transfer.

## Sponsor tiers

| Tier         | Monthly | Semester | Placement                                                       |
| ------------ | ------- | -------- | --------------------------------------------------------------- |
| Gold         | ₱2,000  | ₱8,000   | Status bar badge, side panel, sponsors page hero, sponsored pin |
| Silver       | ₱1,000  | ₱4,000   | Side panel rotation, sponsors page grid, sponsored pin          |
| Bronze       | ₱500    | ₱2,000   | Sponsors page list, static page strip                           |
| Campus Promo | ₱800    | ₱3,200   | Time-boxed campus promos                                        |
| Student Org  | Free    | Free     | Event promotion, sponsors page mention                          |

Sponsored map pins (Gold/Silver) require a real physical location near campus
registered as a `places` entity — see the map-pin rules in
[ad-policy.md](ad-policy.md). Max 3 pins at once, gold priority.

## Impression guarantee

- **Gold:** minimum 3,000 impressions/month
- **Silver:** minimum 1,500 impressions/month
- Under-delivery is credited pro-rata against the next billing period.

Impressions are measured first-party by `/api/sponsor-event`
(`sponsor_impressions` table): session-deduped, bot-filtered, no cookies. See
[ad-policy.md](ad-policy.md) for placement and content rules.
