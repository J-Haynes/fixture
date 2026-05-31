import type { NextConfig } from 'next';

const securityHeaders = [
  // Enable DNS prefetching for performance
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  // Force HTTPS for 2 years, include subdomains, allow preload list submission
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Prevent MIME-type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Prevent clickjacking
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // Control referrer info sent with requests
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Restrict browser feature access
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Next.js App Router requires 'unsafe-inline' for hydration scripts.
      // Upgrade to a nonce-based CSP when the app matures.
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      // data: for inline SVGs; blob: for next/image optimised output
      "img-src 'self' data: blob:",
      // Geist is self-hosted by next/font — no external font origin needed
      "font-src 'self'",
      "connect-src 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  // Remove the X-Powered-By: Next.js header (minor info disclosure reduction)
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },

  images: {
    // Local /public paths are allowed by default.
    // Add remote patterns here when logo CDN sources are confirmed, e.g.:
    // remotePatterns: [
    //   { protocol: 'https', hostname: 'www.thesportsdb.com' },
    //   { protocol: 'https', hostname: 'media.api-sports.io' },
    // ],
  },
};

export default nextConfig;
