"""Download EPKK METAR history from IEM; no credentials or flight data.

Usage: python scripts/download-history.py --start 2023-01-01 --end 2025-01-01 --output data/metars.jsonl
"""
import argparse
import csv
import datetime as dt
import io
import json
from pathlib import Path
import urllib.parse
import urllib.request

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--start', required=True, type=dt.date.fromisoformat)
parser.add_argument('--end', required=True, type=dt.date.fromisoformat)
parser.add_argument('--output', required=True, type=Path)
args = parser.parse_args()
if not 0 < (args.end - args.start).days <= 5 * 366:
    parser.error('Choose a positive period of at most five years.')
query = [('station', 'EPKK'), ('data', 'metar'), ('year1', str(args.start.year)), ('month1', str(args.start.month)), ('day1', str(args.start.day)), ('year2', str(args.end.year)), ('month2', str(args.end.month)), ('day2', str(args.end.day)), ('tz', 'Etc/UTC'), ('format', 'onlycomma'), ('latlon', 'no'), ('elev', 'no'), ('missing', 'M'), ('trace', 'T'), ('direct', 'no'), ('report_type', '3'), ('report_type', '4')]
url = 'https://mesonet.agron.iastate.edu/cgi-bin/request/asos.py?' + urllib.parse.urlencode(query)
with urllib.request.urlopen(url, timeout=60) as response:
    raw = response.read(32 * 1024 * 1024 + 1)
if len(raw) > 32 * 1024 * 1024:
    raise SystemExit('Response too large: download a shorter period.')
records = {}
for row in csv.DictReader(io.StringIO(raw.decode('utf-8-sig'))):
    if row.get('station') != 'EPKK' or not row.get('metar') or row['metar'] == 'M':
        continue
    try:
        at = dt.datetime.fromisoformat(row['valid']).replace(tzinfo=dt.timezone.utc).isoformat().replace('+00:00', 'Z')
    except (KeyError, ValueError):
        continue
    records[at] = {'at': at, 'raw': row['metar']}
if not records:
    raise SystemExit('No valid EPKK records returned; no output written.')
args.output.parent.mkdir(parents=True, exist_ok=True)
with args.output.open('w') as file:
    for at in sorted(records):
        file.write(json.dumps(records[at]) + '\n')
times = [dt.datetime.fromisoformat(t.replace('Z', '+00:00')) for t in sorted(records)]
gaps = sum((b - a).total_seconds() > 3600 for a, b in zip(times, times[1:]))
print(json.dumps({'records': len(records), 'first': times[0].isoformat(), 'last': times[-1].isoformat(), 'gaps_over_one_hour': gaps, 'source': url}, indent=2))
