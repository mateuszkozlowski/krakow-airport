"""Frozen classifiers: 2023 fit, 2024 calibration, independent 2025 test.

python scripts/evaluate-fog-holdout.py --inputs data/extended2h.jsonl data/extended6h.jsonl --output docs/fog-holdout-2025.json
See docs/model-experiment-2025-protocol.md. Never activates a production model.
"""
import argparse
import hashlib
import json
import platform
from pathlib import Path

import numpy as np
import sklearn
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.isotonic import IsotonicRegression
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import log_loss
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

# Import the existing score/calibration/block-bootstrap definitions verbatim.
import importlib.util
spec = importlib.util.spec_from_file_location('validation', Path(__file__).with_name('validate-fog.py'))
validation = importlib.util.module_from_spec(spec)
spec.loader.exec_module(validation)
BASE = ['spread', 'temperature', 'wind', 'gust', 'visibilityLog', 'visibilityChangePerHour', 'ceiling', 'ceilingMissing', 'spreadChangePerHour', 'trendMissing', 'fog', 'mist', 'rain', 'hourSin', 'hourCos', 'monthSin', 'monthCos']


def logit(p):
    p = np.clip(p, 1e-6, 1 - 1e-6)
    return np.log(p / (1 - p)).reshape(-1, 1)


def scores(y, p):
    return {**validation.metrics(y, p), 'log_loss': float(log_loss(y, p, labels=[0, 1]))}


def thresholds(y, p):
    result = []
    for threshold in [.1, .3, .5]:
        alert = p >= threshold
        tp, fp, fn = int((alert & (y == 1)).sum()), int((alert & (y == 0)).sum()), int((~alert & (y == 1)).sum())
        result.append({'threshold': threshold, 'true_positive_readings': tp, 'false_positive_readings': fp,
                       'false_negative_readings': fn, 'precision': tp / (tp + fp) if tp + fp else None,
                       'recall': tp / (tp + fn) if tp + fn else None})
    return result


def run(path):
    raw = path.read_bytes()
    rows = sorted([json.loads(line) for line in raw.splitlines() if line.strip()], key=lambda r: r['at'])
    if len({r['at'] for r in rows}) != len(rows) or {r['featureSet'] for r in rows} != {'extended'}:
        raise ValueError('Unique issue times and extended features required')
    if len({r['leadHours'] for r in rows}) != 1:
        raise ValueError('Single lead required')
    lead = rows[0]['leadHours']
    for row in rows:
        issue, target, outcome = [validation.instant(row[k]) for k in ['at', 'target', 'outcomeObservedAt']]
        if abs((target - issue).total_seconds() - lead * 3600) > 1 or abs((outcome - target).total_seconds()) > 900 or outcome <= issue:
            raise ValueError('Noncausal or misaligned target')
    y = np.array([r['lowVisibility'] for r in rows], dtype=int)
    persistence = np.array([r['persistence'] for r in rows], dtype=float)
    if not set(y).issubset({0, 1}) or not set(persistence).issubset({0, 1}):
        raise ValueError('Nonbinary label')
    # Known labels only; buffer extends beyond timestamp matching tolerance.
    train = [i for i, r in enumerate(rows) if '2023-01-01' <= r['at'] < '2024-01-01' and r['target'] < '2023-12-31T22:00:00']
    cal = [i for i, r in enumerate(rows) if '2024-01-01' <= r['at'] < '2025-01-01' and r['target'] < '2024-12-31T22:00:00']
    test = [i for i, r in enumerate(rows) if '2025-01-01' <= r['at'] < '2026-01-01' and r['target'] < '2026-01-01']
    for indices in [train, cal, test]:
        if len(indices) < 1000 or y[indices].sum() < 30 or len(set(y[indices])) < 2:
            raise ValueError('Insufficient annual coverage/classes')
    truth = y[test]
    test_rows = [rows[i] for i in test]
    prevalence = y[train].mean()
    groups = {}
    for i in train:
        group = groups.setdefault(validation.season_hour(rows[i]), [0, 0])
        group[0] += y[i]
        group[1] += 1
    predictions = {'persistence': persistence[test], 'climatology': np.full(len(test), prevalence),
                   'season_hour': np.array([(groups.get(validation.season_hour(r), [0, 0])[0] + 50 * prevalence) /
                                             (groups.get(validation.season_hour(r), [0, 0])[1] + 50) for r in test_rows])}
    artifacts = {}
    for feature_set, names in [('base', BASE), ('extended', list(rows[0]['features']))]:
        if any(set(r['features']) != set(rows[0]['features']) for r in rows):
            raise ValueError('Feature schema drift')
        x = np.array([[r['features'][name] for name in names] for r in rows], dtype=float)
        if not np.isfinite(x).all():
            raise ValueError('Non-finite features')
        models = {'logistic': make_pipeline(StandardScaler(), LogisticRegression(max_iter=1000, random_state=42)),
                  'gradient_boosting': HistGradientBoostingClassifier(max_iter=150, max_leaf_nodes=15, min_samples_leaf=60,
                                                                     l2_regularization=10, early_stopping=False, random_state=42)}
        for algorithm, model in models.items():
            name = f'{feature_set}_{algorithm}'
            model.fit(x[train], y[train])
            pc, pt = model.predict_proba(x[cal])[:, 1], model.predict_proba(x[test])[:, 1]
            sigmoid = LogisticRegression(C=1e6, max_iter=1000, random_state=42).fit(logit(pc), y[cal])
            isotonic = IsotonicRegression(y_min=0, y_max=1, out_of_bounds='clip').fit(pc, y[cal])
            predictions[name + '_raw'] = pt
            predictions[name + '_sigmoid'] = sigmoid.predict_proba(logit(pt))[:, 1]
            predictions[name + '_isotonic'] = isotonic.predict(pt)
            artifacts[name] = {'features': names,
                               'sigmoid': {'coefficient': float(sigmoid.coef_[0, 0]), 'intercept': float(sigmoid.intercept_[0])},
                               'isotonic': {'x': isotonic.X_thresholds_.tolist(), 'y': isotonic.y_thresholds_.tolist()}}
            if algorithm == 'logistic':
                artifacts[name]['classifier'] = {'mean': model[0].mean_.tolist(), 'scale': model[0].scale_.tolist(),
                                                 'coefficients': model[1].coef_[0].tolist(), 'intercept': float(model[1].intercept_[0])}
    breakdown = {}
    for label, mask in [('onset_currently_at_least_550m', persistence[test] == 0), ('continuation_currently_below_550m', persistence[test] == 1)]:
        breakdown[label] = {'samples': int(mask.sum()), 'positive_readings': int(truth[mask].sum()),
                            'scores': {name: scores(truth[mask], p[mask]) for name, p in predictions.items()}}
    quarters = []
    for quarter in [1, 2, 3, 4]:
        mask = np.array([(int(r['at'][5:7]) - 1) // 3 + 1 == quarter for r in test_rows])
        quarters.append({'quarter': quarter, 'samples': int(mask.sum()), 'positive_readings': int(truth[mask].sum()),
                         'scores': {name: scores(truth[mask], p[mask]) for name, p in predictions.items()}})
    result = {'lead_hours': lead, 'input_sha256': hashlib.sha256(raw).hexdigest(),
              'splits': {name: {'samples': len(indices), 'positive_readings': int(y[indices].sum()),
                                'first': rows[indices[0]]['at'], 'last': rows[indices[-1]]['at']}
                         for name, indices in [('fit_2023', train), ('calibration_2024', cal), ('test_2025', test)]},
              'scores': {name: scores(truth, p) for name, p in predictions.items()},
              'calibration': {name: validation.calibration(truth, p) for name, p in predictions.items()},
              'thresholds': {name: thresholds(truth, p) for name, p in predictions.items()},
              'quarters': quarters, 'current_conditions': breakdown,
              'paired_brier_differences': {name: {ref: validation.paired_interval(truth, p, predictions[ref], test_rows)
                                                 for ref in ['persistence', 'season_hour', 'base_logistic_raw']}
                                           for name, p in predictions.items() if name not in ['persistence', 'climatology', 'season_hour']},
              'research_parameters': artifacts}
    # Keep predictions local to permit independent recomputation, not in public payloads.
    prediction_path = path.with_name(f'holdout-predictions-{lead}h.jsonl')
    with prediction_path.open('w') as f:
        for j, row in enumerate(test_rows):
            f.write(json.dumps({'at': row['at'], 'target': row['target'], 'outcomeObservedAt': row['outcomeObservedAt'],
                                'truth': int(truth[j]), 'predictions': {name: float(p[j]) for name, p in predictions.items()}}) + '\n')
    result['predictions_sha256'] = hashlib.sha256(prediction_path.read_bytes()).hexdigest()
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--inputs', type=Path, nargs='+', required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    protocol = Path('docs/model-experiment-2025-protocol.md')
    artifact = {'research_only': True, 'deployment_eligible': False,
                'target': 'METAR visibility below 550 m, not RVR or flight disruption',
                'protocol_sha256': hashlib.sha256(protocol.read_bytes()).hexdigest(),
                'implementation_sha256': {str(p): hashlib.sha256(p.read_bytes()).hexdigest() for p in
                                          [Path('scripts/evaluate-fog-holdout.py'), Path('scripts/validate-fog.py'),
                                           Path('scripts/prepare-training.ts'), Path('src/lib/weather/research-features.ts')]},
                'versions': {'python': platform.python_version(), 'numpy': np.__version__, 'sklearn': sklearn.__version__},
                'limitations': ['No EPKK historical issued TAF benchmark', 'Archive receipt timestamps unavailable',
                                'Single held-out year, dependent half-hour readings', '2025 must not be reused for tuning'],
                'results': [run(path) for path in args.inputs]}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(artifact, indent=2) + '\n')
    print(json.dumps([{'lead_hours': r['lead_hours'], 'splits': r['splits'], 'scores': r['scores']} for r in artifact['results']], indent=2))
