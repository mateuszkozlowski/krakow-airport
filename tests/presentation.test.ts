import { test } from "node:test";
import assert from "node:assert/strict";
import {
  runwayVisibility,
  runwayTrend,
  scenarioDescription,
  windDescription,
  windSpeed,
  weatherSymbol,
} from "../src/lib/weather/presentation";
import { observation } from "../src/lib/weather/parse";
import { assess } from "../src/lib/weather/engine";
import {
  possibleWorsening,
  timelineSegments,
} from "../src/lib/weather/timeline";
import type { Period } from "../src/lib/weather/model";

test("passenger wind units convert knots once and describe the direction the wind comes from", () => {
  assert.equal(windSpeed(10), "19 km/h");
  assert.equal(
    windDescription(
      { direction: 360, speed: 10, gust: null, variable: false },
      "pl",
    ),
    "Z północy",
  );
  assert.equal(
    windDescription(
      { direction: 90, speed: 10, gust: null, variable: false },
      "en",
    ),
    "From the east",
  );
  assert.equal(
    windDescription(
      {
        direction: 90,
        from: 70,
        to: 130,
        speed: 10,
        gust: null,
        variable: false,
      },
      "pl",
    ),
    "Zmienny kierunek",
  );
  assert.equal(windDescription(null, "en"), "Not reported");
});
test("runway visibility retains lower/upper bounds and translates trends", () => {
  assert.equal(
    runwayVisibility(
      {
        runway: "07",
        min: 600,
        max: 1200,
        minQualifier: "M",
        maxQualifier: "P",
        trend: "U",
      },
      "pl",
    ),
    "poniżej 600 – ponad 1200 m",
  );
  assert.equal(runwayTrend("D", "en"), "Worsening");
  assert.equal(runwayTrend(null, "pl"), "");
});
test("temporary and transition forecasts do not invent a numeric probability", () => {
  assert.equal(
    scenarioDescription({ kind: "TEMPO", probability: null }, "pl"),
    "Warunki chwilami",
  );
  assert.equal(
    scenarioDescription({ kind: "BECMG", probability: null }, "en"),
    "Gradual change",
  );
  assert.equal(
    scenarioDescription({ kind: "TEMPO", probability: 40 }, "en"),
    "40% chance of these conditions at times",
  );
});

test("timeline weather distinguishes poor visibility from an explicit fog report", () => {
  const c = observation(
    "EPKK 060000Z 00000KT 0400 NSC 02/01 Q1013",
    "2026-10-06T00:00:00Z",
  ).conditions;
  assert.equal(weatherSymbol(c).key, "limited");
  c.weather = ["FG"];
  assert.equal(weatherSymbol(c).key, "fog");
});

test("timeline preserves base risk, uncertain scenarios and missing hours", () => {
  const conditions = observation(
    "EPKK 060000Z 00000KT CAVOK 02/01 Q1013",
    "2026-10-06T00:00:00Z",
  ).conditions;
  const base: Period = {
    start: "2026-10-06T00:00:00Z",
    end: "2026-10-06T01:00:00Z",
    conditions,
    source: "TAF",
    arrival: assess(conditions, "arrival"),
    departure: assess(conditions, "departure"),
    scenarios: [],
  };
  assert.equal(possibleWorsening(base, "arrival"), undefined);
  const fog = { ...conditions, visibility: 300, cavok: false, weather: ["FG"] };
  base.scenarios.push({
    kind: "TEMPO",
    probability: 40,
    conditions: fog,
    arrival: assess(fog, "arrival"),
    departure: assess(fog, "departure"),
  });
  assert.equal(possibleWorsening(base, "arrival"), 4);
  assert.equal(base.arrival.level, 1);
  base.scenarios = [
    {
      kind: "TEMPO",
      probability: null,
      conditions,
      arrival: assess(null, "arrival"),
      departure: assess(null, "departure"),
    },
  ];
  assert.equal(possibleWorsening(base, "arrival"), null);
  const later = {
    ...base,
    start: "2026-10-06T03:00:00Z",
    end: "2026-10-06T04:00:00Z",
  };
  const segments = timelineSegments([later, base]);
  assert.equal(segments.length, 3);
  assert.equal(segments[1].period, null);
  assert.equal(segments[1].start, base.end);
  assert.equal(segments[1].end, later.start);
});
