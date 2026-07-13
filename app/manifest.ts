import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DustyPages",
    short_name: "DustyPages",
    description:
      "Buy and sell used books with coins — a closed-loop community marketplace for readers.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf7f2",
    theme_color: "#7c5c3e",
    orientation: "portrait",
    categories: ["books", "shopping", "social"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
