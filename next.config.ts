import type { NextConfig } from "next";

/**
 * Product images live in the Supabase Storage bucket `product-images`.
 * The remote host is read from the environment so the same config works
 * locally and on Vercel without hardcoding secrets or hosts.
 */
function supabaseImageConfig(): NextConfig["images"] {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return {};

  try {
    const url = new URL(raw);
    return {
      remotePatterns: [
        {
          protocol: url.protocol === "http:" ? "http" : "https",
          hostname: url.hostname,
          pathname: "/storage/v1/object/public/**",
        },
      ],
    };
  } catch {
    return {};
  }
}

const nextConfig: NextConfig = {
  images: supabaseImageConfig(),
};

export default nextConfig;
