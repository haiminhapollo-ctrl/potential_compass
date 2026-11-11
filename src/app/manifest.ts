import type { MetadataRoute } from "next";

// Next.js App Router: file dac biet nay tu dong sinh /manifest.webmanifest
// (khong can tu tao public/manifest.json). Xem:
// https://nextjs.org/docs/app/api-reference/file-conventions/metadata/manifest
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Potential Compass",
    short_name: "P.Compass",
    description: "Khám phá sở thích và định hướng học tập, nghề nghiệp cho học sinh lớp 9",
    start_url: "/",
    display: "standalone",
    background_color: "#FAF9F5",
    theme_color: "#FAF9F5",
    orientation: "portrait",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
