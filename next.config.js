/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [
      {
        // Allow /register to be embedded as an iframe from any domain (e.g. WordPress)
        source: '/register',
        headers: [
          { key: 'X-Frame-Options',          value: 'ALLOWALL' },
          { key: 'Content-Security-Policy',   value: "frame-ancestors *" },
        ],
      },
    ]
  },
}

module.exports = nextConfig

