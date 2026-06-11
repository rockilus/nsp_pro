'use client';

import React from 'react';
import { useTranslation } from '../../../app/i18n/client';
import { WeeklyPreferences, SlotRestriction } from '../../../types/worker';
import WeeklyGrid from './WeeklyGrid';

interface WeeklyPreferencesSectionProps {
  lng: string;
  preferences: WeeklyPreferences;
  onChange: (prefs: WeeklyPreferences) => void;
}

// Shared color palette — matches the grid cell colors.
// Selected chips use the same solid bg as filled cells;
// unselected chips use a light/transparent version so the
// colour is always visible and serves as a legend.
const RESTRICTION_COLORS: Record<SlotRestriction, { solid: string; light: string }> = {
  no_work: {
    solid: 'bg-red-500 text-white',
    light: 'bg-red-500/20 text-red-700 border-red-300',
  },
  no_normal: {
    solid: 'bg-amber-500 text-white',
    light: 'bg-amber-500/20 text-amber-800 border-amber-300',
  },
  no_duty: {
    solid: 'bg-blue-500 text-white',
    light: 'bg-blue-500/20 text-blue-700 border-blue-300',
  },
  no_specific: {
    solid: 'bg-purple-500 text-white',
    light: 'bg-purple-500/20 text-purple-700 border-purple-300',
  },
};

const RESTRICTION_OPTIONS: { value: SlotRestriction; i18nKey: string }[] = [
  { value: 'no_work', i18nKey: 'restriction_no_work' },
  { value: 'no_normal', i18nKey: 'restriction_no_normal' },
  { value: 'no_duty', i18nKey: 'restriction_no_duty' },
];

export default function WeeklyPreferencesSection({
  lng,
  preferences,
  onChange,
}: WeeklyPreferencesSectionProps) {
  const { t } = useTranslation(lng, 'worker-page');

  const [activeRestriction, setActiveRestriction] = React.useState<SlotRestriction>('no_work');
  const [weekMode, setWeekMode] = React.useState<'single' | 'even_odd'>('single');

  return (
    <div>
      <SectionLabel label={t('section_weekly_preferences')} />

      {/* Week mode toggle */}
      <div className="mb-3 flex items-center gap-2">
        <span className="text-sm font-medium">{t('week_mode_label')}</span>
        <div className="flex rounded-md border">
          <button
            type="button"
            className={`cursor-pointer rounded-l-md px-3 py-1 text-xs transition-colors ${
              weekMode === 'single' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
            onClick={() => setWeekMode('single')}
            data-testid="week-mode-single"
          >
            {t('week_mode_single')}
          </button>
          <button
            type="button"
            className={`cursor-pointer rounded-r-md px-3 py-1 text-xs transition-colors ${
              weekMode === 'even_odd' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
            onClick={() => setWeekMode('even_odd')}
            data-testid="week-mode-even-odd"
          >
            {t('week_mode_even_odd')}
          </button>
        </div>
      </div>

      {/* Restriction selector — colour-coded legend */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <span className="text-sm font-medium">{t('restriction_label')}</span>
        {RESTRICTION_OPTIONS.map((opt) => {
          const isActive = activeRestriction === opt.value;
          const colors = RESTRICTION_COLORS[opt.value];
          return (
            <button
              key={opt.value}
              type="button"
              className={`cursor-pointer rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors select-none ${
                isActive ? colors.solid : colors.light
              }`}
              onClick={() => setActiveRestriction(opt.value)}
              data-testid={`restriction-${opt.value}`}
            >
              {t(opt.i18nKey)}
            </button>
          );
        })}
      </div>

      {/* The grid */}
      <WeeklyGrid
        lng={lng}
        preferences={preferences}
        activeRestriction={activeRestriction}
        weekMode={weekMode}
        onChange={onChange}
      />
    </div>
  );
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="mt-5 mb-3 first:mt-0">
      <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <hr className="border-border" />
    </div>
  );
}
