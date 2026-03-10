# Plan: Rockilus Landing Page (rockilus-web)

## Design System (agreed)
- Color: Deep Blue + White — primary `#2563eb` (blue-600), dark `#1e3a8a` (blue-900), white bg
- Typography: Inter (already installed via next/font/google)
- UI Vibe: Minimal & Flat — whitespace-driven, no shadows, thin borders only for inputs
- No existing branding/logo assets

## TL;DR
Replace the default Next.js boilerplate in `rockilus-web/` with a multilingual (EN/FR/ES) marketing landing page. Use `app/[lang]` dynamic routing with `generateStaticParams` for static export, JSON dictionaries for translations, and modular marketing components styled with Tailwind v4 and the deep-blue design system.

---

## Phase 1: Design Foundation (parallel steps)

1. **Update `app/globals.css`** — Replace neutral/black shadcn default color tokens with deep-blue Tailwind v4 `@theme inline` variables using oklch values. Set primary → blue-600, accent → blue-900, muted → slate-50, border → slate-200. Zero shadow tokens. Keep existing structure, only update `:root` color values.

2. **Simplify `app/layout.tsx`** — Strip fonts/metadata boilerplate; keep minimal `<html lang="en" suppressHydrationWarning><body className="...inter...">{children}</body></html>` shell. Fonts and per-locale metadata move to `[lang]/layout.tsx`.

3. **Replace `app/page.tsx`** — Remove Next.js boilerplate. Add `'use client'` redirect using `useEffect(() => { window.location.replace('/en') }, [])` with a `<meta http-equiv="refresh" content="0;url=/en" />` fallback in head for static crawlers.

4. **Create `lib/dictionaries.ts`** — Server-only async loader: `getDictionary(lang: Locale)` dynamically imports `dictionaries/{lang}.json` with a typed `Dictionary` interface. No external lib needed — just `const dict = await import(../dictionaries/${lang}.json)`.

5. **Create `dictionaries/en.json`** — All English copy (nav, hero, problem/solution, 3 features, 4 how-it-works steps, final CTA, footer links).

6. **Create `dictionaries/fr.json`** — French translations of same keys.

7. **Create `dictionaries/es.json`** — Spanish translations of same keys.

---

## Phase 2: i18n Routing (depends on Phase 1)

8. **Create `app/[lang]/layout.tsx`** — Export `generateStaticParams` returning `[{lang:'en'},{lang:'fr'},{lang:'es'}]`. Export `generateMetadata` with locale-aware title/description. Render `<HtmlLangSync lang={params.lang} />` (client component defined in same directory) to update `document.documentElement.lang` on mount. Import Inter font here (removed from root layout).

9. **Create `app/[lang]/page.tsx`** — Async server component. Calls `getDictionary(params.lang)`. Renders all marketing sections in order: NavBar → Hero → ProblemSolution → CoreFeatures → HowItWorks → FinalCTA → Footer. Passes `dict` slices as props to each component.

---

## Phase 3: Marketing Components (parallel, depends on Phase 2 types)

All components live in `components/marketing/`. All accept a typed `dict` prop slice — no client components except the language toggle in NavBar.

10. **`NavBar.tsx`** — Server component. Fixed top, white bg, 1px bottom border. Logo left (text "Rockilus" in blue). Center links: Features, Pricing (anchor scroll). Right: "Get Started for Free" blue button + `<LangToggle>` client component. Mobile: hamburger menu using shadcn `Sheet`. The `LangToggle` is `'use client'` and uses `usePathname` + `router.push` to swap locale segment.

11. **`HeroSection.tsx`** — Full-width. Left col: H1 headline (large, bold, slate-900), subheadline (slate-600), CTA button (blue). Right col: gray placeholder div for dashboard mockup image (aspect-video, border, rounded). Two-col on md+, stacked on mobile.

12. **`ProblemSolution.tsx`** — Two-col (or two-card) layout. Left card: "The Problem" with bullet pain points (red/slate icons). Right card: "The Solution" with benefit bullets (blue check icons from lucide-react). Dividing line or generous gap.

13. **`CoreFeatures.tsx`** — Z-pattern: Feature 1 (text left, image placeholder right), Feature 2 (image left, text right), Feature 3 (text left, image right). Each `<FeatureRow>` sub-component takes title, description, isReversed bool. Image placeholders are styled divs.

14. **`HowItWorks.tsx`** — 4-step horizontal row (on md+) / vertical stack (mobile). Each step: circle number, lucide icon, step title, short description. Steps: Onboard → Set Constraints → Generate → Publish.

15. **`FinalCTA.tsx`** — Centered section with large heading, subheadline, and a prominent blue CTA button. Light blue-tinted muted background (`bg-blue-50` equivalent via CSS var).

16. **`Footer.tsx`** — Simple 3-col grid: brand + tagline | links (Features, Pricing, Privacy, Terms, Contact) | language selector (`LangToggle` reuse). Bottom bar with copyright. No heavy styling.

---

## Relevant Files

- `rockilus-web/app/globals.css` — Update `:root` color tokens to deep-blue palette (oklch)
- `rockilus-web/app/layout.tsx` — Simplify to minimal shell
- `rockilus-web/app/page.tsx` — Replace with static redirect to `/en`
- `rockilus-web/app/[lang]/layout.tsx` — NEW: generateStaticParams + generateMetadata + HtmlLangSync
- `rockilus-web/app/[lang]/page.tsx` — NEW: landing page composition
- `rockilus-web/lib/dictionaries.ts` — NEW: typed dictionary loader
- `rockilus-web/dictionaries/en.json` — NEW
- `rockilus-web/dictionaries/fr.json` — NEW
- `rockilus-web/dictionaries/es.json` — NEW
- `rockilus-web/components/marketing/NavBar.tsx` — NEW
- `rockilus-web/components/marketing/HeroSection.tsx` — NEW
- `rockilus-web/components/marketing/ProblemSolution.tsx` — NEW
- `rockilus-web/components/marketing/CoreFeatures.tsx` — NEW
- `rockilus-web/components/marketing/HowItWorks.tsx` — NEW
- `rockilus-web/components/marketing/FinalCTA.tsx` — NEW
- `rockilus-web/components/marketing/Footer.tsx` — NEW
- `rockilus-web/components/marketing/LangToggle.tsx` — NEW (client, shared by NavBar + Footer)

---

## Verification

1. `cd rockilus-web && npx tsc --noEmit` — zero TypeScript errors
2. `cd rockilus-web && npm run build` — static export succeeds, all 3 locale routes generated (`out/en/index.html`, `out/fr/index.html`, `out/es/index.html`)
3. Open `out/en/index.html` in browser — verify Nav, Hero, all sections render correctly
4. Open `out/fr/index.html` and `out/es/index.html` — verify French and Spanish copy
5. Resize to mobile width — verify responsive layout (hamburger menu, stacked sections)

---

## Decisions

- **Tailwind v4 only**: No `tailwind.config.ts`; all tokens live in `app/globals.css` under `@theme inline`. Color tweaks go in `:root`.
- **No external i18n lib**: Pure Next.js dictionary pattern with typed JSON files and `getDictionary()`. Zero client JS overhead for translations.
- **Static redirect**: Root `/` uses `useEffect` + `<meta refresh>` (not middleware), compatible with `output: 'export'`.
- **`<html lang="">` trade-off**: Root `app/layout.tsx` sets `lang="en" suppressHydrationWarning`. The `HtmlLangSync` client component corrects it to the active locale at runtime. Static HTML files for `/fr` and `/es` will have `lang="en"` in the raw HTML, which `HtmlLangSync` corrects on load. `generateMetadata` includes `alternates.languages` for SEO. This is acceptable for a v1 marketing page.
- **Scope**: First draft / boilerplate — no real images (placeholders), no actual pricing page, no form backend. Just structure + copy + styling.

## Further Considerations

1. **`<html lang>` in static HTML**: To have the correct `lang` attribute baked into static HTML, move `html/body` from root layout to `app/[lang]/layout.tsx` and make root layout return `{children}` only. Next.js will warn but in v14+ it builds without error when a nested layout provides them. Worth revisiting before launch.
2. **Logo/hero image**: Plan includes placeholders. Once brand assets exist, swap the styled `<div>` placeholders with `<img>` (not `next/image` unless `unoptimized: true` is set in `next.config.ts`).
3. **Language detection UX**: Currently defaults `/` → `/en`. Could later serve a geo-detection landing by adding an API call client-side — but must stay client-only to respect static export constraint.
