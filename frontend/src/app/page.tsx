"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { detectLanguage } from "./lib/language-detection";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const detectedLang = detectLanguage();
    router.replace(`/${detectedLang}/`);
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div>Redirecting...</div>
    </div>
  );
}
