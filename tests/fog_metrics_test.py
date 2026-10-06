"""Counterexamples for event accounting; not tests mirroring fit parameters."""
import datetime as dt
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('polish', Path(__file__).resolve().parents[1] / 'scripts/polish-fog.py')
polish = importlib.util.module_from_spec(spec)
spec.loader.exec_module(polish)


def rows(minutes_and_labels):
    start = dt.datetime(2022, 1, 1, 8, tzinfo=dt.timezone.utc)
    iso = lambda value: value.isoformat().replace('+00:00', 'Z')
    return [{'at': iso(start + dt.timedelta(minutes=m-120)), 'outcomeObservedAt': iso(start + dt.timedelta(minutes=m)),
             'lowVisibility': low, 'persistence': 0} for m, low in minutes_and_labels]


class FogMetrics(unittest.TestCase):
    def test_gaps_and_left_censoring_do_not_invent_onsets(self):
        data = rows([(0, 1), (30, 1), (60, 0), (90, 1), (120, 0), (210, 1), (240, 1), (270, 0), (300, 1)])
        result = polish.episodes(data, [.8]*len(data), .3)
        self.assertEqual(result['confirmed_onsets'], 2)
        self.assertEqual(result['onsets_with_forecast'], 2)
        self.assertEqual(result['onsets_detected_before_start'], 2)

    def test_warning_after_start_does_not_count_as_onset_prediction(self):
        data = rows([(0, 0), (30, 1), (60, 1), (90, 1), (120, 1), (150, 1), (180, 1), (210, 0)])
        # The alarm at issue time 08:30 predicts a later low reading, but the
        # event has already begun at 08:30. Earlier forecasts are below threshold.
        result = polish.episodes(data, [.01, .01, .01, .01, .01, .8, .8, .01], .3)
        self.assertEqual(result['confirmed_onsets'], 1)
        self.assertEqual(result['onsets_with_forecast'], 1)
        self.assertEqual(result['onsets_detected_before_start'], 0)
        self.assertIsNone(result['median_earliest_warning_minutes'])

    def test_false_readings_form_clusters_without_bridging_gaps_or_true_cases(self):
        data = rows([(0, 0), (30, 0), (60, 0), (90, 0), (180, 0), (210, 1), (240, 0)])
        result = polish.episodes(data, [.8, .8, .01, .8, .8, .8, .8], .3)
        self.assertEqual(result['false_alarm_clusters_currently_clear'], 4)

    def test_conflicting_duplicate_verification_is_rejected(self):
        data = rows([(0, 0), (0, 1)])
        with self.assertRaises(ValueError):
            polish.episodes(data, [.1, .9], .3)


if __name__ == '__main__':
    unittest.main()
