/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    unoptimized: true,
  },
  // Ensure outputs/ directory is bundled into Vercel serverless functions
  // so pre-generated JSON data is accessible at runtime
  outputFileTracingIncludes: {
    "/api/*": ["./outputs/**/*"],
  },
}

export default nextConfig
