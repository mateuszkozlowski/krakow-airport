import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KRK.flights · Kraków Airport Weather",
    short_name: "KRK.flights",
    description: "Weather before your trip to or from Kraków Airport.",
    start_url: "/pl",
    scope: "/",
    display: "standalone",
    background_color: "#0c1525",
    theme_color: "#0c1525",
    icons: [
      { src: "/app-icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/app-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
