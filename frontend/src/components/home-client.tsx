"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCookies } from "react-cookie";
import { cookieName } from "../app/i18n/settings";
// Components
import { TryRefreshComponent } from "./tryRefreshClientComponent";
import { SessionAuthForNextJS } from "./sessionAuthForNextJS";

interface HomePageClientProps {
  lng: string;
}

export function HomePageClient({ lng }: HomePageClientProps) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [hasToken, setHasToken] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [cookies] = useCookies(["sAccessToken"]);
  const router = useRouter();

  useEffect(() => {
    // Get the access token from cookies on client side
    const token = cookies.sAccessToken;
    setAccessToken(token);
    setHasToken(!!token);
    setLoading(false);

    // If no token at all, redirect to auth
    if (!token) {
      router.push(`/${lng}/auth`);
    }
  }, [cookies.sAccessToken, lng, router]);

  if (loading) {
    return <div>Loading...</div>;
  }

  // No token at all - redirect to auth (handled in useEffect)
  if (!hasToken) {
    return <div>Redirecting to login...</div>;
  }

  // Has token but might be expired - try to use it or refresh
  if (!accessToken) {
    return <TryRefreshComponent key={Date.now()} />;
  }

  // For static export, we'll keep it simple and just show a basic message
  // In production, you might want to validate the token client-side
  return (
    <div>
      <h1>Welcome to NSP Pro</h1>
      <p>You are logged in!</p>
      {/* You can add more client-side functionality here */}
    </div>
  );
}
