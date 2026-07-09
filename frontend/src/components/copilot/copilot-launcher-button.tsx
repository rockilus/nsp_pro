'use client';

import { SparklesIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/app/i18n/client';
import { useCopilotOptional } from '@/context/CopilotContext';

/**
 * Nav-bar trigger that opens the copilot panel. Rendered in both the desktop
 * and mobile app bars. Renders nothing outside a `CopilotProvider` (e.g. the
 * admin area) so the shared nav bar stays reusable.
 */
export function CopilotLauncherButton({ lng }: { lng: string }) {
  const { t } = useTranslation(lng, 'copilot');
  const copilot = useCopilotOptional();

  if (!copilot) return null;

  return (
    <Button variant="ghost" size="icon" aria-label={t('open')} onClick={copilot.openCopilot}>
      <SparklesIcon className="size-5" />
    </Button>
  );
}
