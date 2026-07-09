import type { ComponentProps } from 'react';
import type { PendingActionCard } from './pending-action-card';

type ActionLabels = ComponentProps<typeof PendingActionCard>['labels'];

type TFn = (key: string) => string;

/** Build the localized labels consumed by the pending-action card. */
export function buildActionLabels(t: TFn): ActionLabels {
  return {
    proposedChanges: t('action.proposedChanges'),
    confirmDeleteTitle: t('action.confirmDeleteTitle'),
    confirmDeleteBody: t('action.confirmDeleteBody'),
    apply: t('action.apply'),
    cancel: t('action.cancel'),
    confirmDelete: t('action.confirmDelete'),
    applied: t('action.applied'),
    cancelled: t('action.cancelled'),
  };
}
