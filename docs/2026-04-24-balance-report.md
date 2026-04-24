# Shelter Night Shift Balance Report

Generated from:

```bash
npm run build
npm run simulate -- --runs 100
```

## Summary

- Runs: 100
- Successes: 74
- Failures: 26
- Win rate: 74%
- Failure causes: infection 26

## Average Final Metrics

- Power: 76.6
- Infection: 84.5
- Order: 25.2

## Task Outcomes

- Resolved: 1798
- Failed: 564

## Role Contribution

| Role | Progress | Resolved | Claims | Assists |
| --- | ---: | ---: | ---: | ---: |
| doctor | 11345 | 778 | 690 | 449 |
| engineer | 10928 | 808 | 577 | 508 |
| logistics | 11555 | 802 | 594 | 403 |
| security | 11080 | 755 | 586 | 511 |

## Readout

The current pressure curve is now observable instead of trivially safe. A 74% win rate means the sample squad usually survives, but delayed coordination can collapse the shelter.

The dominant failure mode is infection. That points to medical-chain pressure and infection penalties as the next balance knobs. Order also ends low on average, so security/logistics failures are contributing indirect pressure even when infection is the final collapse trigger.

## Recommendations

- Keep the current failure multiplier for now; it creates meaningful stakes without making success rare.
- Add more medical mitigation tools before increasing infection penalties again.
- Watch security contribution after future task additions, because security has the lowest resolved count in this report.
