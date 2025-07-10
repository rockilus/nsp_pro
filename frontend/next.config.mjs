/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  experimental: {
    // Force all pages to be client-side for static export
    missingSuspenseWithCSRBailout: false,
  },
  // Webpack configuration to handle static export issues
  webpack: (config, { isServer, dev }) => {
    // For static export, we need to handle server-side imports gracefully
    if (!isServer && !dev) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
}

export default nextConfig;
