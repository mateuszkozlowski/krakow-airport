"""Compare prespecified candidates on 2023; freeze one before testing 2026 Q1-Q3.

See docs/model-iterations-2026-protocol.md. Research only; never changes public risk.
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path

import numpy as np
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

spec = importlib.util.spec_from_file_location('holdout', Path(__file__).with_name('evaluate-fog-holdout.py'))
holdout = importlib.util.module_from_spec(spec)
spec.loader.exec_module(holdout)


def classifier(parameters):
    if parameters['algorithm'] == 'logistic':
        return make_pipeline(StandardScaler(), LogisticRegression(C=parameters['C'], max_iter=1000, random_state=42))
    return HistGradientBoostingClassifier(**{k: v for k, v in parameters.items() if k != 'algorithm'}, early_stopping=False, random_state=42)


def candidates():
    for features in ['base', 'extended']:
        for c in [.01, .1, 1]:
            yield f'{features}_logistic_C{c}', features, {'algorithm': 'logistic', 'C': c}
        for name, parameters in [('original', {'max_iter': 150, 'max_leaf_nodes': 15, 'min_samples_leaf': 60, 'l2_regularization': 10}),
                                 ('conservative', {'max_iter': 100, 'max_leaf_nodes': 7, 'min_samples_leaf': 120, 'l2_regularization': 20})]:
            yield f'{features}_boosting_{name}', features, {'algorithm': 'gradient_boosting', **parameters}


def calibrate(model, x, y, cal, testing):
    pc = model.predict_proba(x[cal])[:, 1]
    calibrator = LogisticRegression(C=1e6, max_iter=1000, random_state=42).fit(holdout.logit(pc), y[cal])
    raw = model.predict_proba(x[testing])[:, 1]
    return raw, calibrator.predict_proba(holdout.logit(raw))[:, 1], calibrator


def run(path):
    raw_bytes = path.read_bytes()
    rows = sorted([json.loads(line) for line in raw_bytes.splitlines() if line.strip()], key=lambda r: r['at'])
    if len({r['at'] for r in rows}) != len(rows) or any(r['at'].startswith('2025') for r in rows):
        raise ValueError('Unique issues required, and 2025 must be excluded')
    if len({r['leadHours'] for r in rows}) != 1 or {r['featureSet'] for r in rows} != {'extended'}:
        raise ValueError('Single horizon and extended features required')
    lead = rows[0]['leadHours']
    names = list(rows[0]['features'])
    if any(set(r['features']) != set(names) for r in rows):
        raise ValueError('Schema drift')
    x = {'extended': np.array([[r['features'][n] for n in names] for r in rows], dtype=float),
         'base': np.array([[r['features'][n] for n in holdout.BASE] for r in rows], dtype=float)}
    y = np.array([r['lowVisibility'] for r in rows], dtype=int)
    if not all(np.isfinite(a).all() for a in x.values()) or not set(y).issubset({0, 1}):
        raise ValueError('Invalid inputs')
    for r in rows:
        issue, target, outcome = [holdout.validation.instant(r[k]) for k in ['at', 'target', 'outcomeObservedAt']]
        if abs((target - issue).total_seconds() - lead * 3600) > 1 or abs((outcome - target).total_seconds()) > 900 or outcome <= issue:
            raise ValueError('Misaligned or noncausal target')

    def indices(start, end, purge=True):
        boundary = holdout.validation.instant(end).replace(tzinfo=holdout.validation.UTC)
        cutoff = boundary - holdout.validation.dt.timedelta(hours=2 if purge else 0)
        return [i for i, r in enumerate(rows) if start <= r['at'] < end and holdout.validation.instant(r['target']) < cutoff]

    fit_dev = indices('2018-01-01', '2022-01-01')
    cal_dev = indices('2022-01-01', '2023-01-01')
    dev = indices('2023-01-01', '2024-01-01')
    fit_final = indices('2018-01-01', '2024-01-01')
    cal_final = indices('2024-01-01', '2025-01-01')
    testing = indices('2026-01-01', '2026-10-01', False)
    for split in [fit_dev, cal_dev, dev, fit_final, cal_final, testing]:
        if len(split) < 1000 or y[split].sum() < 10 or len(set(y[split])) < 2:
            raise ValueError('Too little coverage or too few positive readings')
    output = []
    for name, features, parameters in candidates():
        model = classifier(parameters).fit(x[features][fit_dev], y[fit_dev])
        raw, calibrated, _ = calibrate(model, x[features], y, cal_dev, dev)
        entry = {'name': name, 'feature_set': features, 'parameters': parameters,
                 'raw': holdout.scores(y[dev], raw), 'calibrated': holdout.scores(y[dev], calibrated)}
        output.append(entry)
        print(json.dumps({'lead_hours': lead, 'development_candidate': name, 'brier': entry['calibrated']['brier']}), flush=True)
    selected = min(output, key=lambda c: c['calibrated']['brier'])
    print(json.dumps({'lead_hours': lead, 'selected_before_test': selected['name']}), flush=True)
    model = classifier(selected['parameters']).fit(x[selected['feature_set']][fit_final], y[fit_final])
    raw, calibrated, calibrator = calibrate(model, x[selected['feature_set']], y, cal_final, testing)
    truth, test_rows = y[testing], [rows[i] for i in testing]
    frozen = json.loads(Path('docs/fog-holdout-2025.json').read_text())
    reference = next(r for r in frozen['results'] if r['lead_hours'] == lead)['research_parameters']['base_logistic']
    coef = reference['classifier']
    scaled = (x['base'][testing] - np.array(coef['mean'])) / np.array(coef['scale'])
    linear = scaled @ np.array(coef['coefficients']) + coef['intercept']
    frozen_raw = 1 / (1 + np.exp(-np.clip(linear, -700, 700)))
    frozen_score = reference['sigmoid']['coefficient'] * holdout.logit(frozen_raw).ravel() + reference['sigmoid']['intercept']
    frozen_p = 1 / (1 + np.exp(-np.clip(frozen_score, -700, 700)))
    prevalence = float(y[fit_final].mean())
    groups = {}
    for i in fit_final:
        group = groups.setdefault(holdout.validation.season_hour(rows[i]), [0, 0])
        group[0] += int(y[i])
        group[1] += 1
    seasonal = np.array([(groups.get(holdout.validation.season_hour(r), [0, 0])[0] + 50 * prevalence) /
                         (groups.get(holdout.validation.season_hour(r), [0, 0])[1] + 50) for r in test_rows])
    predictions = {'selected_raw': raw, 'selected_sigmoid': calibrated, 'frozen_2023_sigmoid': frozen_p,
                   'persistence': np.array([r['persistence'] for r in test_rows]),
                   'climatology': np.full(len(testing), prevalence), 'season_hour': seasonal}
    quarters = []
    for quarter in [1, 2, 3]:
        mask = np.array([(int(r['at'][5:7]) - 1) // 3 + 1 == quarter for r in test_rows])
        quarters.append({'quarter': quarter, 'samples': int(mask.sum()), 'positive_readings': int(truth[mask].sum()),
                         'scores': {name: holdout.scores(truth[mask], p[mask]) for name, p in predictions.items()}})
    breakdown = {}
    for label, mask in [('currently_at_least_550m', predictions['persistence'] == 0), ('currently_below_550m', predictions['persistence'] == 1)]:
        breakdown[label] = {'samples': int(mask.sum()), 'positive_readings': int(truth[mask].sum()),
                            'scores': {name: holdout.scores(truth[mask], p[mask]) for name, p in predictions.items()},
                            'thresholds': {name: holdout.thresholds(truth[mask], p[mask]) for name, p in predictions.items()}}
    artifact = {'lead_hours': lead, 'input_sha256': hashlib.sha256(raw_bytes).hexdigest(),
                'splits': {name: {'samples': len(s), 'positive_readings': int(y[s].sum()), 'first': rows[s[0]]['at'], 'last': rows[s[-1]]['at']}
                           for name, s in [('development_fit', fit_dev), ('development_calibration', cal_dev), ('development_2023', dev),
                                           ('final_fit', fit_final), ('final_calibration', cal_final), ('test_2026', testing)]},
                'development_candidates': output, 'selection': selected,
                'scores': {name: holdout.scores(truth, p) for name, p in predictions.items()},
                'calibration': {name: holdout.validation.calibration(truth, p) for name, p in predictions.items()},
                'thresholds': {name: holdout.thresholds(truth, p) for name, p in predictions.items()},
                'current_conditions': breakdown, 'quarters': quarters,
                'paired_brier_differences': {ref: holdout.validation.paired_interval(truth, calibrated, predictions[ref], test_rows)
                                            for ref in ['frozen_2023_sigmoid', 'persistence', 'season_hour']},
                'sigmoid': {'coefficient': float(calibrator.coef_[0, 0]), 'intercept': float(calibrator.intercept_[0])}}
    if selected['parameters']['algorithm'] == 'logistic':
        artifact['classifier'] = {'features': holdout.BASE if selected['feature_set'] == 'base' else names,
                                  'mean': model[0].mean_.tolist(), 'scale': model[0].scale_.tolist(),
                                  'coefficients': model[1].coef_[0].tolist(), 'intercept': float(model[1].intercept_[0])}
    p = path.with_name(f'iteration-predictions-{lead}h.jsonl')
    with p.open('w') as f:
        for j, row in enumerate(test_rows):
            f.write(json.dumps({'at': row['at'], 'target': row['target'], 'truth': int(truth[j]),
                                'predictions': {name: float(values[j]) for name, values in predictions.items()}}) + '\n')
    artifact['predictions_sha256'] = hashlib.sha256(p.read_bytes()).hexdigest()
    print(json.dumps({'lead_hours': lead, 'test_scores': artifact['scores']}), flush=True)
    return artifact


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--inputs', type=Path, nargs='+', required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    protocol = Path('docs/model-iterations-2026-protocol.md')
    sources = [Path('scripts/iterate-fog.py'), Path('scripts/evaluate-fog-holdout.py'), Path('scripts/validate-fog.py'),
               Path('src/lib/weather/research-features.ts'), Path('scripts/prepare-training.ts'), Path('docs/fog-holdout-2025.json')]
    artifact = {'research_only': True, 'deployment_eligible': False,
                'protocol_sha256': hashlib.sha256(protocol.read_bytes()).hexdigest(),
                'implementation_sha256': {str(p): hashlib.sha256(p.read_bytes()).hexdigest() for p in sources},
                'target': 'METAR prevailing visibility below 550 m, not RVR or a flight outcome',
                'limitations': ['Incomplete 2026 season: Q4 omitted', 'No issued EPKK TAF benchmark',
                                'Observation receipt times unavailable', 'Dependent half-hour readings'],
                'verification_note': 'Rerun after correcting lexical ISO timestamp comparison at strict purge boundaries; same protocol, candidates and selection rule, no held-out-score tuning.',
                'results': [run(p) for p in args.inputs]}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(artifact, indent=2) + '\n')
