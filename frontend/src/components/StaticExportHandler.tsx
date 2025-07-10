"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function StaticExportHandler({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);

    // For static export, we need to handle authentication on the client side
    const isStaticExport =
      process.env.NODE_ENV === "production" && typeof window !== "undefined";

    if (isStaticExport) {
      // Check if we're on a protected route
      const protectedPaths = ["/plan"];
      const currentPath = window.location.pathname;
      const isProtectedRoute = protectedPaths.some((path) =>
        currentPath.includes(path)
      );

      if (isProtectedRoute) {
        // For static export demo, we could either:
        // 1. Redirect to login
        // 2. Show a message about needing server-side functionality
        // 3. Allow access but show limited functionality

        // For now, let's show a message
        console.log(
          "Static export: Protected route detected, handling client-side"
        );
      }
    }
  }, [router]);

  // Don't render children until we're on the client side for static exports
  if (!isClient) {
    return <div>Loading...</div>;
  }

  return <>{children}</>;
}
