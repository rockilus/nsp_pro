"use client";

import React from "react";
import type { Locale } from "@/lib/dictionaries";

interface FeatureImageProps {
  locale: Locale;
  name: string;
  alt?: string;
  className?: string;
}

function resolveImagePath(locale: Locale, name: string) {
  const LOCALES_WITH_IMAGES = ["en", "fr", "es"];
  const resolved = LOCALES_WITH_IMAGES.includes(locale) ? locale : "en";
  return `/images/landing-page/features/${resolved}/${name}`;
}

export default function FeatureImage({
  locale,
  name,
  alt,
  className,
}: FeatureImageProps) {
  const src = resolveImagePath(locale, name);

  return (
    <div
      className={`aspect-video bg-slate-100 border border-slate-200 rounded-lg overflow-hidden flex items-center justify-center ${
        className ?? ""
      }`}
    >
      <img
        src={src}
        alt={alt ?? ""}
        className="w-full h-full object-cover object-center"
      />
    </div>
  );
}
