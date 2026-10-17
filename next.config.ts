import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The marketing site (public/landing, plain HTML/CSS/JS) at grouv.app/landing.
  // A plain list runs after the filesystem check, so it only catches /landing itself.
  async rewrites() {
    return [{ source: "/landing", destination: "/landing/index.html" }];
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
