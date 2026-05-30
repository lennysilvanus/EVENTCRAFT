import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const securityHeaders = [
  // Prevent the page being loaded in an iframe — clickjacking defence
  { key: "X-Frame-Options", value: "DENY" },
  // Stop browsers from MIME-sniffing the content-type
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Only send the referrer for same-origin requests
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Force HTTPS for 2 years, include subdomains
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Allow camera/mic only from same origin (for QR scanner)
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
  // Content Security Policy
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js inline scripts and chunks need 'unsafe-inline' / nonces;
      // for now we allow 'unsafe-inline' + 'unsafe-eval' in script-src
      // and will tighten to nonces in a follow-up PR.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      // Images: self + data URIs (QR codes) + uploads served from same origin
      "img-src 'self' data: blob: https:",
      // API calls only to own origin + Snippe + Anthropic (for SSR fetches)
      "connect-src 'self' https://api.snippe.sh https://api.anthropic.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  output: "standalone",

  async headers() {
    return [
      {
        // Apply to every route
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

// Wrap with Sentry only when a DSN is present.
// This keeps the build working in environments where Sentry is not configured.
export default process.env.SENTRY_DSN
  ? withSentryConfig(nextConfig, {
      silent: true,
      hideSourceMaps: true,
      disableLogger: true,
    })
  : nextConfig;
