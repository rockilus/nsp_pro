'use client';

import React from 'react';
import { useTranslation } from '../../../app/i18n/client';
import { Badge } from '@/components/ui/badge';
import { WeeklyPreferences, SlotRestriction } from '../../../types/worker';
import WeeklyGrid from './WeeklyGrid';

interface WeeklyPreferencesSectionProps {
  lng: string;
  preferences: WeeklyPreferences;
  onChange: (prefs: WeeklyPreferences) => void;
}

const RESTRICTION_OPTIONS: { value: SlotRestriction; i18nKey: string }[] = [
  { value: 'no_work', i18nKey: 'restriction_no_work' },
  { value: 'no_normal', i18nKey: 'restriction_no_normal' },
  { value: 'no_duty', i18nKey: 'restriction_no_duty' },
];

const DEFAULT_PREFS: WeeklyPreferences = {
  enabled: false,
  slots: [],
};

export default function WeeklyPreferencesSection({
  lng,
  preferences,
  onChange,
}: WeeklyPreferencesSectionProps) {
  const { t } = useTranslation(lng, 'worker-page');

  const prefs = preferences || DEFAULT_PREFS;
  const [activeRestriction, setActiveRestriction] = React.useState<SlotRestriction>('no_work');
  const [weekMode, setWeekMode] = React.useState<'single' | 'even_odd'>('single');

  const handleToggleEnabled = (enabled: boolean) => {
    onChange({ ...prefs, enabled });
  };

  return (
    <div>
      <SectionLabel label={t('section_weekly_preferences')} />

      {/* Disabled state: show a simple toggle */}
      {!prefs.enabled ? (
        <p className="text-sm text-muted-foreground">{t('weekly_preferences_disabled_desc')}</p>
      ) : (
        <>
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

          {/* Restriction selector — "painting tool" */}
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-medium">{t('restriction_label')}</span>
            {RESTRICTION_OPTIONS.map((opt) => (
              <Badge
                key={opt.value}
                variant={activeRestriction === opt.value ? 'default' : 'outline'}
                className="cursor-pointer select-none"
                onClick={() => setActiveRestriction(opt.value)}
                data-testid={`restriction-${opt.value}`}
              >
                {t(opt.i18nKey)}
              </Badge>
            ))}
          </div>

          {/* The grid */}
          <WeeklyGrid
            lng={lng}
            preferences={prefs}
            activeRestriction={activeRestriction}
            weekMode={weekMode}
            onChange={onChange}
          />
        </>
      )}

      {/* Toggle enable/disable at the bottom */}
      <div className="mt-3 flex items-center gap-2">
        <input
          type="checkbox"
          id="weekly-prefs-enabled"
          checked={prefs.enabled}
          onChange={(e) => handleToggleEnabled(e.target.checked)}
          className="h-4 w-4 cursor-pointer"
          data-testid="weekly-prefs-enabled-checkbox"
        />
        <label htmlFor="weekly-prefs-enabled" className="cursor-pointer text-sm">
          {t('weekly_preferences_enabled')}
        </label>
      </div>
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
