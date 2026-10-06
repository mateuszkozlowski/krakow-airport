export function TransportIcon({
  kind,
}: {
  kind: "train" | "bus" | "coach" | "replacement-bus" | "walk" | "arrow";
}) {
  return (
    <svg
      className="transport-icon"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {kind === "train" ? (
        <>
          <rect x="5" y="3" width="14" height="15" rx="3" />
          <path d="M5 10h14M12 3v7M8 21l2-3m6 3-2-3" />
          <path d="M8 14h.01M16 14h.01" />
        </>
      ) : kind === "walk" ? (
        <>
          <circle cx="14" cy="4" r="2" />
          <path d="m7 11 4-4 3 4 4 1M11 8l-1 7-4 6m4-6 5 6m-5-6 4-3" />
        </>
      ) : kind === "arrow" ? (
        <path d="M4 12h16m-6-6 6 6-6 6" />
      ) : (
        <>
          <rect x="4" y="3" width="16" height="16" rx="3" />
          <path d="M4 10h16M8 3v7M16 3v7M7 19v2m10-2v2M7 15h.01M17 15h.01" />
        </>
      )}
    </svg>
  );
}
