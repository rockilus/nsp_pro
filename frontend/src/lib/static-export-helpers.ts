// This file is used to override dynamic settings for static export
// It should only be used when BUILD_STATIC=true

export const dynamic = "auto";
export const runtime = "edge";

// Mock cookies for static export
export function mockCookies() {
  return {
    get: () => undefined,
    set: () => {},
    delete: () => {},
    has: () => false,
    getAll: () => [],
  };
}

// Check if we're in static export mode
export const isStaticExport = process.env.BUILD_STATIC === "true";
