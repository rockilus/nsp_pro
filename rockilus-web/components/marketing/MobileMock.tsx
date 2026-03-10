"use client";
import React, { useEffect, useState } from "react";
import type { Locale } from "@/lib/dictionaries";

interface BreakpointConfig {
  minWidth: number; // in px
  width: number; // mobile mock width in px
  bottom: number; // bottom offset in px (can be negative)
  right?: number; // right offset in px
}

const DEFAULT_CONFIG: BreakpointConfig[] = [
  { minWidth: 0, width: 120, bottom: -100, right: 16 },
  { minWidth: 640, width: 220, bottom: -180, right: 20 },
  { minWidth: 768, width: 280, bottom: -260, right: 24 },
  { minWidth: 1024, width: 320, bottom: -200, right: 32 },
];

function mobileImagePath(lang: Locale): string {
  const localesWithMobile: Locale[] = ["en"];
  const resolved = localesWithMobile.includes(lang) ? lang : "en";
  return `/images/landing-page/hero-section/${resolved}/schedule.mobile.1284.v1.jpeg`;
}

export default function MobileMock({
  lang,
  config = DEFAULT_CONFIG,
}: {
  lang: Locale;
  config?: BreakpointConfig[];
}) {
  const [size, setSize] = useState<{
    width: number;
    bottom: number;
    right: number;
  }>(() => {
    const c = config[0];
    return { width: c.width, bottom: c.bottom, right: c.right ?? 16 };
  });

  useEffect(() => {
    function update() {
      const w = window.innerWidth;
      // find the largest config with minWidth <= w
      let chosen = config[0];
      for (const c of config) {
        if (c.minWidth <= w && c.minWidth >= chosen.minWidth) chosen = c;
      }
      setSize({
        width: chosen.width,
        bottom: chosen.bottom,
        right: chosen.right ?? 16,
      });
    }

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [config]);

  // scale visual details relative to a base width (360px)
  const base = 360;
  const scale = Math.max(0.4, size.width / base);
  const borderRadius = Math.round(32 * scale); // base 32px for 360
  const borderWidth = Math.max(1, Math.round(3 * scale));
  const islandW = Math.max(28, Math.round(80 * scale));
  const islandH = Math.max(8, Math.round(22 * scale));
  const islandTop = Math.max(4, Math.round(8 * scale));

  return (
    <div
      style={{
        position: "absolute",
        right: `${size.right}px`,
        bottom: `${size.bottom}px`,
        width: `${size.width}px`,
        borderRadius: `${borderRadius}px`,
        borderStyle: "solid",
        borderWidth: `${borderWidth}px`,
      }}
      className="border-slate-800 bg-slate-800 shadow-2xl overflow-hidden aspect-[9/19.5]"
    >
      {/* Dynamic island - sized via inline styles to remain proportional */}
      <div
        style={{
          top: `${islandTop}px`,
          width: `${islandW}px`,
          height: `${islandH}px`,
          borderRadius: `${Math.round(islandH / 2)}px`,
        }}
        className="absolute left-1/2 -translate-x-1/2 z-10 bg-slate-900"
      />
      <img
        src={mobileImagePath(lang)}
        alt="Rockilus schedule — mobile view"
        className="w-full h-full object-cover object-top"
      />
    </div>
  );
}
