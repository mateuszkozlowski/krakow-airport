"""Walk-forward research checks on existing METAR training data.

Fixed models and three chronological quarters; no tuning on these test periods.
This reuses previously explored data and is NOT a new independent holdout.
python scripts/validate-fog.py --inputs data/training.jsonl data/training6h.jsonl --output data/fog-validation.json
"""
import argparse
import datetime as dt
import hashlib
import json
from pathlib import Path
from zoneinfo import ZoneInfo

import numpy as np
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

UTC = dt.timezone.utc
WARSAW = ZoneInfo('Europe/Warsaw')
FOLDS = [('2024-Q2', '2024-04-01', '2024-07-01'),
         ('2024-Q3', '2024-07-01', '2024-10-01'),
         ('2024-Q4', '2024-10-01', '2025-01-01')]


def instant(value):
    return dt.datetime.fromisoformat(value.replace('Z', '+00:00'))


def season_hour(row):
    # Target time is known at issue time; no future weather enters this baseline.
    local = instant(row['target']).astimezone(WARSAW)
    return local.month, local.hour // 6


def metrics(y, probabilities):
    return {'brier': float(np.mean((probabilities - y) ** 2)),
            'average_precision': float(average_precision_score(y, probabilities)) if 0 < y.sum() < len(y) else None,
            'mean_probability': float(probabilities.mean())}


def calibration(y, probabilities):
    bins = [0, .01, .05, .1, .2, .4, .6, .8, 1.000001]
    result = []
    for lo, hi in zip(bins, bins[1:]):
        mask = (probabilities >= lo) & (probabilities < hi)
        if mask.any():
            result.append({'range': [lo, min(hi, 1)], 'samples': int(mask.sum()),
                           'mean_probability': float(probabilities[mask].mean()),
                           'observed_rate': float(y[mask].mean())})
    return result


def paired_interval(y, model, reference, rows):
    # Resample whole calendar weeks to retain within-episode dependence.
    # This describes score uncertainty on frozen predictions, not retraining uncertainty.
    groups = {}
    for i, row in enumerate(rows):
        local_date = instant(row['target']).astimezone(WARSAW).date()
        monday = local_date - dt.timedelta(days=local_date.weekday())
        groups.setdefault(monday, []).append(i)
    differences = (model - y) ** 2 - (reference - y) ** 2
    sums = np.array([differences[indices].sum() for indices in groups.values()])
    counts = np.array([len(indices) for indices in groups.values()])
    rng = np.random.default_rng(42)
    sampled = rng.integers(0, len(sums), size=(1000, len(sums)))
    scores = sums[sampled].sum(axis=1) / counts[sampled].sum(axis=1)
    return {'difference': float(differences.mean()),
            'week_blocks': len(groups),
            'bootstrap_95_percent_interval': np.quantile(scores, [.025, .975]).tolist()}


def evaluate_file(path):
    raw = path.read_bytes()
    rows = sorted([json.loads(line) for line in raw.splitlines() if line.strip()], key=lambda row: row['at'])
    if len(rows) < 500 or len({r['at'] for r in rows}) != len(rows):
        raise ValueError('Need at least 500 unique issue times')
    leads = {r['leadHours'] for r in rows}
    if len(leads) != 1 or not 1 <= next(iter(leads)) <= 12:
        raise ValueError('Each file must have a single horizon between 1 and 12 hours')
    names = list(rows[0]['features'])
    x = np.array([[r['features'][name] for name in names] for r in rows], dtype=float)
    y = np.array([r['lowVisibility'] for r in rows], dtype=int)
    persistence = np.array([r['persistence'] for r in rows], dtype=float)
    if not np.isfinite(x).all() or not set(y).issubset({0, 1}) or not set(persistence).issubset({0, 1}):
        raise ValueError('Non-finite or invalid inputs')
    issues = [instant(r['at']) for r in rows]
    targets = [instant(r['target']) for r in rows]
    if any(target <= issue for target, issue in zip(targets, issues)):
        raise ValueError('Targets must occur after issue time')
    output = []
    pooled_rows, pooled_y = [], []
    pooled = {key: [] for key in ['logistic', 'gradient_boosting', 'persistence', 'climatology', 'season_hour']}
    for label, start, end in FOLDS:
        start, end = instant(start).replace(tzinfo=UTC), instant(end).replace(tzinfo=UTC)
        training = [i for i in range(len(rows)) if issues[i] < start and targets[i] < start - dt.timedelta(hours=2)]
        testing = [i for i in range(len(rows)) if start <= issues[i] < end and targets[i] < end]
        if not testing or len(training) < 500 or y[training].sum() < 20 or len(set(y[training])) < 2:
            raise ValueError(f'Insufficient data for {label}')
        test_rows = [rows[i] for i in testing]
        truth = y[testing]
        prevalence = y[training].mean()
        groups = {}
        for i in training:
            group = groups.setdefault(season_hour(rows[i]), [0, 0])
            group[0] += y[i]
            group[1] += 1
        # Prespecified shrinkage of 50 observations towards training prevalence.
        seasonal = np.array([(groups.get(season_hour(r), [0, 0])[0] + 50 * prevalence) /
                             (groups.get(season_hour(r), [0, 0])[1] + 50) for r in test_rows])
        predictions = {'persistence': persistence[testing], 'climatology': np.full(len(testing), prevalence), 'season_hour': seasonal}
        models = {
            'logistic': make_pipeline(StandardScaler(), LogisticRegression(max_iter=1000, random_state=42)),
            'gradient_boosting': HistGradientBoostingClassifier(max_iter=150, max_leaf_nodes=15, min_samples_leaf=60, l2_regularization=10, early_stopping=False, random_state=42),
        }
        for name, model in models.items():
            model.fit(x[training], y[training])
            predictions[name] = model.predict_proba(x[testing])[:, 1]
        breakdown = {}
        for label_segment, mask in [('currently_below_550m', persistence[testing] == 1), ('currently_at_least_550m', persistence[testing] == 0)]:
            breakdown[label_segment] = {'samples': int(mask.sum()), 'target_positive_cases': int(truth[mask].sum()),
                                        'scores': {name: metrics(truth[mask], p[mask]) for name, p in predictions.items()} if mask.any() else None}
        output.append({'quarter': label, 'train_samples': len(training), 'test_samples': len(testing),
                       'test_start': test_rows[0]['at'], 'test_end': test_rows[-1]['at'],
                       'positive_cases': int(truth.sum()), 'event_rate': float(truth.mean()),
                       'scores': {name: metrics(truth, p) for name, p in predictions.items()},
                       'calibration': {name: calibration(truth, predictions[name]) for name in models},
                       'current_conditions': breakdown})
        pooled_rows.extend(test_rows)
        pooled_y.extend(truth.tolist())
        for name, values in predictions.items():
            pooled[name].extend(values.tolist())
    truth = np.array(pooled_y)
    predictions = {name: np.array(p) for name, p in pooled.items()}
    intervals = {name: {reference: paired_interval(truth, predictions[name], predictions[reference], pooled_rows)
                       for reference in ['persistence', 'climatology', 'season_hour']}
                 for name in ['logistic', 'gradient_boosting']}
    return {'lead_hours': next(iter(leads)), 'input': str(path), 'input_sha256': hashlib.sha256(raw).hexdigest(),
            'folds': output, 'pooled': {'samples': len(truth), 'positive_cases': int(truth.sum()),
                                      'event_rate': float(truth.mean()),
                                      'scores': {name: metrics(truth, p) for name, p in predictions.items()},
                                      'paired_brier_differences': intervals,
                                      'calibration': {name: calibration(truth, predictions[name]) for name in ['logistic', 'gradient_boosting']}}}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--inputs', required=True, type=Path, nargs='+')
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    artifact = {'research_only': True, 'deployment_eligible': False,
                'target': 'METAR visibility below 550 m; not RVR or a flight outcome',
                'method': 'Expanding chronological training, fixed parameters, target purging and three 2024 quarters; previously explored data, not an independent holdout',
                'bootstrap': '1000 paired calendar-week block resamples; score differences below zero favour the model',
                'taf_comparison': 'Unavailable: issued historical TAFs required',
                'results': [evaluate_file(path) for path in args.inputs]}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(artifact, indent=2) + '\n')
    print(json.dumps([{'lead_hours': r['lead_hours'], **r['pooled']} for r in artifact['results']], indent=2))
