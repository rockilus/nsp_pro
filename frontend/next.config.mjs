/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
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
};

export default nextConfig;
