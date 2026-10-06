"""Location-informed research inputs; no measurements after the issue time.

Solar approximation: https://gml.noaa.gov/grad/solcalc/solareqns.PDF.
Flat horizon, no terrain shadow/refraction model beyond the -0.833° threshold.
Cooling/transport terms are hypotheses, not measurements of inversion or UHI.
"""
import calendar
import datetime as dt
import math

LATITUDE = 50.078
LONGITUDE = 19.785
SOLAR_NAMES = [
    'solarElevation', 'targetSolarElevation', 'solarElevationChangePerHour',
    'nightShareToTarget', 'hoursSinceSunset', 'hoursUntilSunrise',
    'daylightHours', 'targetDaylight',
]
COOLING_NAMES = [
    'nightCalmMoist', 'nightClearCalmMoist', 'nightCooling1h',
    'nightClosingSpread', 'nightWetCalmMoist', 'solarRecoveryVentilation',
]
TRANSPORT_NAMES = ['moistWindSector' + s for s in ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']]
FAMILIES = {
    'base': [],
    'solar': SOLAR_NAMES,
    'solar_cooling': SOLAR_NAMES + COOLING_NAMES,
    'solar_transport': SOLAR_NAMES + TRANSPORT_NAMES,
    'solar_full': SOLAR_NAMES + COOLING_NAMES + TRANSPORT_NAMES,
}


def instant(value):
    value = dt.datetime.fromisoformat(value.replace('Z', '+00:00'))
    if value.tzinfo is None:
        raise ValueError('An explicit time zone is required')
    return value.astimezone(dt.timezone.utc)


def solar(at, latitude=LATITUDE, longitude=LONGITUDE):
    if at.tzinfo is None or not (-66 < latitude < 66 and -180 <= longitude <= 180):
        raise ValueError('Non-polar location and aware timestamp required')
    at = at.astimezone(dt.timezone.utc)
    utc_hour = at.hour + at.minute / 60 + at.second / 3600
    gamma = 2 * math.pi / (366 if calendar.isleap(at.year) else 365) * (at.timetuple().tm_yday - 1 + (utc_hour - 12) / 24)
    eqtime = 229.18 * (.000075 + .001868 * math.cos(gamma) - .032077 * math.sin(gamma)
                      - .014615 * math.cos(2 * gamma) - .040849 * math.sin(2 * gamma))
    declination = (.006918 - .399912 * math.cos(gamma) + .070257 * math.sin(gamma)
                   - .006758 * math.cos(2 * gamma) + .000907 * math.sin(2 * gamma)
                   - .002697 * math.cos(3 * gamma) + .00148 * math.sin(3 * gamma))
    lat = math.radians(latitude)
    solar_hour = ((utc_hour * 60 + eqtime + 4 * longitude) % 1440) / 60
    hour_angle = math.radians(15 * solar_hour - 180)
    sine = math.sin(lat) * math.sin(declination) + math.cos(lat) * math.cos(declination) * math.cos(hour_angle)
    elevation = math.degrees(math.asin(max(-1, min(1, sine))))
    sunrise_cos = ((math.sin(math.radians(-.833)) - math.sin(lat) * math.sin(declination))
                   / (math.cos(lat) * math.cos(declination)))
    if not -1 < sunrise_cos < 1:
        raise ValueError('Polar day/night not supported')
    half_day = math.degrees(math.acos(sunrise_cos)) / 15
    night = elevation < -.833
    return {
        'elevation': elevation,
        'night': night,
        'daylight_hours': 2 * half_day,
        'since_sunset': (solar_hour - (12 + half_day)) % 24 if night else 0,
        'until_sunrise': ((12 - half_day) - solar_hour) % 24 if night else 0,
    }


def local_features(at, lead, features, latitude=LATITUDE, longitude=LONGITUDE):
    if lead not in [2, 6] or not all(math.isfinite(v) for v in features.values()):
        raise ValueError('Finite features and a 2/6h horizon are required')
    at = instant(at)
    moments = [solar(at + dt.timedelta(hours=lead * i / 6), latitude, longitude) for i in range(7)]
    now, target = moments[0], moments[-1]
    night_share = sum(m['night'] * (.5 if i in [0, 6] else 1) for i, m in enumerate(moments)) / 6
    f = {
        'solarElevation': now['elevation'],
        'targetSolarElevation': target['elevation'],
        'solarElevationChangePerHour': (target['elevation'] - now['elevation']) / lead,
        'nightShareToTarget': night_share,
        'hoursSinceSunset': now['since_sunset'],
        'hoursUntilSunrise': now['until_sunrise'],
        'daylightHours': now['daylight_hours'],
        'targetDaylight': float(not target['night']),
    }
    wind = max(0, features['wind'])  # knots, matching the METAR features
    calm = max(0, 1 - wind / 5)
    moist = math.exp(-max(0, features['spread']) / 2)
    cooling = night_share * calm * moist
    clear = max(0, 1 - features['cloudCover'] / 8) if not features['cloudCoverMissing'] else 0
    temperature_fall = max(0, -features['temperatureChange1h']) if not features['temperatureLagMissing1h'] else 0
    closing = max(0, -features['spreadChangePerHour']) if not features['trendMissing'] else 0
    wet = features['rainReportShare24h'] if not features['windowIncomplete24h'] and features['windowCoverage24h'] >= .8 else 0
    f.update({
        'nightCalmMoist': cooling,
        'nightClearCalmMoist': cooling * clear,
        'nightCooling1h': float(now['night']) * calm * moist * temperature_fall,
        'nightClosingSpread': float(now['night']) * calm * moist * closing,
        'nightWetCalmMoist': cooling * wet,
        'solarRecoveryVentilation': float(not target['night']) * max(0, target['elevation'] - now['elevation']) / 90 * min(1, wind / 5),
    })
    known_direction = not features['windDirectionMissing'] and wind > 0
    direction = math.degrees(math.atan2(features['windEast'], features['windNorth'])) % 360 if known_direction else 0
    transport = moist * (.25 + .75 * night_share) * min(1, wind / 5) * math.exp(-wind / 12)
    for i, name in enumerate(TRANSPORT_NAMES):
        distance = abs((direction - i * 45 + 180) % 360 - 180)
        f[name] = transport * max(0, 1 - distance / 45) if known_direction else 0
    if set(f) != set(SOLAR_NAMES + COOLING_NAMES + TRANSPORT_NAMES) or not all(math.isfinite(v) for v in f.values()):
        raise ValueError('Invalid local feature schema')
    return f
