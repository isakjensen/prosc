import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  serverExternalPackages: ['playwright'],
  async redirects() {
    return [
      {
        source: '/prospekts/:id',
        destination: '/kunder/:id',
        permanent: false,
      },
    ]
  },
}

export default nextConfig
