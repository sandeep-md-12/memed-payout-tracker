import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The Docker image sets NEXT_OUTPUT=standalone to get a small self-contained server;
  // Vercel and local dev use the default output.
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
};

export default nextConfig;
