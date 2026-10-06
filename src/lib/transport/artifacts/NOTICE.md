# Timetable data attribution

These JSON files contain filtered, normalized **timetable data**, separate from the application's source code. Their `checkedAt` values are the original successful download/check times and must not be updated after a failed refresh.

- `coach.json`: FlixMobility Tech GmbH / FlixBus, [European GTFS feed](https://gtfs.gis.flix.tech/gtfs_generic_eu.zip). This derived dataset is available under the [Open Database License (ODbL) 1.0](https://opendatacommons.org/licenses/odbl/1-0/). Its public download endpoint is `/api/transport/data`. The application's code license does not replace this data license.
- `rail.json`: [Koleje Małopolskie GTFS](https://www.kolejemalopolskie.com.pl/pl/rozklady-jazdy/gtfs). KMŁ publishes these open data for timetable reuse. No additional named license is asserted here.
- `city.json`: [ZTP Kraków open data](https://ztp.krakow.pl/dane-otwarte), [city bus GTFS](https://gtfs.ztp.krakow.pl/GTFS_KRK_A.zip). No additional named license is asserted here.

Only selected stops and services are retained. Shapes and unrelated stops are omitted. Times, service-date rules and boarding restrictions remain source-derived. These files contain no seat availability, fares or real-time flight status. PLK operational updates are fetched separately and are not published in these artifacts.
