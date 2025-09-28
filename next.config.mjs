/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Only use static export for Electron builds, not for web deployment
  ...(process.env.BUILD_FOR_ELECTRON === 'true' && {
    output: 'export',
    trailingSlash: true,
    distDir: 'out',
    assetPrefix: './',
  }),
}

export default nextConfig