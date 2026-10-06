"""Export the already frozen 2h logistic candidate for prospective comparison.

No training, threshold tuning or public risk activation. Reject changed lineage;
create small Python-reference fixtures for cross-language inference checks.
"""
import hashlib
import json
from pathlib import Path

report_path = Path('docs/fog-iterations-2026.json')
source = json.loads(report_path.read_text())
for name, expected in source['implementation_sha256'].items():
    if hashlib.sha256(Path(name).read_bytes()).hexdigest() != expected:
        raise ValueError(f'Changed model lineage: {name}')
protocol = Path('docs/model-iterations-2026-protocol.md')
if hashlib.sha256(protocol.read_bytes()).hexdigest() != source['protocol_sha256']:
    raise ValueError('Changed experiment protocol')
r = next(r for r in source['results'] if r['lead_hours'] == 2)
if r['selection']['name'] != 'extended_logistic_C0.01' or len(r['classifier']['features']) != 58 or r['sigmoid']['coefficient'] <= 0:
    raise ValueError('Unexpected candidate')
artifact = {'schemaVersion': 1, 'id': 'epkk-vis550-2h-20261006-v1', 'use': 'prospective-evaluation-only',
            'leadHours': 2, 'thresholdMetres': 550,
            'training': r['splits']['final_fit'], 'calibration': r['splits']['final_calibration'],
            'reportSha256': hashlib.sha256(report_path.read_bytes()).hexdigest(),
            'featuresSha256': source['implementation_sha256']['src/lib/weather/research-features.ts'],
            'classifier': r['classifier'], 'sigmoid': r['sigmoid']}
destination = Path('src/lib/weather/artifacts/fog-2h-v1.json')
destination.parent.mkdir(parents=True, exist_ok=True)
destination.write_text(json.dumps(artifact, indent=2) + '\n')
predictions = Path('data/iteration-predictions-2h.jsonl')
if hashlib.sha256(predictions.read_bytes()).hexdigest() != r['predictions_sha256']:
    raise ValueError('Changed reference predictions')
all_predictions = [json.loads(line) for line in predictions.read_text().splitlines()]
ordered = sorted(all_predictions, key=lambda p: p['predictions']['selected_sigmoid'])
selected = {p['at']: p for p in ordered[::max(1, len(ordered)//12)] + [ordered[0], ordered[-1]]}
inputs = Path('data/iterations2h.jsonl')
if hashlib.sha256(inputs.read_bytes()).hexdigest() != r['input_sha256']:
    raise ValueError('Changed reference features')
fixtures = []
with inputs.open() as file:
    for line in file:
        row = json.loads(line)
        if row['at'] in selected:
            fixtures.append({'at': row['at'], 'features': row['features'],
                             'expectedProbability': selected[row['at']]['predictions']['selected_sigmoid']})
if len(fixtures) != len(selected):
    raise ValueError('Missing fixture')
Path('tests/fixtures').mkdir(exist_ok=True)
Path('tests/fixtures/fog-2h-parity.json').write_text(json.dumps(fixtures, indent=2) + '\n')
print(json.dumps({'model': artifact['id'], 'references': len(fixtures), 'source_report_sha256': artifact['reportSha256']}))
