'use client';

import React from 'react';
import { useTranslation } from '@/app/i18n/client';

interface ImportLegendProps {
  lng: string;
}

/** Compact inline legend explaining the three text colors in import preview tables. */
export default function ImportLegend({ lng }: ImportLegendProps) {
  const { t } = useTranslation(lng, 'admin-import');

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs">
      <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
        <span className="text-base leading-none select-none">●</span>
        {t('legend_imported')}
      </span>
      <span className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400">
        <span className="text-base leading-none select-none">●</span>
        {t('legend_default')}
      </span>
      <span className="flex items-center gap-1.5 text-foreground">
        <span className="text-base leading-none select-none">●</span>
        {t('legend_edited')}
      </span>
    </div>
  );
}
