/** @type {import('next').NextConfig} */
const nextConfig = {
  // Автономная сборка для Docker (генерирует минимальный server.js)
  output: "standalone",
  // Keep runtime-only server packages out of the webpack graph.
  serverExternalPackages: [
    "sharp",
    "pg",
  ],
  experimental: {
    cpus: 1,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com https://www.googletagmanager.com https://mc.yandex.ru https://yastatic.net https://cdn.jsdelivr.net",
              "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com",
              "img-src 'self' data: blob: https: http:",
              "font-src 'self' https://fonts.gstatic.com",
              "connect-src 'self' https://www.google.com https://mc.yandex.ru https://api.resend.com",
              "frame-src 'self' https://www.google.com https://www.youtube.com https://www.youtube-nocookie.com https://mc.yandex.ru",
              "frame-ancestors 'none'",
              "form-action 'self'",
              "base-uri 'self'",
              "object-src 'none'",
              "report-uri /api/csp-violation",
            ].join("; "),
          },
          {
            key: "Report-To",
            value: JSON.stringify({
              group: "csp-endpoint",
              max_age: 10886400,
              endpoints: [{ url: "/api/csp-violation" }],
            }),
          },
        ],
      },
    ];
  },
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      // Old country pages under /tours/[category]/country/[slug]
      // (must come before the generic /tours/... rules below)
      { source: "/tours/bus/country/:slug", destination: "/avtobusnye-tury/:slug/", permanent: true },
      { source: "/tours/avia/country/:slug", destination: "/aviatory/:slug/", permanent: true },
      { source: "/tours/hot/country/:slug", destination: "/hot/:slug/", permanent: true },
      { source: "/aviatory/:countrySlug/:citySlug/:tourSlug", destination: "/avtobusnye-tury/:countrySlug/:citySlug/:tourSlug/", permanent: true },
      { source: "/hot/:countrySlug/:citySlug/:tourSlug", destination: "/avtobusnye-tury/:countrySlug/:citySlug/:tourSlug/", permanent: true },
      // Old category listing pages > new canonical URLs (301 permanent)
      { source: "/tours/bus", destination: "/avtobusnye-tury/", permanent: true },
      { source: "/tours/avia", destination: "/aviatory/", permanent: true },
      { source: "/tours/hot", destination: "/hot/", permanent: true },
      { source: "/hot-tours", destination: "/hot/", permanent: true },
      { source: "/hot-tours/:slug*", destination: "/hot/:slug*", permanent: true },
      { source: "/avia-tours", destination: "/aviatory/", permanent: true },
      { source: "/avia-tours/:slug*", destination: "/aviatory/:slug*", permanent: true },
      { source: "/bus-tours", destination: "/avtobusnye-tury/", permanent: true },
      { source: "/bus-tours/:slug*", destination: "/avtobusnye-tury/:slug*", permanent: true },
      { source: "/company/reviews", destination: "/testimonials", permanent: true },
      { source: "/company/documents", destination: "/company/licenses", permanent: true },
      { source: "/privacy", destination: "/legal/privacy", permanent: true },
      { source: "/privacy-policy", destination: "/legal/privacy", permanent: true },
      { source: "/tours/all", destination: "/avtobusnye-tury/", permanent: true },
      { source: "/tours/bus/:city", destination: "/avtobusnye-tury/", permanent: true },
      { source: "/tours/avia/:city", destination: "/aviatory/", permanent: true },
      { source: "/tours/hot/:city", destination: "/hot/", permanent: true },
    ];
  },
};

export default nextConfig;
