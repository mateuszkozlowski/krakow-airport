# Frozen additional model iterations

6 October 2026, before inspecting 2026 targets/scores. The 2025 holdout is already explored and must not be used to tune or select this iteration.

- Same visibility <550 m target, 2/6 h leads, ±15-minute matching and historical receipt-time limitation as the previous experiment. No flight outcomes or RVR claims.
- Development split: fit classifiers on 2018–2021, calibrate on 2022, compare fixed candidates on 2023. Purge labels within two hours of boundaries. Classifiers must not be refitted after their calibrators are learned.
- Candidates: base and extended existing features; scaled logistic regression C=0.01/0.1/1; existing boosting (150 iterations, 15 leaves, leaf minimum 60, L2=10) and conservative boosting (100 iterations, 7 leaves, leaf minimum 120, L2=20). Early stopping off, seed 42. Each uses sigmoid calibration from the separate year, with no oversampling or alarm-threshold tuning.
- Choose the lowest Brier candidate on development 2023 separately for each horizon. Also preserve every development candidate result, including raw scores. This is tuning data, not new independent evidence. Check quarter and onset/continuation breakdowns; do not make a new selection from the final test.
- Final fitting: selected classifier on 2018–2023, calibrator on 2024. Compare it with frozen 2023-fit/2024-calibrated base logistic and train-only seasonal/persistence baselines on previously unseen 2026-01-01 through 2026-09-30 (end excluded 2026-10-01). No 2025 fitting or selection.
- Evaluate frozen selected model once on the 2026 test. Publish full Brier/calibration/precision-recall/onset-continuation/quarter results and paired calendar-week bootstrap intervals, even if the new candidate loses.
- The 2026 test is an incomplete season and omits Q4, when most poor-visibility cases previously occurred. Do not call this full-season validation, infer flight alert suitability from overall Brier, or deploy automatically. Models remain research-only pending issued TAF benchmark and prospective monitoring.
- Record source/feature/protocol hashes, training counts and missingness. Verify feature causality and recompute scores from saved predictions.
