/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  // Turbopack configuration: explicitly set the workspace root so Next
  // doesn't attempt to infer it (which warns when multiple lockfiles
  // exist). An explicit turbopack config also silences the error that
  // occurs when a `webpack` config is present but no `turbopack` config
  // is defined.
  turbopack: {
    // Use the current package (frontend/) as the workspace root
    root: '.',
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
