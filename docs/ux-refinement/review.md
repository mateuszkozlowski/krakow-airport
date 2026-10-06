# UX refinement — 6 October 2026

Scope: direction-switch spacing, hover stability, quieter supporting sections and plain-language PL/EN model explanations. No weather rules, frozen model weights, collection jobs or notification thresholds changed.

## Inspected flow

| Step | Before | After |
| --- | --- | --- |
| 1. Choose arrival/departure and scan the timeline | Switch touched the glass surface; hover added a new readout and moved following sections by 69.8 px. | 12 px gap. Preview uses the existing two-line heading. All 16 controlled hover checks changed height and following-section position by 0 px. |
| 2. Select a time and inspect weather | Selected weather was already directly below the plot; supporting sections repeated long headings and measurements. | Immediate selected weather is preserved. A compact exact-time form and current observation disclosure reduce the default page. Current hazard reasons stay visible outside the disclosure. |
| 3. Understand the forecast and fog model | Airport data, weather-model guidance and the separately trained model were hard to distinguish; the model comparison was buried below a separate 1000 m evaluation. | Sources are explained in everyday language. The fog-model page leads with its 550 m / two-hour goal, 105,029 training examples, live-test state and criteria for use. The separate 1000 m evaluation and technical terms remain optional. |

Flow health: the inspected core actions pass; the timeline remains the primary view and selected weather requires one choice. The model is still being evaluated and does not change passenger assessments or notifications.

## Evidence

- `01-before-home.png`, `02-before-hover.png`, `04-before-methodology.png`, `06-before-model.png`: screenshots of the live production site before the change.
- `07-after-mobile.png`, `08-after-selected.png`, `09-after-desktop.png`, `11-after-methodology.png`, `12-after-model.png`, `15-after-320.png`: local production build with actual public weather and current quality history.
- `10-after-scenario.png`: controlled five-minute weather changes, a gap and a PROB40 scenario. This is simulated weather, not the live airport state.
- `14-table-*-fixture.png`: controlled comparison scores for 40 examples, used only to check table layout. They are not published performance results.
- `baseline.json`, `local-verification.json`, `table-review.json`: measurements, tested flows and evidence limits.

## Validation

- PL/EN at 320, 390, 768 and 1280 px; no horizontal page overflow.
- 16 controlled hover checks before/after selection: chart-height delta 0 px, following-section delta 0 px, direction-switch gap 12 px.
- Pointer and keyboard selection, short changes, explicit gaps, exact-time input and focus, operation switch, base/scenario separation, probabilities, separate RVR, copied-link feedback and optional reminders.
- Current freezing-precipitation and storm warnings remain visible with full measurements closed; keyboard opens the observations.
- Full forecast remains available, including benign transitions omitted from the compact main view.
- Model and methodology pages render on the server, explain test status and preserve honest missing-data behaviour.
- ESLint, TypeScript/production build and all 52 existing tests passed.

Limits: headless Chromium with local production builds and controlled cases; not a full assistive-technology or cross-browser accessibility audit. Historical training size is not live-test accuracy, and the controlled comparison table is not evidence of forecast skill.

Production verification is performed after GitHub/Vercel rollout and stored separately in `/tmp/krk-design/production-refinement-verification.json`.
