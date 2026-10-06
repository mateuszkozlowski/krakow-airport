"""Check frozen model families on earlier development years; never reopen 2026.

See docs/model-polish-protocol.md. All folds are developmental, not an independent
test. A separate state model is a hypothesis; no winner is deployed by this file.
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path

import numpy as np

spec = importlib.util.spec_from_file_location('iterations', Path(__file__).with_name('iterate-fog.py'))
iterations = importlib.util.module_from_spec(spec)
spec.loader.exec_module(iterations)
metrics = iterations.holdout
instant = metrics.validation.instant


def episodes(rows, probabilities, threshold):
    # Deduplicate verifying observation times, never fabricate a start after a gap.
    observed = {}
    for row in rows:
        at = row['outcomeObservedAt']
        if at in observed and observed[at] != row['lowVisibility']:
            raise ValueError('Conflicting outcomes')
        observed[at] = row['lowVisibility']
    previous, active = None, None
    starts, belongs = [], {}
    for at, low in sorted(observed.items()):
        contiguous = previous is not None and (instant(at) - instant(previous[0])).total_seconds() <= 2700
        if low:
            if not contiguous or not previous[1]:
                active = len(starts) if contiguous and not previous[1] else None
                if active is not None:
                    starts.append(at)
            if active is not None:
                belongs[at] = active
        else:
            active = None
        previous = at, low
    eligible, detected = set(), {}
    false_clusters, previous_false = 0, None
    for row, p in zip(rows, probabilities):
        event = belongs.get(row['outcomeObservedAt'])
        if event is not None and row['persistence'] == 0 and instant(row['at']) < instant(starts[event]):
            eligible.add(event)
            if p >= threshold:
                lead = (instant(starts[event]) - instant(row['at'])).total_seconds() / 60
                detected[event] = max(detected.get(event, 0), lead)
        false = p >= threshold and not row['lowVisibility'] and row['persistence'] == 0
        if false:
            if previous_false is None or (instant(row['at']) - instant(previous_false)).total_seconds() > 2700:
                false_clusters += 1
            previous_false = row['at']
        else:
            previous_false = None
    return {'threshold': threshold, 'confirmed_onsets': len(starts), 'onsets_with_forecast': len(eligible),
            'onsets_detected_before_start': len(detected),
            'onset_recall': len(detected) / len(eligible) if eligible else None,
            'median_earliest_warning_minutes': float(np.median(list(detected.values()))) if detected else None,
            'false_alarm_clusters_currently_clear': false_clusters}


def run(path):
    source = path.read_bytes()
    # Files include later years for the previous experiment. Drop them before
    # constructing feature/label arrays or inspecting any outcome here.
    rows = sorted([r for line in source.splitlines() if line.strip()
                   if (r := json.loads(line))['at'] < '2025-01-01'], key=lambda r: r['at'])
    lead = rows[0]['leadHours']
    if lead not in [2, 6] or any(r['leadHours'] != lead or r['featureSet'] != 'extended' for r in rows):
        raise ValueError('Wrong horizon or features')
    if len({r['at'] for r in rows}) != len(rows):
        raise ValueError('Duplicate issue times')
    names = list(rows[0]['features'])
    if any(set(r['features']) != set(names) for r in rows):
        raise ValueError('Schema drift')
    x = np.array([[r['features'][n] for n in names] for r in rows], dtype=float)
    y = np.array([r['lowVisibility'] for r in rows], dtype=int)
    state = np.array([r['persistence'] for r in rows], dtype=int)
    if not np.isfinite(x).all() or not set(y).issubset({0, 1}) or not set(state).issubset({0, 1}):
        raise ValueError('Invalid inputs')
    for r in rows:
        if abs((instant(r['target']) - instant(r['at'])).total_seconds() - lead * 3600) > 1 or abs((instant(r['target']) - instant(r['outcomeObservedAt'])).total_seconds()) > 900:
            raise ValueError('Misaligned label')
    parameters = {'algorithm': 'logistic', 'C': .01} if lead == 2 else {
        'algorithm': 'gradient_boosting', 'max_iter': 150, 'max_leaf_nodes': 15, 'min_samples_leaf': 60, 'l2_regularization': 10}

    def split(start, end):
        cutoff = instant(end + 'T00:00:00Z') - metrics.validation.dt.timedelta(hours=2)
        return np.array([i for i, r in enumerate(rows) if start <= r['at'] < end and instant(r['target']) < cutoff], dtype=int)

    output = []
    saved = path.with_name(f'polish-predictions-{lead}h.jsonl')
    with saved.open('w') as f:
        for year in [2022, 2023, 2024]:
            fit = split('2018-01-01', f'{year - 1}-01-01')
            calibration = split(f'{year - 1}-01-01', f'{year}-01-01')
            testing = split(f'{year}-01-01', f'{year + 1}-01-01')
            model = iterations.classifier(parameters).fit(x[fit], y[fit])
            _, global_p, _ = iterations.calibrate(model, x, y, calibration, testing)
            split_p = global_p.copy()
            heads = []
            for s in [0, 1]:
                fit_s, cal_s = fit[state[fit] == s], calibration[state[calibration] == s]
                mask = state[testing] == s
                adequate = (len(fit_s) >= 200 and min(int(y[fit_s].sum()), int((1-y[fit_s]).sum())) >= 30 and
                            len(cal_s) >= 50 and min(int(y[cal_s].sum()), int((1-y[cal_s]).sum())) >= 10)
                heads.append({'currently_below_550m': bool(s), 'fit_samples': len(fit_s), 'calibration_samples': len(cal_s),
                              'fit_positive': int(y[fit_s].sum()), 'calibration_positive': int(y[cal_s].sum()), 'fallback_to_global': not adequate})
                if adequate and mask.any():
                    head = iterations.classifier(parameters).fit(x[fit_s], y[fit_s])
                    _, p, _ = iterations.calibrate(head, x, y, cal_s, testing[mask])
                    split_p[mask] = p
            truth, eval_rows = y[testing], [rows[i] for i in testing]
            predictions = {'global': global_p, 'separate_states': split_p, 'persistence': state[testing]}
            groups = {}
            for s in [0, 1]:
                mask = state[testing] == s
                groups['currently_below_550m' if s else 'currently_at_least_550m'] = {
                    'samples': int(mask.sum()), 'positive_readings': int(truth[mask].sum()),
                    'scores': {k: metrics.scores(truth[mask], p[mask]) for k, p in predictions.items()},
                    'thresholds': {k: metrics.thresholds(truth[mask], p[mask]) for k, p in predictions.items()}}
            entry = {'year': year, 'splits': {name: {'samples': len(a), 'positive_readings': int(y[a].sum()),
                                                   'first': rows[a[0]]['at'], 'last': rows[a[-1]]['at']}
                                            for name, a in [('fit', fit), ('calibration', calibration), ('development_check', testing)]},
                     'heads': heads, 'scores': {k: metrics.scores(truth, p) for k, p in predictions.items()},
                     'current_conditions': groups,
                     'episodes': {k: [episodes(eval_rows, p, t) for t in [.1, .3, .5]] for k, p in predictions.items()}}
            output.append(entry)
            for j, r in enumerate(eval_rows):
                f.write(json.dumps({'at': r['at'], 'outcomeObservedAt': r['outcomeObservedAt'], 'year': year,
                                    'target': r['target'], 'persistence': r['persistence'],
                                    'truth': int(truth[j]), 'predictions': {k: float(p[j]) for k, p in predictions.items()}}) + '\n')
            print(json.dumps({'lead_hours': lead, 'development_year': year, 'scores': entry['scores'], 'heads': heads}), flush=True)
    return {'lead_hours': lead, 'parameters': parameters, 'input_sha256': hashlib.sha256(source).hexdigest(),
            'predictions_sha256': hashlib.sha256(saved.read_bytes()).hexdigest(), 'folds': output}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--inputs', nargs='+', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    files = ['docs/model-polish-protocol.md', 'scripts/polish-fog.py', 'scripts/iterate-fog.py',
             'scripts/evaluate-fog-holdout.py', 'scripts/validate-fog.py', 'src/lib/weather/research-features.ts']
    result = {'research_only': True, 'independent_validation': False, 'uses_2025_or_2026_outcomes': False,
              'target': 'METAR prevailing visibility <550m; not RVR or flight outcomes',
              'file_sha256': {p: hashlib.sha256(Path(p).read_bytes()).hexdigest() for p in files},
              'results': [run(p) for p in args.inputs]}
    args.output.write_text(json.dumps(result, indent=2) + '\n')
