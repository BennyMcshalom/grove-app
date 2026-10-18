import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The marketing site (public/landing, plain HTML/CSS/JS) at grouv.app/landing.
  // A plain list runs after the filesystem check, so it only catches /landing itself.
  async rewrites() {
    return [{ source: "/landing", destination: "/landing/index.html" }];
  },
  // Security headers on everything. The Content-Security-Policy is set per
  // request in src/proxy.ts (it carries a nonce); see src/lib/csp.ts.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // HTTPS only, for two years, subdomains included.
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // No other site may frame Grouv (clickjacking). The CSP says the same for newer browsers.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Other sites' windows can't reach into ours. Google sign-in is a full redirect, not a popup.
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          {
            key: "Permissions-Policy",
            value:
              'camera=(self), microphone=(self), geolocation=(self), payment=(self "https://js.stripe.com"), display-capture=(), usb=(), serial=(), hid=(), bluetooth=(), browsing-topics=()',
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      // Avatars uploaded to the public `avatars` bucket.
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
      // Profile photos from Google sign-in.
      { protocol: "https", hostname: "lh3.googleusercontent.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
