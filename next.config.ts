import type { NextConfig } from "next";

/* =========================================================
   VOICE TO NOTION
   NEXT.JS SECURITY HEADERS
   ========================================================= */

const isDevelopment =
  process.env.NODE_ENV === "development";

const contentSecurityPolicy = [
  "default-src 'self'",

  /* Next.js + Paddle.js */
  `script-src 'self' 'unsafe-inline' ${
    isDevelopment
      ? "'unsafe-eval'"
      : ""
  } https://cdn.paddle.com https://*.paddle.com`,

  /* App styles + styles injected by Paddle Checkout */
  "style-src 'self' 'unsafe-inline' https://*.paddle.com",

  /* Local images, data URLs and provider-hosted assets */
  "img-src 'self' data: blob: https:",

  /* Browser audio playback for recorded voice blobs */
  "media-src 'self' blob: data:",

  /* Supabase + Paddle browser network access */
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.paddle.com wss://*.paddle.com",

  /* Paddle Checkout overlay */
  "frame-src 'self' https://*.paddle.com",

  /* Prevent this app from being embedded by other sites */
  "frame-ancestors 'none'",

  /* App fonts + any fonts loaded by Paddle Checkout */
  "font-src 'self' data: https://*.paddle.com",

  /* Web workers / blob workers if used by browser APIs */
  "worker-src 'self' blob:",

  /* Restrict forms to this app */
  "form-action 'self'",

  /* Restrict the HTML <base> element */
  "base-uri 'self'",

  /* Only this origin may provide web app manifests */
  "manifest-src 'self'",

  /* Block plugin/object content */
  "object-src 'none'",

  /* Allow HTTPS upgrades outside local development */
  ...(isDevelopment
    ? []
    : ["upgrade-insecure-requests"]),
]
  .filter(Boolean)
  .join("; ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy.replace(
      /\s{2,}/g,
      " "
    ),
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value:
      "strict-origin-when-cross-origin",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Permissions-Policy",
    value: [
      "camera=()",
      "geolocation=()",
      "microphone=(self)",
      "usb=()",
      "serial=()",
      "bluetooth=()",
    ].join(", "),
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin-allow-popups",
  },
  {
    key: "X-DNS-Prefetch-Control",
    value: "off",
  },
  ...(isDevelopment
    ? []
    : [
        {
          key:
            "Strict-Transport-Security",
          value:
            "max-age=31536000; includeSubDomains",
        },
      ]),
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source:
          "/:path*",

        headers:
          securityHeaders,
      },
    ];
  },
};

export default nextConfig;
