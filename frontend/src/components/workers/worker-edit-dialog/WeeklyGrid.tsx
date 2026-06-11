'use client';

import React from 'react';
import { useTranslation } from '../../../app/i18n/client';
import {
  WeeklyPreferences,
  WeeklySlotPreference,
  SlotRestriction,
  WeekParity,
} from '../../../types/worker';

interface WeeklyGridProps {
  lng: string;
  preferences: WeeklyPreferences;
  activeRestriction: SlotRestriction;
  weekMode: 'single' | 'even_odd';
  onChange: (prefs: WeeklyPreferences) => void;
}

const DAYS = [0, 1, 2, 3, 4, 5, 6] as const;
const SLOTS = ['morning', 'afternoon', 'night'] as const;
type SlotType = (typeof SLOTS)[number];

const DAY_I18N_KEYS: Record<number, string> = {
  0: 'monday_short',
  1: 'tuesday_short',
  2: 'wednesday_short',
  3: 'thursday_short',
  4: 'friday_short',
  5: 'saturday_short',
  6: 'sunday_short',
};

const SLOT_I18N_KEYS: Record<SlotType, string> = {
  morning: 'slot_morning',
  afternoon: 'slot_afternoon',
  night: 'slot_night',
};

const RESTRICTION_COLORS: Record<SlotRestriction, string> = {
  no_work: 'bg-red-500 hover:bg-red-600',
  no_normal: 'bg-amber-500 hover:bg-amber-600',
  no_duty: 'bg-blue-500 hover:bg-blue-600',
  no_specific: 'bg-purple-500 hover:bg-purple-600',
};

export default function WeeklyGrid({
  lng,
  preferences,
  activeRestriction,
  weekMode,
  onChange,
}: WeeklyGridProps) {
  const { t } = useTranslation(lng, 'worker-page');

  const findSlotPref = (
    dayOfWeek: number,
    slot: SlotType,
    parity: WeekParity,
  ): WeeklySlotPreference | undefined =>
    preferences.slots.find(
      (sp) => sp.dayOfWeek === dayOfWeek && sp.slot === slot && sp.weekParity === parity,
    );

  const toggleCell = (dayOfWeek: number, slot: SlotType, parity: WeekParity) => {
    const existing = findSlotPref(dayOfWeek, slot, parity);
    let newSlots: WeeklySlotPreference[];

    if (existing) {
      if (existing.restriction === activeRestriction) {
        // Remove this cell
        newSlots = preferences.slots.filter(
          (sp) => !(sp.dayOfWeek === dayOfWeek && sp.slot === slot && sp.weekParity === parity),
        );
      } else {
        // Replace with new restriction
        newSlots = preferences.slots.map((sp) =>
          sp.dayOfWeek === dayOfWeek && sp.slot === slot && sp.weekParity === parity
            ? { ...sp, restriction: activeRestriction }
            : sp,
        );
      }
    } else {
      // Add new
      newSlots = [
        ...preferences.slots,
        {
          dayOfWeek,
          slot,
          restriction: activeRestriction,
          shiftIds: [],
          weekParity: parity,
        },
      ];
    }

    onChange({ ...preferences, slots: newSlots });
  };

  const toggleColumn = (dayOfWeek: number, parity: WeekParity) => {
    const existingSlots = SLOTS.map((slot) => findSlotPref(dayOfWeek, slot, parity));
    const allMatch = existingSlots.every((sp) => sp?.restriction === activeRestriction);

    let newSlots = preferences.slots.filter(
      (sp) => !(sp.dayOfWeek === dayOfWeek && sp.weekParity === parity),
    );

    if (!allMatch) {
      const additions: WeeklySlotPreference[] = SLOTS.map((s) => ({
        dayOfWeek,
        slot: s,
        restriction: activeRestriction,
        shiftIds: [],
        weekParity: parity,
      }));
      newSlots = [...newSlots, ...additions];
    }

    onChange({ ...preferences, slots: newSlots });
  };

  const toggleRow = (slot: SlotType, parity: WeekParity) => {
    const existingSlots = DAYS.map((day) => findSlotPref(day, slot, parity));
    const allMatch = existingSlots.every((sp) => sp?.restriction === activeRestriction);

    let newSlots = preferences.slots.filter(
      (sp) => !(sp.slot === slot && sp.weekParity === parity),
    );

    if (!allMatch) {
      const additions: WeeklySlotPreference[] = DAYS.map((day) => ({
        dayOfWeek: day,
        slot,
        restriction: activeRestriction,
        shiftIds: [],
        weekParity: parity,
      }));
      newSlots = [...newSlots, ...additions];
    }

    onChange({ ...preferences, slots: newSlots });
  };

  const renderCell = (day: number, slot: SlotType, parity: WeekParity) => {
    const pref = findSlotPref(day, slot, parity);
    const isFilled = !!pref;
    return (
      <button
        key={`cell-${parity}-${day}-${slot}`}
        type="button"
        className={`mx-auto h-4 w-4 rounded-full transition-colors ${
          isFilled
            ? `${RESTRICTION_COLORS[pref.restriction]} text-white`
            : 'border border-dashed border-muted-foreground/30 hover:border-muted-foreground/50'
        }`}
        onClick={() => toggleCell(day, slot, parity)}
        data-testid={`weekly-grid-cell-${parity}-${day}-${slot}`}
      />
    );
  };

  const renderGrid = (parity: WeekParity, label: string) => (
    <div className="mb-2">
      {label && <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>}
      <div className="grid max-w-[184px] grid-cols-[auto_repeat(7,1fr)] gap-0.5">
        {/* Top-left empty cell */}
        <div />
        {/* Column headers */}
        {DAYS.map((day) => (
          <button
            key={`hdr-${parity}-${day}`}
            type="button"
            className="cursor-pointer rounded py-0.5 text-center text-[10px] font-semibold hover:bg-muted"
            onClick={() => toggleColumn(day, parity)}
            data-testid={`weekly-grid-col-${parity}-${day}`}
          >
            {t(DAY_I18N_KEYS[day])}
          </button>
        ))}
        {/* Rows */}
        {SLOTS.map((slot) => (
          <React.Fragment key={`row-${parity}-${slot}`}>
            <button
              type="button"
              className="cursor-pointer rounded px-0.5 py-0.5 text-right text-[10px] font-medium hover:bg-muted"
              onClick={() => toggleRow(slot, parity)}
              data-testid={`weekly-grid-row-${parity}-${slot}`}
            >
              {t(SLOT_I18N_KEYS[slot])}
            </button>
            {DAYS.map((day) => renderCell(day, slot, parity))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );

  // Side-by-side even/odd layout sharing row headers (md+ screens)
  const renderPairedGrid = () => (
    <div className="mb-2 hidden md:block">
      <div className="grid max-w-[420px] grid-cols-[auto_repeat(7,20px)_16px_repeat(7,20px)] gap-0.5">
        {/* Header row 1: week labels */}
        <div />
        <div className="col-span-7 py-0.5 text-center text-[10px] font-medium text-muted-foreground">
          {t('even_weeks')}
        </div>
        <div />
        <div className="col-span-7 py-0.5 text-center text-[10px] font-medium text-muted-foreground">
          {t('odd_weeks')}
        </div>

        {/* Header row 2: day letters */}
        <div />
        {(['even', 'odd'] as WeekParity[]).map((parity, pi) => (
          <React.Fragment key={`paired-hdr-group-${parity}`}>
            {pi === 1 && <div />}
            {DAYS.map((day) => (
              <button
                key={`paired-hdr-${parity}-${day}`}
                type="button"
                className="cursor-pointer rounded py-0.5 text-center text-[10px] font-semibold hover:bg-muted"
                onClick={() => toggleColumn(day, parity)}
                data-testid={`weekly-grid-col-${parity}-${day}`}
              >
                {t(DAY_I18N_KEYS[day])}
              </button>
            ))}
          </React.Fragment>
        ))}

        {/* Data rows */}
        {SLOTS.map((slot) => (
          <React.Fragment key={`paired-row-${slot}`}>
            <button
              type="button"
              className="cursor-pointer rounded px-0.5 py-0.5 text-right text-[10px] font-medium hover:bg-muted"
              onClick={() => {
                toggleRow(slot, 'even');
                toggleRow(slot, 'odd');
              }}
              data-testid={`weekly-grid-row-even_odd-${slot}`}
            >
              {t(SLOT_I18N_KEYS[slot])}
            </button>
            {(['even', 'odd'] as WeekParity[]).map((parity, pi) => (
              <React.Fragment key={`paired-cell-group-${parity}-${slot}`}>
                {pi === 1 && <div />}
                {DAYS.map((day) => renderCell(day, slot, parity))}
              </React.Fragment>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );

  // Stacked fallback for narrow screens
  const renderStackedGrids = () => (
    <div className="md:hidden">
      {renderGrid('even', t('even_weeks'))}
      {renderGrid('odd', t('odd_weeks'))}
    </div>
  );

  if (weekMode === 'even_odd') {
    return (
      <div>
        {renderPairedGrid()}
        {renderStackedGrids()}
      </div>
    );
  }

  return renderGrid('all', '');
}
