import { test } from "node:test";
import assert from "node:assert/strict";
import { zipSync, strToU8 } from "fflate";
import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import { csvRows, gtfsSeconds, importGtfs } from "../src/lib/transport/gtfs";
import {
  planJourney,
  serviceAnchor,
  serviceRuns,
} from "../src/lib/transport/engine";
import {
  defaultQuery,
  parseQuery,
  resolveFlight,
  queryForFlight,
} from "../src/lib/transport/query";
import { connectionWeather } from "../src/lib/transport/weather";
import { observation } from "../src/lib/weather/parse";
import { assess } from "../src/lib/weather/engine";
import type { Snapshot, Period } from "../src/lib/weather/model";
import { matchPlkOperations } from "../src/lib/transport/realtime-parse";
import { decodeCityRealtime } from "../src/lib/transport/realtime";
import { journeyCalendar } from "../src/lib/transport/calendar";
import { translatedPath } from "../src/lib/routes";
import { GET as refresh } from "../src/app/api/transport/refresh/route";
import { localInput } from "../src/lib/weather/time";
import type {
  TransitFeed,
  TransitTrip,
  StopTime,
  TripQuery,
  TripUpdate,
} from "../src/lib/transport/model";
import rail from "../src/lib/transport/artifacts/rail.json";
import city from "../src/lib/transport/artifacts/city.json";
import coach from "../src/lib/transport/artifacts/coach.json";

const now = new Date("2026-10-06T00:00Z");
const base: TripQuery = {
  direction: "from-airport",
  place: "krakow-glowny",
  date: "2026-10-06",
  time: "07:00",
  buffer: 30,
  delay: 0,
  transfer: 20,
  fold: "auto",
  weather: "auto",
};
const time = (stop: string, hour: number, minute = 0, seq = 1): StopTime => [
  stop,
  hour * 3600 + minute * 60,
  hour * 3600 + minute * 60,
  seq,
  true,
  true,
  "",
];
function fixture(
  source: "rail" | "city" | "coach" = "rail",
  trips?: TransitTrip[],
): TransitFeed {
  return {
    version: 1,
    source,
    checkedAt: now.toISOString(),
    sourceUpdatedAt: null,
    validFrom: "2026-10-01",
    validUntil: "2026-10-31",
    maxSeconds: 36 * 3600,
    stops: {
      a: {
        id: "a",
        name: "KRAKÓW LOTNISKO",
        place: "airport",
        lat: 50.071,
        lon: 19.801,
        code: "",
      },
      b: {
        id: "b",
        name: "KRAKÓW GŁÓWNY",
        place: "krakow-glowny",
        lat: 50.066,
        lon: 19.947,
        code: "",
      },
      z: {
        id: "z",
        name: "ZAKOPANE",
        place: "zakopane",
        lat: 49.299,
        lon: 19.96,
        code: "",
      },
    },
    services: {
      s: {
        start: "2026-10-01",
        end: "2026-10-31",
        weekdays: [0, 1, 2, 3, 4, 5, 6],
        added: [],
        removed: [],
      },
    },
    trips: trips ?? [
      {
        id: "train-1",
        service: "s",
        route: "KML",
        number: "33101",
        headsign: "KRAKÓW GŁÓWNY",
        mode: "train",
        times: [time("a", 8), time("b", 8, 20, 2)],
      },
    ],
    quality: { stops: 3, trips: trips?.length ?? 1, skippedTimes: 0 },
  };
}
function gtfs(
  calendar: string,
  exceptions = "service_id,date,exception_type\n",
) {
  const files = {
    "stops.txt":
      "stop_id,stop_name,stop_lat,stop_lon\na,KRAKÓW LOTNISKO,50.071,19.801\nb,KRAKÓW GŁÓWNY,50.066,19.947\n",
    "routes.txt": "route_id,route_short_name,route_type\nr,KML,2\n",
    "trips.txt": "route_id,service_id,trip_id\nr,s,t\n",
    "stop_times.txt":
      "trip_id,arrival_time,departure_time,stop_id,stop_sequence,pickup_type,drop_off_type\nt,25:00:00,25:00:00,a,1,0,0\nt,25:20:00,25:20:00,b,2,0,0\n",
    "calendar.txt": calendar,
    "calendar_dates.txt": exceptions,
    "feed_info.txt": "feed_start_date,feed_end_date\n20261001,20261231\n",
  };
  return zipSync(
    Object.fromEntries(Object.entries(files).map(([k, v]) => [k, strToU8(v)])),
  );
}
test("GTFS CSV retains quoted commas, line breaks, escaped quotes and BOM", () => {
  assert.deepEqual(
    [...csvRows('\ufeffid,name\r\nx,"A, B\nC ""D"""\r\n')],
    [{ id: "x", name: 'A, B\nC "D"' }],
  );
  assert.throws(() => [...csvRows('id,name\nx,"unclosed')], /Unclosed/);
  assert.throws(() => [...csvRows("id,name\nx,y,z")], /Malformed/);
});
test("GTFS clocks keep times beyond midnight and reject invalid minutes", () => {
  assert.equal(gtfsSeconds("35:25:00"), 127500);
  assert.equal(gtfsSeconds("24:60:00"), null);
  assert.equal(gtfsSeconds("169:00:00"), null);
});
test("calendar exceptions override weekly flags without expanding weekly validity", () => {
  const feed = importGtfs(
    gtfs(
      "service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\ns,1,1,1,1,1,1,1,20261005,20261007\n",
      "service_id,date,exception_type\ns,20261006,2\ns,20261010,1\n",
    ),
    "rail",
    now.toISOString(),
  );
  assert.equal(serviceRuns(feed.services.s, "2026-10-06"), false);
  assert.equal(serviceRuns(feed.services.s, "2026-10-09"), false);
  assert.equal(serviceRuns(feed.services.s, "2026-10-10"), true);
  assert.equal(feed.validUntil, "2026-10-10");
});
test("exception-only services do not inherit the feed's distant expiry", () => {
  const feed = importGtfs(
    gtfs(
      "service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\ns,0,0,0,0,0,0,0,20261001,20261231\n",
      "service_id,date,exception_type\ns,20261006,1\n",
    ),
    "rail",
    now.toISOString(),
  );
  assert.equal(feed.validFrom, "2026-10-06");
  assert.equal(feed.validUntil, "2026-10-06");
  assert.equal(serviceRuns(feed.services.s, "2026-10-07"), false);
});
test("malformed calendar dates fail instead of rolling into another month", () => {
  assert.throws(
    () =>
      importGtfs(
        gtfs("service_id,monday,start_date,end_date\ns,1,20260230,20261031\n"),
        "rail",
        now.toISOString(),
      ),
    /Invalid/,
  );
});
test("the preceding service date supplies a 25-hour trip after midnight", () => {
  const f = fixture();
  f.trips[0].times = [time("a", 25), time("b", 25, 20, 2)];
  f.services.s.weekdays = [];
  f.services.s.added = ["2026-10-06"];
  const r = planJourney(
    [f],
    { ...base, date: "2026-10-07", time: "00:00", buffer: 45 },
    undefined,
    now,
  );
  assert.equal(r.journeys[0].legs[0].serviceDate, "2026-10-06");
  assert.equal(localInput(r.journeys[0].departure), "2026-10-07T01:00");
  assert.equal(r.journeys[0].waitMinutes, 15);
});
test("the last service day can spill into the following civil day", () => {
  const f = fixture();
  f.validUntil = "2026-10-06";
  f.trips[0].times = [time("a", 25), time("b", 25, 20, 2)];
  const r = planJourney(
    [f],
    { ...base, date: "2026-10-07", time: "00:00", buffer: 45 },
    undefined,
    now,
  );
  assert.equal(r.journeys.length, 1);
  assert.equal(r.feeds[0].state, "fresh");
});
test("GTFS noon-minus-12 clock is correct across both Warsaw DST changes", () => {
  assert.equal(
    new Date(serviceAnchor("2026-03-29")).toISOString(),
    "2026-03-28T22:00:00.000Z",
  );
  assert.equal(
    new Date(serviceAnchor("2026-10-25")).toISOString(),
    "2026-10-24T23:00:00.000Z",
  );
});
test("late-evening shortcuts keep tonight and tomorrow morning across midnight and New Year", () => {
  for (const [at, today, tomorrow, upcoming] of [
    ["2026-10-06T21:30Z", "2026-10-06", "2026-10-07", "2026-10-07"],
    ["2026-12-31T22:30Z", "2026-12-31", "2027-01-01", "2027-01-01"],
    ["2026-12-31T23:30Z", "2027-01-01", "2027-01-02", "2027-01-01"],
  ]) {
    const current = new Date(at);
    const night = defaultQuery(current, "night");
    const early = defaultQuery(current, "early");
    assert.equal(night.date, today);
    assert.equal(early.date, tomorrow);
    assert.equal(night.time, "23:45");
    assert.equal(early.time, "06:00");
    assert.equal(defaultQuery(current).date, upcoming);
  }
});
test("flight time requires an explicit choice for a repeated hour and rejects a missing hour", () => {
  const q = { ...base, date: "2026-10-25", time: "02:30" };
  assert.equal(resolveFlight(q, now).issue, "dst-time");
  assert.equal(
    resolveFlight({ ...q, fold: "first" }, now).at,
    "2026-10-25T00:30:00.000Z",
  );
  assert.equal(
    resolveFlight({ ...q, fold: "second" }, now).at,
    "2026-10-25T01:30:00.000Z",
  );
  assert.equal(
    resolveFlight({ ...q, date: "2027-03-28", fold: "first" }, now).issue,
    "dst-time",
  );
});
test("no boarding or alighting permission means no offered connection", () => {
  const f = fixture();
  f.trips[0].times[0][4] = false;
  assert.equal(planJourney([f], base, undefined, now).journeys.length, 0);
  f.trips[0].times[0][4] = true;
  f.trips[0].times[1][5] = false;
  assert.equal(planJourney([f], base, undefined, now).journeys.length, 0);
});
test("duplicate timetable variants do not create duplicate departures", () => {
  const f = fixture();
  f.trips.push({ ...f.trips[0], id: "variant" });
  assert.equal(
    planJourney([f], base, undefined, now).journeys.filter(
      (j) => j.legs[0].serviceDate === base.date,
    ).length,
    1,
  );
});
test("a PLK update enriches one KMŁ trip, never a second train option", () => {
  const f = fixture();
  const updates = matchPlkOperations(
    [
      {
        operatingDate: base.date,
        stations: [
          {
            stationId: 1,
            plannedDeparture: "2026-10-06T08:00:00",
            departureDelayMinutes: 5,
          },
          {
            stationId: 2,
            plannedArrival: "2026-10-06T08:20:00",
            arrivalDelayMinutes: 4,
          },
        ],
      },
    ],
    { "1": "Kraków Lotnisko", "2": "Kraków Główny" },
    f,
    now,
  );
  assert.equal(updates.length, 1);
  const r = planJourney([f], base, { updates, statuses: [] }, now);
  assert.equal(
    r.journeys.filter((j) => j.legs[0].serviceDate === base.date).length,
    1,
  );
  assert.equal(r.journeys[0].legs[0].departureDelay, 5);
  assert.equal(r.journeys[0].legs[0].arrivalDelay, 4);
  assert.equal(r.journeys[0].legs[0].source, "rail");
});
test("PLK ambiguous matches and null delays remain unknown", () => {
  const f = fixture();
  const records = [
    {
      operatingDate: base.date,
      stations: [
        {
          stationId: 1,
          plannedDeparture: "2026-10-06T06:00:00Z",
          departureDelayMinutes: null,
        },
        {
          stationId: 2,
          plannedArrival: "2026-10-06T06:20:00Z",
          arrivalDelayMinutes: null,
        },
      ],
    },
  ];
  const names = { "1": "Kraków Lotnisko", "2": "Kraków Główny" };
  const updates = matchPlkOperations(records, names, f, now);
  const r = planJourney([f], base, { updates, statuses: [] }, now);
  assert.equal(r.journeys[0].legs[0].live, false);
  assert.equal(r.journeys[0].legs[0].departureDelay, null);
  f.trips.push({ ...f.trips[0], id: "ambiguous" });
  assert.equal(matchPlkOperations(records, names, f, now).length, 0);
});
test("a cancelled train or skipped boarding stop is removed", () => {
  const f = fixture();
  const update: TripUpdate = {
    source: "rail",
    tripId: f.trips[0].id,
    serviceDate: base.date,
    cancelled: true,
    stops: {},
  };
  assert.ok(
    planJourney(
      [f],
      base,
      { updates: [update], statuses: [] },
      now,
    ).journeys.every((j) => j.legs[0].serviceDate !== base.date),
  );
  update.cancelled = false;
  update.stops.a = { skipped: true };
  assert.ok(
    planJourney(
      [f],
      base,
      { updates: [update], statuses: [] },
      now,
    ).journeys.every((j) => j.legs[0].serviceDate !== base.date),
  );
});
test("departure delay without arrival data is an estimate, not a guaranteed transfer", () => {
  const f = fixture();
  f.trips.push({
    ...f.trips[0],
    id: "onward",
    times: [time("b", 8, 45), time("z", 10, 0, 2)],
  });
  const updates: TripUpdate[] = [
    {
      source: "rail",
      tripId: "train-1",
      serviceDate: base.date,
      cancelled: false,
      stops: { a: { departureDelay: 600 } },
    },
  ];
  const direct = planJourney([f], base, { updates, statuses: [] }, now)
    .journeys[0].legs[0];
  assert.equal(direct.arrivalEstimated, true);
  assert.equal(direct.arrivalDelay, null);
  assert.equal(localInput(direct.arrival), "2026-10-06T08:30");
  const r = planJourney(
    [f],
    { ...base, place: "zakopane" },
    { updates, statuses: [] },
    now,
  );
  assert.ok(r.journeys.every((j) => j.legs[0].serviceDate !== base.date));
});
test("a transfer respects the walking margin and avoids duplicate feeder variants", () => {
  const f = fixture();
  f.trips.push(
    {
      ...f.trips[0],
      id: "feeder-2",
      times: [time("a", 8, 10), time("b", 8, 30, 2)],
    },
    { ...f.trips[0], id: "onward", times: [time("b", 9), time("z", 11, 0, 2)] },
  );
  const r = planJourney([f], { ...base, place: "zakopane" }, undefined, now);
  assert.equal(r.journeys[0].legs[0].tripId, "feeder-2");
  assert.equal(r.journeys[0].transferMinutes, 30);
  assert.equal(
    r.journeys.filter((j) => j.legs[1].serviceDate === base.date).length,
    1,
  );
  const strict = planJourney(
    [f],
    { ...base, place: "zakopane", transfer: 45 },
    undefined,
    now,
  );
  assert.ok(strict.journeys.every((j) => j.legs[0].serviceDate !== base.date));
});
test("early departure arrives before the chosen check-in margin, regardless of flight delay", () => {
  const f = fixture();
  f.trips[0].times = [time("b", 3, 20), time("a", 3, 40, 2)];
  const q = parseQuery(
    { direction: "to-airport", date: base.date, time: "06:00", delay: "90" },
    base,
  );
  assert.equal(q.buffer, 120);
  assert.equal(q.delay, 0);
  const r = planJourney([f], q, undefined, now);
  assert.equal(r.journeys[0].spareMinutes, 20);
  assert.equal(localInput(r.readyAt!), "2026-10-06T04:00");
});
test("feeds older than seven days are excluded without changing their timestamps", () => {
  const f = fixture();
  f.checkedAt = "2026-09-28T00:00Z";
  const r = planJourney([f], base, undefined, now);
  assert.equal(r.journeys.length, 0);
  assert.equal(r.feeds[0].state, "unavailable");
  assert.equal(r.feeds[0].checkedAt, f.checkedAt);
});
test("GTFS-RT stale, truncated and date-less data cannot label a service live", () => {
  const f = fixture("city");
  const create = (timestamp: number, startDate?: string) =>
    GtfsRealtimeBindings.transit_realtime.FeedMessage.encode({
      header: { gtfsRealtimeVersion: "2.0", timestamp },
      entity: [
        {
          id: "e",
          tripUpdate: {
            trip: { tripId: "train-1", startDate },
            stopTimeUpdate: [
              { stopId: "a", stopSequence: 1, departure: { delay: 120 } },
            ],
          },
        },
      ],
    }).finish();
  const timestamp = now.getTime() / 1000;
  assert.throws(
    () => decodeCityRealtime(create(timestamp - 300, "20261006"), f, now),
    /stale/,
  );
  assert.equal(decodeCityRealtime(create(timestamp), f, now).updates.length, 0);
  const bytes = create(timestamp, "20261006");
  assert.throws(() => decodeCityRealtime(bytes.slice(0, -1), f, now));
  assert.equal(
    decodeCityRealtime(bytes, f, now).updates[0].stops.a.departureDelay,
    120,
  );
  assert.equal(
    decodeCityRealtime(bytes, f, now).updates[0].stops.a.departure,
    undefined,
  );
});
test("calendar export uses UTC instants, CRLF, safe escaping and byte folding", () => {
  const r = planJourney([fixture()], base, undefined, now);
  r.journeys[0].legs[0].from.name = "Ł".repeat(80) + ", test;\nEND:VEVENT";
  const ics = journeyCalendar(r.journeys[0], base, "pl", now);
  assert.ok(ics.includes("DTSTART:20261006T060000Z"));
  assert.ok(ics.includes("\\nEND:VEVENT"));
  assert.ok(ics.endsWith("\r\n"));
  assert.ok(
    ics.split("\r\n").every((line) => Buffer.byteLength(line, "utf8") <= 75),
  );
});
test("language changes retain the corresponding transport guide", () => {
  assert.equal(translatedPath("/pl/dojazd-noca", "pl", "en"), "/en/late-night");
  assert.equal(
    translatedPath("/en/airport-to-zakopane", "en", "pl"),
    "/pl/balice-zakopane",
  );
});
test("real feed snapshots have unique trips, valid joins and ordered stop times", () => {
  for (const raw of [rail, city, coach]) {
    const f = raw as unknown as TransitFeed;
    assert.equal(new Set(f.trips.map((t) => t.id)).size, f.trips.length);
    assert.equal(f.quality.skippedTimes, 0);
    assert.ok(Object.values(f.stops).some((s) => s.place === "airport"));
    for (const trip of f.trips) {
      assert.ok(f.services[trip.service]);
      for (const time of trip.times) assert.ok(f.stops[time[0]]);
      for (let i = 1; i < trip.times.length; i++)
        assert.ok(trip.times[i][1] >= trip.times[i - 1][2]);
    }
  }
});
test("real schedules produce night 902, morning airport arrival and an onward journey", () => {
  const current = new Date(rail.checkedAt),
    feeds = [rail, city, coach] as unknown as TransitFeed[];
  const night = planJourney(
    feeds,
    defaultQuery(current, "night"),
    undefined,
    current,
  );
  assert.ok(night.journeys.some((j) => j.legs.some((l) => l.route === "902")));
  const early = planJourney(
    feeds,
    defaultQuery(current, "early"),
    undefined,
    current,
  );
  assert.ok(early.journeys.length > 0);
  assert.ok(
    early.journeys.every(
      (j) => Date.parse(j.arrival) <= Date.parse(early.readyAt!),
    ),
  );
  const onward = planJourney(
    feeds,
    defaultQuery(current, "zakopane"),
    undefined,
    current,
  );
  assert.ok(onward.journeys.length > 0);
  assert.ok(
    onward.journeys.every((j) => j.legs.at(-1)!.to.place === "zakopane"),
  );
});
test("transport refresh requires a configured and correct cron secret", async () => {
  const before = process.env.CRON_SECRET;
  try {
    delete process.env.CRON_SECRET;
    assert.equal(
      (
        await refresh(
          new Request("https://www.krk.flights/api/transport/refresh"),
        )
      ).status,
      503,
    );
    process.env.CRON_SECRET = "test-only-transport";
    assert.equal(
      (
        await refresh(
          new Request("https://www.krk.flights/api/transport/refresh", {
            headers: { authorization: "Bearer wrong" },
          }),
        )
      ).status,
      401,
    );
  } finally {
    if (before === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = before;
  }
});

function weatherFixture(level: 1 | 3 | 4, possible = false): Snapshot {
  const conditions = observation(
    "EPKK 060000Z 00000KT 0300 FG OVC001 01/00 Q1013",
    now.toISOString(),
  ).conditions;
  const assessment = { ...assess(conditions, "arrival"), level };
  const period: Period = {
    start: "2026-10-06T00:00Z",
    end: "2026-10-07T00:00Z",
    source: "TAF",
    conditions,
    arrival: possible ? { ...assessment, level: 1 } : assessment,
    departure: assessment,
    scenarios: possible
      ? [
          {
            kind: "PROB30 TEMPO",
            probability: 30,
            conditions,
            arrival: assessment,
            departure: assessment,
          },
        ]
      : [],
  };
  const fresh = {
    state: "fresh" as const,
    fetchedAt: now.toISOString(),
    detail: "test",
  };
  return {
    version: 2,
    generatedAt: now.toISOString(),
    forecast: [period],
    observed: null,
    history: [],
    current: { arrival: assessment, departure: assessment },
    sources: { taf: fresh, metar: fresh, model: fresh, ensemble: fresh },
    ensemble: [],
    taf: null,
    fogSignal: null,
  };
}
test("weather allowance removes a tight train and states the additional time", () => {
  const f = fixture();
  f.trips[0].times = [time("a", 7, 40), time("b", 8, 0, 2)];
  f.trips.push({
    ...f.trips[0],
    id: "later",
    times: [time("a", 8, 10), time("b", 8, 30, 2)],
  });
  const weather = connectionWeather(weatherFixture(3), base, now);
  const normal = planJourney([f], base, undefined, now);
  const cautious = planJourney([f], base, undefined, now, weather);
  assert.equal(normal.journeys[0].legs[0].tripId, "train-1");
  assert.equal(cautious.journeys[0].legs[0].tripId, "later");
  assert.equal(cautious.weather.extraMinutes, 30);
  assert.equal(cautious.weather.minTransfer, 30);
  assert.equal(cautious.journeys[0].waitMinutes, 40);
});
test("a possible severe TAF scenario adds a smaller allowance, not its percentage as a flight-delay probability", () => {
  const weather = connectionWeather(weatherFixture(4, true), base, now);
  assert.equal(weather.possible, true);
  assert.equal(weather.extraMinutes, 30);
  assert.equal(
    connectionWeather(weatherFixture(4), base, now).extraMinutes,
    60,
  );
  assert.equal(
    connectionWeather(weatherFixture(4), { ...base, weather: "off" }, now)
      .extraMinutes,
    0,
  );
});
test("weather cannot move a departure's check-in deadline", () => {
  const q: TripQuery = {
    ...base,
    direction: "to-airport",
    time: "06:00",
    buffer: 120,
  };
  const weather = connectionWeather(weatherFixture(4), q, now);
  assert.equal(weather.extraMinutes, 0);
  assert.equal(weather.minTransfer, 0);
  const r = planJourney([fixture()], q, undefined, now, weather);
  assert.equal(localInput(r.readyAt!), "2026-10-06T04:00");
});
test("weather allowance raises the minimum time to change trains and buses", () => {
  const f = fixture();
  f.trips.push({
    ...f.trips[0],
    id: "onward",
    times: [time("b", 8, 45), time("z", 10, 0, 2)],
  });
  const q = { ...base, place: "zakopane" };
  assert.ok(
    planJourney([f], q, undefined, now).journeys.some(
      (j) => j.legs[0].serviceDate === base.date,
    ),
  );
  const weather = connectionWeather(weatherFixture(3), q, now);
  const safe = planJourney([f], q, undefined, now, weather);
  assert.ok(safe.journeys.every((j) => j.transferMinutes! >= 30));
  assert.ok(safe.journeys.every((j) => j.legs[0].serviceDate !== base.date));
});
test("missing, stale or out-of-range weather is unknown rather than clear weather", () => {
  const snapshot = weatherFixture(4);
  snapshot.sources.taf.state = "stale";
  for (const weather of [
    connectionWeather(snapshot, base, now),
    connectionWeather(null, base, now),
    connectionWeather(weatherFixture(4), { ...base, date: "2026-10-08" }, now),
  ]) {
    assert.equal(weather.level, null);
    assert.equal(weather.extraMinutes, 0);
    assert.equal(weather.source, null);
  }
});
test("weather-to-transport links preserve the selected instant even during a repeated hour", () => {
  const first = queryForFlight("2026-10-25T00:30Z", "arrival"),
    second = queryForFlight("2026-10-25T01:30Z", "departure");
  assert.equal(first.fold, "first");
  assert.equal(second.fold, "second");
  assert.equal(resolveFlight(first, now).at, "2026-10-25T00:30:00.000Z");
  assert.equal(resolveFlight(second, now).at, "2026-10-25T01:30:00.000Z");
  assert.equal(second.buffer, 120);
  assert.equal(second.direction, "to-airport");
});
