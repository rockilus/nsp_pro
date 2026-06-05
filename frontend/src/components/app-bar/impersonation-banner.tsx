'use client';

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
// Components
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
// Hooks
import {
  getImpersonationTarget,
  ImpersonationTarget,
  useStopAdminImpersonation,
} from '@/hooks/useAdminImpersonation';
import {
  isImpersonationTokenExpired,
  clearImpersonationTarget,
} from '@/app/lib/impersonation-storage';

/**
 * Sticky banner displayed at the top of every page when an admin is
 * currently accessing another user's account.
 *
 * Reads impersonation state from sessionStorage (written by
 * useStartImpersonationWithTarget) and renders nothing when inactive.
 */
export default function ImpersonationBanner() {
  const [target, setTarget] = useState<ImpersonationTarget | null>(() => {
    const stored = getImpersonationTarget();
    if (stored && isImpersonationTokenExpired()) {
      // Token already expired on load — silently clear so the user isn't stuck
      clearImpersonationTarget();
      return null;
    }
    return stored;
  });
  const [stopping, setStopping] = useState(false);
  const [stopError, setStopError] = useState<string | null>(null);

  const stopImpersonation = useStopAdminImpersonation();

  if (!target) return null;

  const handleStop = async () => {
    setStopping(true);
    setStopError(null);
    try {
      await stopImpersonation();
      // Navigation happens inside the hook; clear local state as fallback
      setTarget(null);
    } catch (err) {
      console.error('Failed to stop impersonation:', err);
      setStopError(err instanceof Error ? err.message : 'Failed to stop impersonation');
      setStopping(false);
    }
  };

  return (
    <div data-testid="impersonation-banner" className="sticky top-0 z-50 w-full">
      <Alert className="rounded-none border-amber-300 bg-amber-100 py-2 dark:border-amber-700 dark:bg-amber-900/50">
        <div className="flex w-full items-center justify-between gap-3">
          <AlertDescription className="text-sm text-amber-900 dark:text-amber-100">
            You are viewing the account of{' '}
            <strong>
              {target.firstName} {target.lastName}
            </strong>{' '}
            ({target.email})
          </AlertDescription>
          <Button
            data-testid="stop-impersonation-btn"
            variant="outline"
            size="sm"
            onClick={handleStop}
            disabled={stopping}
            className="shrink-0 border-amber-400 whitespace-nowrap text-amber-900 hover:bg-amber-200 dark:border-amber-600 dark:text-amber-100 dark:hover:bg-amber-800"
          >
            {stopping ? (
              <>
                <Loader2 className="mr-1 size-3.5 animate-spin" />
                Stopping…
              </>
            ) : (
              'Stop impersonating'
            )}
          </Button>
        </div>
        {stopError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{stopError}</p>}
      </Alert>
    </div>
  );
}
