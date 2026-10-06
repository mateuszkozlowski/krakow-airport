"""Astronomical and missing-data counterexamples for the local hypothesis."""
import copy
import importlib.util
import math
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('local', Path(__file__).resolve().parents[1] / 'scripts/local-fog-features.py')
local = importlib.util.module_from_spec(spec)
spec.loader.exec_module(local)


def inputs():
    return {'spread': .5, 'wind': 2, 'cloudCover': 0, 'cloudCoverMissing': 0,
            'temperatureChange1h': -1, 'temperatureLagMissing1h': 0,
            'spreadChangePerHour': -.5, 'trendMissing': 0, 'rainReportShare24h': .2,
            'windowIncomplete24h': 0, 'windowCoverage24h': 1,
            'windNorth': 0, 'windEast': 2, 'windDirectionMissing': 0}


class LocalFeatures(unittest.TestCase):
    def test_solstices_follow_airport_latitude_and_daylight(self):
        summer = local.solar(local.instant('2024-06-21T10:40:00Z'))
        winter = local.solar(local.instant('2024-12-21T10:40:00Z'))
        self.assertTrue(62 < summer['elevation'] < 64)
        self.assertTrue(15 < winter['elevation'] < 18)
        self.assertTrue(16 < summer['daylight_hours'] < 17)
        self.assertTrue(7 < winter['daylight_hours'] < 9)
        self.assertFalse(summer['night'])
        shifted = local.solar(local.instant('2024-06-21T10:40:00Z'), longitude=-60)
        self.assertLess(shifted['elevation'], summer['elevation'])

    def test_offset_and_dst_representations_do_not_shift_sun(self):
        f = inputs()
        self.assertEqual(local.local_features('2024-10-27T00:30:00Z', 2, f),
                         local.local_features('2024-10-27T02:30:00+02:00', 2, f))
        self.assertEqual(local.local_features('2024-10-27T01:30:00Z', 2, f),
                         local.local_features('2024-10-27T02:30:00+01:00', 2, f))

    def test_predawn_crossing_uses_only_clock_and_preserves_inputs(self):
        f = inputs()
        original = copy.deepcopy(f)
        result = local.local_features('2024-10-01T03:00:00Z', 2, f)
        self.assertLess(result['solarElevation'], 0)
        self.assertGreater(result['targetSolarElevation'], 0)
        self.assertTrue(0 < result['nightShareToTarget'] < 1)
        self.assertEqual(result['targetDaylight'], 1)
        self.assertTrue(0 < result['hoursUntilSunrise'] < 2)
        self.assertEqual(f, original)

    def test_unknown_cloud_and_strong_wind_do_not_imply_clear_calm_cooling(self):
        f = inputs()
        night = local.local_features('2024-10-01T22:00:00Z', 2, f)
        self.assertGreater(night['nightClearCalmMoist'], 0)
        self.assertEqual(local.local_features('2024-10-01T12:00:00Z', 2, f)['nightCalmMoist'], 0)
        f['cloudCoverMissing'] = 1  # CAVOK/NSC do not establish total clear sky
        self.assertEqual(local.local_features('2024-10-01T22:00:00Z', 2, f)['nightClearCalmMoist'], 0)
        f['wind'] = 10
        self.assertEqual(local.local_features('2024-10-01T22:00:00Z', 2, f)['nightCalmMoist'], 0)

    def test_unknown_lags_and_incomplete_history_suppress_derived_terms(self):
        f = inputs()
        f.update(temperatureChange1h=-100, temperatureLagMissing1h=1,
                 spreadChangePerHour=-100, trendMissing=1, windowIncomplete24h=1)
        result = local.local_features('2024-10-01T22:00:00Z', 2, f)
        for name in ['nightCooling1h', 'nightClosingSpread', 'nightWetCalmMoist']:
            self.assertEqual(result[name], 0)

    def test_missing_or_calm_direction_is_not_a_northerly_wind(self):
        for updates in [{'windDirectionMissing': 1}, {'wind': 0, 'windEast': 0, 'windNorth': 0}]:
            f = {**inputs(), **updates}
            result = local.local_features('2024-10-01T22:00:00Z', 2, f)
            self.assertTrue(all(result[n] == 0 for n in local.TRANSPORT_NAMES))
        f = inputs()
        f.update(windNorth=2*math.cos(math.pi/8), windEast=2*math.sin(math.pi/8))
        result = local.local_features('2024-10-01T22:00:00Z', 2, f)
        self.assertGreater(result['moistWindSectorN'], 0)
        self.assertAlmostEqual(result['moistWindSectorN'], result['moistWindSectorNE'])
        self.assertTrue(all(result[n] == 0 for n in local.TRANSPORT_NAMES[2:]))

    def test_invalid_time_horizon_or_values_are_rejected(self):
        for at, lead, f in [('2024-10-01T22:00:00', 2, inputs()),
                             ('2024-10-01T22:00:00Z', 3, inputs()),
                             ('2024-10-01T22:00:00Z', 2, {**inputs(), 'wind': float('nan')})]:
            with self.assertRaises(ValueError):
                local.local_features(at, lead, f)


if __name__ == '__main__':
    unittest.main()
