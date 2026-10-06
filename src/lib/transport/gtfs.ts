import { unzipSync, strFromU8 } from "fflate";
import { matchPlace } from "./catalog";
import type {
  SourceId,
  TransitFeed,
  TransitStop,
  TransitTrip,
  ServiceDays,
} from "./model";

// CSV fields may contain commas, escaped quotes and line breaks.
export function* csvRows(text: string): Generator<Record<string, string>> {
  let fields: string[] = [],
    field = "",
    quoted = false,
    headers: string[] | null = null;
  for (let i = text.charCodeAt(0) === 0xfeff ? 1 : 0; i <= text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"';
        i++;
      } else quoted = !quoted;
    } else if (
      !quoted &&
      (char === "," || char === "\n" || char === "\r" || char === undefined)
    ) {
      fields.push(field);
      field = "";
      if (char !== ",") {
        if (char === "\r" && text[i + 1] === "\n") i++;
        if (!headers) headers = fields;
        else if (fields.some(Boolean)) {
          if (fields.length !== headers.length)
            throw new Error("Malformed GTFS CSV row");
          yield Object.fromEntries(
            headers.map((key, index) => [key, fields[index]]),
          );
        }
        fields = [];
      }
    } else field += char;
  }
  if (quoted) throw new Error("Unclosed GTFS CSV quote");
}
export function gtfsSeconds(value: string): number | null {
  const match = /^(\d{1,3}):([0-5]\d):([0-5]\d)$/.exec(value);
  if (!match || +match[1] > 168) return null;
  return +match[1] * 3600 + +match[2] * 60 + +match[3];
}
const isoDate = (value: string) => {
  if (!/^\d{8}$/.test(value)) return "";
  const date = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  return Number.isFinite(Date.parse(date)) &&
    new Date(date + "T12:00Z").toISOString().slice(0, 10) === date
    ? date
    : "";
};
export function importGtfs(
  zip: Uint8Array,
  source: SourceId,
  checkedAt: string,
  sourceUpdatedAt: string | null = null,
): TransitFeed {
  const wanted = new Set([
    "stops.txt",
    "routes.txt",
    "trips.txt",
    "stop_times.txt",
    "calendar.txt",
    "calendar_dates.txt",
    "feed_info.txt",
  ]);
  let inflated = 0;
  const files = unzipSync(zip, {
    filter: (file) => {
      if (!wanted.has(file.name)) return false;
      inflated += file.originalSize;
      if (file.originalSize > 90_000_000 || inflated > 140_000_000)
        throw new Error("GTFS exceeds size limit");
      return true;
    },
  });
  for (const name of ["stops.txt", "routes.txt", "trips.txt", "stop_times.txt"])
    if (!files[name]) throw new Error(`GTFS lacks ${name}`);
  if (!files["calendar.txt"] && !files["calendar_dates.txt"])
    throw new Error("GTFS lacks service dates");
  const rows = (name: string) =>
    csvRows(files[name] ? strFromU8(files[name]) : "");
  const stops: Record<string, TransitStop> = {};
  const stopNames = new Map<string, string>();
  for (const row of rows("stops.txt")) {
    stopNames.set(row.stop_id, row.stop_name);
    const place = matchPlace(row.stop_name, source);
    if (!place || row.location_type === "1") continue;
    if (!row.stop_id || stops[row.stop_id])
      throw new Error("Duplicate or empty GTFS stop ID");
    const lat = Number(row.stop_lat),
      lon = Number(row.stop_lon);
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      lat < 48 ||
      lat > 55 ||
      lon < 14 ||
      lon > 25
    )
      throw new Error("Invalid stop coordinates");
    stops[row.stop_id] = {
      id: row.stop_id,
      name: row.stop_name,
      place: place.id,
      lat,
      lon,
      code: row.stop_code ?? "",
    };
  }
  if (!Object.values(stops).some((s) => s.place === "airport"))
    throw new Error("GTFS lacks airport stop");
  const routes = new Map<string, Record<string, string>>();
  for (const row of rows("routes.txt")) routes.set(row.route_id, row);
  const tripMap = new Map<string, TransitTrip>();
  for (const row of rows("trips.txt")) {
    const route = routes.get(row.route_id);
    if (!route) throw new Error("GTFS trip references unknown route");
    if (
      source === "city" &&
      !["209", "300", "902"].includes(route.route_short_name)
    )
      continue;
    if (tripMap.has(row.trip_id)) throw new Error("Duplicate GTFS trip ID");
    const name = route.route_short_name || route.route_long_name;
    tripMap.set(row.trip_id, {
      id: row.trip_id,
      service: row.service_id,
      route: name,
      number: row.trip_short_name ?? "",
      headsign: row.trip_headsign ?? "",
      mode:
        source === "city"
          ? "bus"
          : source === "coach"
            ? "coach"
            : /ZKA|zastępcz/i.test(name + " " + row.trip_short_name)
              ? "replacement-bus"
              : "train",
      times: [],
    });
  }
  let skippedTimes = 0,
    maxSeconds = 0;
  const termini = new Map<string, { sequence: number; name: string }>();
  for (const row of rows("stop_times.txt")) {
    const trip = tripMap.get(row.trip_id);
    if (!trip) continue;
    const terminal = termini.get(trip.id);
    if (!terminal || Number(row.stop_sequence) > terminal.sequence)
      termini.set(trip.id, {
        sequence: Number(row.stop_sequence),
        name: stopNames.get(row.stop_id) ?? "",
      });
    if (!stops[row.stop_id]) continue;
    const arrival = gtfsSeconds(row.arrival_time),
      departure = gtfsSeconds(row.departure_time);
    const sequence = Number(row.stop_sequence);
    if (
      arrival === null ||
      departure === null ||
      !Number.isInteger(sequence) ||
      departure < arrival
    ) {
      skippedTimes++;
      continue;
    }
    // Demand-responsive boarding is not offered as a regular scheduled service.
    trip.times.push([
      row.stop_id,
      arrival,
      departure,
      sequence,
      !row.pickup_type || row.pickup_type === "0",
      !row.drop_off_type || row.drop_off_type === "0",
      source === "rail" ? (row.stop_headsign ?? "") : "",
    ]);
    maxSeconds = Math.max(maxSeconds, departure);
  }
  const trips = [...tripMap.values()]
    .filter((t) => t.times.length > 1)
    .map((t) => {
      t.times.sort((a, b) => a[3] - b[3]);
      for (let i = 1; i < t.times.length; i++) {
        if (t.times[i][3] === t.times[i - 1][3])
          throw new Error("Duplicate GTFS stop sequence");
        if (t.times[i][1] < t.times[i - 1][2])
          throw new Error("GTFS times run backwards");
      }
      if (!t.headsign) t.headsign = termini.get(t.id)?.name ?? "";
      return t;
    });
  const requiredServices = new Set(trips.map((t) => t.service));
  const services: Record<string, ServiceDays> = {};
  for (const row of rows("calendar.txt"))
    if (requiredServices.has(row.service_id)) {
      if (services[row.service_id]) throw new Error("Duplicate GTFS service");
      if (
        !isoDate(row.start_date) ||
        !isoDate(row.end_date) ||
        row.start_date > row.end_date
      )
        throw new Error("Invalid GTFS calendar dates");
      services[row.service_id] = {
        start: isoDate(row.start_date),
        end: isoDate(row.end_date),
        weekdays: [
          "sunday",
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
        ].flatMap((d, i) => (row[d] === "1" ? [i] : [])),
        added: [],
        removed: [],
      };
    }
  for (const row of rows("calendar_dates.txt"))
    if (requiredServices.has(row.service_id)) {
      const date = isoDate(row.date);
      if (!date || !["1", "2"].includes(row.exception_type))
        throw new Error("Invalid GTFS exception");
      const calendar = (services[row.service_id] ??= {
        start: date,
        end: date,
        weekdays: [],
        added: [],
        removed: [],
      });
      if (calendar.added.includes(date) || calendar.removed.includes(date))
        throw new Error("Duplicate GTFS exception");
      calendar[row.exception_type === "1" ? "added" : "removed"].push(date);
    }
  for (const trip of trips)
    if (!services[trip.service])
      throw new Error("GTFS trip references unknown service");
  const info = [...rows("feed_info.txt")][0];
  // Some publishers put a distant expiry in feed_info while publishing only
  // this week's exceptions with all weekday flags set to zero.
  const dates = Object.values(services)
    .flatMap((s) =>
      s.weekdays.length ? [s.start, s.end, ...s.added] : s.added,
    )
    .filter(Boolean)
    .sort();
  const declaredFrom = isoDate(info?.feed_start_date ?? ""),
    declaredUntil = isoDate(info?.feed_end_date ?? "");
  const validFrom =
    declaredFrom && declaredFrom > dates[0] ? declaredFrom : dates[0];
  const lastDate = dates[dates.length - 1];
  const validUntil =
    declaredUntil && declaredUntil < lastDate ? declaredUntil : lastDate;
  if (!validFrom || !validUntil || !trips.length)
    throw new Error("Empty GTFS coverage");
  return {
    version: 1,
    source,
    checkedAt,
    sourceUpdatedAt,
    validFrom,
    validUntil,
    maxSeconds,
    stops,
    services,
    trips,
    quality: {
      trips: trips.length,
      stops: Object.keys(stops).length,
      skippedTimes,
    },
  };
}
