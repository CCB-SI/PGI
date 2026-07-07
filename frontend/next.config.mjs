/** @type {import('next').NextConfig} */
// Reescrita /api/v1 → API: em Docker use API_REWRITE_TARGET (ex.: http://backend:8000).
// NEXT_PUBLIC_BACKEND_URL: base pública para fotos no browser e fallback do proxy (dev na máquina).
const publicBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
const rewriteTarget =
  process.env.API_REWRITE_TARGET || publicBackendUrl || 'http://localhost:8005';

const remotePatterns = [
  {
    protocol: 'http',
    hostname: 'localhost',
    port: '8005',
    pathname: '/uploads/**',
  },
];

if (publicBackendUrl) {
  try {
    const parsed = new URL(publicBackendUrl);
    remotePatterns.push({
      protocol: parsed.protocol.replace(':', ''),
      hostname: parsed.hostname,
      ...(parsed.port ? { port: parsed.port } : {}),
      pathname: '/uploads/**',
    });
  } catch {}
}

const nextConfig = {
  images: {
    remotePatterns,
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${rewriteTarget}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
