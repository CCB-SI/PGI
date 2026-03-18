/** @type {import('next').NextConfig} */
const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

const remotePatterns = [
  {
    protocol: 'http',
    hostname: 'localhost',
    port: '8005',
    pathname: '/uploads/**',
  },
  {
    protocol: 'http',
    hostname: '69.169.103.28',
    port: '8005',
    pathname: '/uploads/**',
  },
];

if (backendUrl) {
  try {
    const parsed = new URL(backendUrl);
    remotePatterns.push({
      protocol: parsed.protocol.replace(':', ''),
      hostname: parsed.hostname,
      port: parsed.port,
      pathname: '/uploads/**',
    });
  } catch {}
}

const nextConfig = {
  images: {
    remotePatterns,
  },
};

export default nextConfig;
