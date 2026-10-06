"""Prespecified ablation of local hypotheses on development years only.

See docs/local-fog-protocol.md. Does not export a model or change public scores.
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path

import numpy as np


def module(name, filename):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(filename))
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


polish = module('polish', 'polish-fog.py')
local = module('local', 'local-fog-features.py')
iterations, metrics, instant = polish.iterations, polish.metrics, polish.instant


def paired_days(rows, truth, candidate, base):
    sums = {}
    for r, y, p, b in zip(rows, truth, candidate, base):
        day = r['at'][:10]
        pair = sums.setdefault(day, [0., 0])
        pair[0] += (p-y)**2 - (b-y)**2
        pair[1] += 1
    blocks = np.array(list(sums.values()))
    rng = np.random.default_rng(42)
    differences = []
    for _ in range(500):
        selected = blocks[rng.integers(0, len(blocks), len(blocks))]
        differences.append(selected[:, 0].sum() / selected[:, 1].sum())
    return {'days': len(blocks), 'difference': float(np.mean((candidate-truth)**2 - (base-truth)**2)),
            'paired_day_bootstrap_95_percent_interval': np.quantile(differences, [.025, .975]).tolist()}


def run(path):
    source = path.read_bytes()
    rows = sorted([r for line in source.splitlines() if line.strip()
                   if (r := json.loads(line))['at'] < '2025-01-01'], key=lambda r: r['at'])
    lead = rows[0]['leadHours']
    if lead not in [2, 6] or any(r['leadHours'] != lead or r['featureSet'] != 'extended' for r in rows):
        raise ValueError('Invalid input horizon/schema')
    if len({r['at'] for r in rows}) != len(rows):
        raise ValueError('Duplicate issue times')
    base_names = list(rows[0]['features'])
    if any(set(r['features']) != set(base_names) for r in rows):
        raise ValueError('Feature schema drift')
    for r in rows:
        at, target, outcome = [instant(r[k]) for k in ['at', 'target', 'outcomeObservedAt']]
        if abs((target-at).total_seconds() - lead*3600) > 1 or abs((outcome-target).total_seconds()) > 900 or outcome <= at:
            raise ValueError('Misaligned target')
    added = [local.local_features(r['at'], lead, r['features']) for r in rows]
    x = {family: np.array([[r['features'][n] for n in base_names] + [f[n] for n in names]
                           for r, f in zip(rows, added)], dtype=float)
         for family, names in local.FAMILIES.items()}
    y = np.array([r['lowVisibility'] for r in rows], dtype=int)
    state = np.array([r['persistence'] for r in rows], dtype=int)
    if not all(np.isfinite(a).all() for a in x.values()) or not set(y).issubset({0, 1}) or not set(state).issubset({0, 1}):
        raise ValueError('Invalid features/outcomes')
    parameters = {'algorithm': 'logistic', 'C': .01} if lead == 2 else {
        'algorithm': 'gradient_boosting', 'max_iter': 150, 'max_leaf_nodes': 15, 'min_samples_leaf': 60, 'l2_regularization': 10}

    def split(start, end):
        cutoff = instant(end + 'T00:00:00Z') - metrics.validation.dt.timedelta(hours=2)
        return np.array([i for i, r in enumerate(rows) if start <= r['at'] < end and instant(r['target']) < cutoff], dtype=int)

    output = []
    saved = path.with_name(f'local-predictions-{lead}h.jsonl')
    with saved.open('w') as stream:
        for year in [2022, 2023, 2024]:
            fit = split('2018-01-01', f'{year - 1}-01-01')
            calibration = split(f'{year - 1}-01-01', f'{year}-01-01')
            testing = split(f'{year}-01-01', f'{year + 1}-01-01')
            truth, eval_rows = y[testing], [rows[i] for i in testing]
            predictions = {}
            for name, features in x.items():
                model = iterations.classifier(parameters).fit(features[fit], y[fit])
                _, p, _ = iterations.calibrate(model, features, y, calibration, testing)
                predictions[name] = p
                print(json.dumps({'lead_hours': lead, 'year': year, 'family': name, 'samples': len(testing),
                                  'scores': metrics.scores(truth, p)}), flush=True)
            predictions['persistence'] = state[testing]
            entry = {
                'year': year,
                'splits': {name: {'samples': len(a), 'positive_readings': int(y[a].sum()),
                                 'first': rows[a[0]]['at'], 'last': rows[a[-1]]['at']}
                           for name, a in [('fit', fit), ('calibration', calibration), ('development_check', testing)]},
                'scores': {k: metrics.scores(truth, p) for k, p in predictions.items()},
                'thresholds': {k: metrics.thresholds(truth, p) for k, p in predictions.items()},
                'paired_difference_vs_base': {k: paired_days(eval_rows, truth, p, predictions['base'])
                                              for k, p in predictions.items() if k not in ['base', 'persistence']},
                'current_conditions': {},
                'episodes': {k: [polish.episodes(eval_rows, p, t) for t in [.1, .3, .5]] for k, p in predictions.items()},
            }
            for s in [0, 1]:
                mask = state[testing] == s
                entry['current_conditions']['currently_below_550m' if s else 'currently_at_least_550m'] = {
                    'samples': int(mask.sum()), 'positive_readings': int(truth[mask].sum()),
                    'scores': {k: metrics.scores(truth[mask], p[mask]) for k, p in predictions.items()},
                    'thresholds': {k: metrics.thresholds(truth[mask], p[mask]) for k, p in predictions.items()},
                }
            output.append(entry)
            for j, r in enumerate(eval_rows):
                stream.write(json.dumps({'at': r['at'], 'target': r['target'], 'outcomeObservedAt': r['outcomeObservedAt'],
                                         'persistence': r['persistence'], 'truth': int(truth[j]), 'year': year,
                                         'predictions': {k: float(p[j]) for k, p in predictions.items()}}) + '\n')
    return {'lead_hours': lead, 'parameters': parameters, 'input_sha256': hashlib.sha256(source).hexdigest(),
            'feature_sets': {k: base_names + names for k, names in local.FAMILIES.items()},
            'predictions_sha256': hashlib.sha256(saved.read_bytes()).hexdigest(), 'folds': output}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--inputs', nargs='+', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    files = ['docs/local-fog-protocol.md', 'scripts/evaluate-local-fog.py', 'scripts/local-fog-features.py',
             'scripts/polish-fog.py', 'scripts/iterate-fog.py', 'scripts/evaluate-fog-holdout.py',
             'scripts/validate-fog.py', 'src/lib/weather/research-features.ts']
    result = {'research_only': True, 'independent_validation': False, 'uses_2025_or_2026_outcomes': False,
              'location': {'latitude': local.LATITUDE, 'longitude': local.LONGITUDE, 'flat_horizon': True},
              'target': 'METAR prevailing visibility <550m; not RVR, UHI, inversion or flight outcomes',
              'file_sha256': {p: hashlib.sha256(Path(p).read_bytes()).hexdigest() for p in files},
              'results': [run(p) for p in args.inputs]}
    args.output.write_text(json.dumps(result, indent=2) + '\n')
