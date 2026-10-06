import type { CSSProperties } from "react";

export type IconName =
  | "wind"
  | "variable"
  | "visibility"
  | "cloud"
  | "runway"
  | "arrival"
  | "departure"
  | "change"
  | "temporary"
  | "refresh"
  | "calendar"
  | "link"
  | "clock"
  | "fog"
  | "rain"
  | "snow"
  | "storm"
  | "left"
  | "right"
  | "info";
const paths: Record<IconName, string> = {
  wind: "M3 8h12a3 3 0 1 0-3-3 M2 12h17a3 3 0 1 1-3 3 M4 16h5a3 3 0 1 1-3 3",
  variable: "M4 10a8 8 0 0 1 14-4 M18 2v4h-4 M20 14a8 8 0 0 1-14 4 M6 22v-4h4",
  visibility:
    "M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12 Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  cloud: "M6 18a4 4 0 0 1-.5-8 6 6 0 0 1 11.5-1 4.5 4.5 0 1 1 1 9H6 Z",
  runway: "M8 3 4 21 M16 3l4 18 M12 4v3 M12 10v3 M12 16v3 M3 21h18",
  arrival: "M2 20h20 M3 5l3 1 3 6 7 2-1-8 3 1 2 10-2 1-14-5-1-3 Z",
  departure: "M2 20h20 M3 13l3 1 6-3-3-6 3-1 5 5 4-2 1 2-15 8-3-1-1-3 Z",
  change: "M3 17h4l6-10h8 M17 3l4 4-4 4",
  temporary: "M12 3a9 9 0 1 1-9 9 M3 3v6h6 M12 7v5l3 2",
  refresh:
    "M20 7a8 8 0 0 0-14-2L3 8 M3 3v5h5 M4 17a8 8 0 0 0 14 2l3-3 M21 21v-5h-5",
  calendar: "M4 5h16v16H4 Z M8 3v4 M16 3v4 M4 10h16 M8 14h2 M14 14h2 M8 17h2",
  link: "M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2 M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2",
  clock: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M12 7v5l3 2",
  fog: "M5 11a4 4 0 0 1 1-7 5 5 0 0 1 9 1 4 4 0 0 1 4 6 M3 14h18 M5 18h14 M3 22h18",
  rain: "M5 14a4 4 0 0 1 1-8 5 5 0 0 1 9 1 4 4 0 0 1 3 7 M7 17l-1 3 M12 17l-1 3 M17 17l-1 3",
  snow: "M12 2v20 M3 7l18 10 M3 17 21 7 M8 3l4 4 4-4 M8 21l4-4 4 4 M2 11l5-1-1-5 M22 13l-5 1 1 5 M2 13l5 1-1 5 M22 11l-5-1 1-5",
  storm: "M5 14a4 4 0 0 1 1-8 5 5 0 0 1 9 1 4 4 0 0 1 3 7 M13 12l-4 6h5l-3 5",
  left: "M15 5l-7 7 7 7",
  right: "M9 5l7 7-7 7",
  info: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M12 11v6 M12 7h.01",
};
export function Icon({
  name,
  style,
}: {
  name: IconName;
  style?: CSSProperties;
}) {
  return (
    <svg
      className="icon"
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={paths[name]} />
    </svg>
  );
}
