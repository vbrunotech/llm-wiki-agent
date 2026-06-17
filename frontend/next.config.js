/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8789/api/:path*',
      },
    ]
  },
}

module.exports = nextConfig
