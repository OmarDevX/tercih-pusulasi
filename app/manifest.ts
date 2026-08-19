import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tercih Pusulası",
    short_name: "Tercih Pusulası",
    description: "YKS sıralamaları, kontenjanları ve üniversite karşılaştırma rehberi.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f6f0",
    theme_color: "#11131f",
    lang: "tr",
    icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
