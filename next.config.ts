
import type { NextConfig } from "next";

/* =========================================================
   VOICE TO NOTION

   C9.5.10 — PRODUCTION SECURITY QA

   Global security headers
   API response cache protection
   ========================================================= */

const isDevelopment =
  process.env.NODE_ENV === "development";

/* =========================================================
   CONTENT SECURITY POLICY
   ========================================================= */

const contentSecurityPolicy = [
  "default-src 'self'",

  // Next.js + Paddle.js
  `script-src 'self' 'unsafe-inline' ${
    isDevelopment ? "'unsafe-eval'" : ""
  } https://cdn.paddle.com https://*.paddle.com`,

  // App styles + styles injected by Paddle Checkout
  "style-src 'self' 'unsafe-inline' https://*.paddle.com",

  // Local images, data URLs and provider-hosted assets
  "img-src 'self' data: blob: https:",

  // Browser audio playback for recorded voice blobs
  "media-src 'self' blob: data:",

  // Supabase + Paddle browser network access
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.paddle.com wss://*.paddle.com",

  // Paddle Checkout overlay
  "frame-src 'self' https://*.paddle.com",

  // Prevent other sites from embedding the app
  "frame-ancestors 'none'",

  // App fonts + Paddle Checkout fonts
  "font-src 'self' data: https://*.paddle.com",

  // Web workers and browser blob workers
  "worker-src 'self' blob:",

  // Restrict form submissions
  "form-action 'self'",

  // Restrict the HTML base element
  "base-uri 'self'",

  // Restrict web app manifests
  "manifest-src 'self'",

  // Block plugin and object content
  "object-src 'none'",

  // Upgrade insecure requests in production
  ...(isDevelopment
    ? []
    : ["upgrade-insecure-requests"]),
]
  .filter(Boolean)
  .join("; ");

/* =========================================================
   GLOBAL SECURITY HEADERS
   ========================================================= */

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy.replace(/\s{2,}/g, " "),
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
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
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains",
        },
      ]),
];

/* =========================================================
   API CACHE PROTECTION

   Prevent browsers and intermediary caches from
   storing responses from API endpoints.

   This covers successful responses and errors,
   including authentication, usage, Notion and
   Paddle endpoints.

   Static assets and ordinary pages retain their
   existing caching behavior.
   ========================================================= */

const apiHeaders = [
  {
    key: "Cache-Control",
    value: "no-store",
  },
];

/* =========================================================
   NEXT.JS CONFIGURATION
   ========================================================= */

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/api/:path*",
        headers: apiHeaders,
      },
    ];
  },
};

export default nextConfig;