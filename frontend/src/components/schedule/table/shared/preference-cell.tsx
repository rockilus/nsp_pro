import React from 'react';
import { useTranslation } from '../../../../app/i18n/client';
// shadcn/ui
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../../ui/tooltip';
// Types
import { WorkerPreferenceCellData } from '../../../../types/schedule';
import { SlotRestriction } from '../../../../types/worker';

const RESTRICTION_COLORS: Record<SlotRestriction, string> = {
  no_work: 'bg-red-500',
  no_normal: 'bg-amber-500',
  no_duty: 'bg-blue-500',
  no_specific: 'bg-purple-500',
};

const RESTRICTION_I18N_KEYS: Record<SlotRestriction, string> = {
  no_work: 'restriction_no_work',
  no_normal: 'restriction_no_normal',
  no_duty: 'restriction_no_duty',
  no_specific: 'restriction_no_specific',
};

const SLOT_EMOJI: Record<string, string> = {
  morning: '🌅',
  afternoon: '☀️',
  night: '🌙',
};

const SLOT_I18N_KEYS: Record<string, string> = {
  morning: 'slot_morning',
  afternoon: 'slot_afternoon',
  night: 'slot_night',
};

export default function PreferenceCell({
  lng,
  preference,
}: {
  lng: string;
  preference: WorkerPreferenceCellData;
}) {
  const { t } = useTranslation(lng, 'worker-page');

  const colorClass = RESTRICTION_COLORS[preference.restriction] || 'bg-gray-400';
  const restrictionLabel = t(RESTRICTION_I18N_KEYS[preference.restriction]);
  const slotLabel = t(SLOT_I18N_KEYS[preference.slot] || preference.slot);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`mx-0 my-px flex h-5 cursor-default items-center justify-center rounded px-1 py-px text-xs ${colorClass}`}
            style={{ minWidth: '1.25rem' }}
          >
            {SLOT_EMOJI[preference.slot]}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            {slotLabel}: {restrictionLabel}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
