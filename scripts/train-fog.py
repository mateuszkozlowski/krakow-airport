"""Research-only visibility model. Never activates a production predictor.

pip install -r scripts/requirements-research.txt
python scripts/train-fog.py --input data/training.jsonl --output data/fog-model.json
"""
import argparse
import datetime as dt
import json
from pathlib import Path
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import brier_score_loss, confusion_matrix
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--input', required=True, type=Path)
parser.add_argument('--output', required=True, type=Path)
parser.add_argument('--model', choices=['logistic', 'gradient-boosting'], default='logistic')
args = parser.parse_args()
rows = sorted([json.loads(line) for line in args.input.read_text().splitlines() if line.strip()], key=lambda r: r['at'])
if len(rows) < 500:
    raise SystemExit('At least 500 matched samples are required for a research run; use multiple seasons for conclusions.')
split = int(len(rows) * 0.8)
cutoff = dt.datetime.fromisoformat(rows[split]['at'].replace('Z', '+00:00'))
train = [r for r in rows[:split] if dt.datetime.fromisoformat(r['target'].replace('Z', '+00:00')) < cutoff - dt.timedelta(hours=2)]
test = rows[split:]
names = list(rows[0]['features'])
def arrays(dataset):
    x = np.array([[r['features'][name] for name in names] for r in dataset], dtype=float)
    y = np.array([r['lowVisibility'] for r in dataset], dtype=int)
    if not np.isfinite(x).all():
        raise SystemExit('Non-finite inputs: check source data before training.')
    return x, y
x_train, y_train = arrays(train)
x_test, y_test = arrays(test)
if y_train.sum() < 20 or y_test.sum() < 10 or len(set(y_train)) < 2 or len(set(y_test)) < 2:
    raise SystemExit('Too few positive/negative cases for a useful chronological test. Download a longer, seasonally representative period.')
model = make_pipeline(StandardScaler(), LogisticRegression(max_iter=1000, random_state=42)) if args.model == 'logistic' else HistGradientBoostingClassifier(max_iter=150, max_leaf_nodes=15, min_samples_leaf=60, l2_regularization=10, early_stopping=False, random_state=42)
model.fit(x_train, y_train)
probabilities = model.predict_proba(x_test)[:, 1]
persistence = np.array([r['persistence'] for r in test])
brier = brier_score_loss(y_test, probabilities)
baseline = brier_score_loss(y_test, persistence)
calibration = []
for lo in np.arange(0, 1, .1):
    mask = (probabilities >= lo) & (probabilities < lo + .1)
    if mask.sum():
        calibration.append({'range': [round(float(lo), 1), round(float(lo + .1), 1)], 'samples': int(mask.sum()), 'mean_prediction': float(probabilities[mask].mean()), 'observed_rate': float(y_test[mask].mean())})
artifact = {
    'version': 1, 'research_only': True, 'deployment_eligible': False,
    'target': 'EPKK METAR visibility below 550 m', 'lead_hours': rows[0]['leadHours'],
    'train_samples': len(train), 'test_samples': len(test), 'test_positive_cases': int(y_test.sum()),
    'test_start': test[0]['at'], 'test_end': test[-1]['at'],
    'brier': float(brier), 'persistence_brier': float(baseline), 'beats_persistence': bool(brier < baseline),
    'taf_comparison': 'not available; archived issued TAFs must be evaluated on the same targets before deployment',
    'confusion_matrix': confusion_matrix(y_test, probabilities >= .5, labels=[0, 1]).tolist(), 'calibration': calibration,
    'algorithm': args.model, 'feature_names': names,
}
if args.model == 'logistic':
    artifact.update({'mean': model[0].mean_.tolist(), 'scale': model[0].scale_.tolist(), 'coefficients': model[1].coef_[0].tolist(), 'intercept': float(model[1].intercept_[0])})
args.output.parent.mkdir(parents=True, exist_ok=True)
args.output.write_text(json.dumps(artifact, indent=2) + '\n')
print(json.dumps({k: artifact[k] for k in ['train_samples', 'test_samples', 'test_positive_cases', 'brier', 'persistence_brier', 'beats_persistence', 'deployment_eligible']}, indent=2))
