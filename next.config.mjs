/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Header cho service worker & manifest de PWA hoat dong dung chuan tren mobile.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
