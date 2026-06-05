'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../../../app/i18n/client';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
// Navigation
import MobileNavAppBar from '@/components/app-bar/mobile-nav-app-bar';
// Dialogs
import WorkerEditDialog from '../worker-edit-dialog/WorkerEditDialog';
// Hooks
import { useGetWorkersTabData, useUpdateWorker } from '../../../hooks/useWorker';
import { useUpdateAttribute } from '../../../hooks/useAttribute';
// Types
import { WorkerT } from '../../../types/worker';
import { DimensionT } from '../../../types/dimension';
import { DimEntryT } from '@/types/dim-entry';
import { AttributeT, AttributeOwnerType } from '../../../types/attribute';
import { SpecialtyT } from '@/types/specialty';

export default function MobileWorkerTab({
  lng,
  selectedTeamId,
}: {
  lng: string;
  selectedTeamId: string | null;
}) {
  const { t } = useTranslation(lng, 'worker-page');

  const [workers, setWorkers] = useState<WorkerT[]>([]);
  const [dimensions, setDimensions] = useState<DimensionT[]>([]);
  const [dimEntries, setDimEntries] = useState<DimEntryT[]>([]);
  const [specialties, setSpecialties] = useState<SpecialtyT[]>([]);
  const [editingWorker, setEditingWorker] = useState<WorkerT | null>(null);
  const [loading, setLoading] = useState(false);

  const getWorkersTabDataFn = useGetWorkersTabData();
  const updateWorkerFn = useUpdateWorker();
  const updateAttributeFn = useUpdateAttribute();

  // Fetch data when team changes
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedTeamId) return;
      setLoading(true);
      try {
        const data = await getWorkersTabDataFn(selectedTeamId);
        setWorkers(data.workers);
        setDimensions(data.dimensions);
        setDimEntries(data.dimEntries);
        setSpecialties(data.specialties);
      } catch (error) {
        console.error('Failed to fetch workers tab data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedTeamId, getWorkersTabDataFn]);

  // Persist worker update and refresh local state
  const handleUpdateWorker = useCallback(
    async (updatedWorker: WorkerT) => {
      const persisted = await updateWorkerFn(updatedWorker);
      setWorkers((prev) => prev.map((w) => (w.id === persisted.id ? persisted : w)));
    },
    [updateWorkerFn],
  );

  // Persist attribute update and refresh local worker state
  const handleUpdateAttribute = useCallback(
    async (attribute: AttributeT, teamId: string) => {
      const persisted = await updateAttributeFn(attribute, teamId);
      setWorkers((prev) =>
        prev.map((w) =>
          w.id === persisted.ownerId
            ? {
                ...w,
                attributes: w.attributes.some((a) => a.id === persisted.id)
                  ? w.attributes.map((a) => (a.id === persisted.id ? { ...a, ...persisted } : a))
                  : [...w.attributes, persisted],
              }
            : w,
        ),
      );
    },
    [updateAttributeFn],
  );

  if (!selectedTeamId) {
    return <MobileNavAppBar lng={lng} />;
  }

  return (
    <>
      <MobileNavAppBar lng={lng} />
      <div className="flex h-[calc(100vh-64px)] flex-col overflow-hidden">
        {/* Loading state */}
        {loading && (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Empty state */}
        {!loading && workers.length === 0 && (
          <div className="flex flex-1 items-center justify-center p-4">
            <p
              className="text-center text-muted-foreground"
              data-testid="mobile-worker-empty-state"
            >
              {t('no_workers_found')}
            </p>
          </div>
        )}

        {/* Worker card list */}
        {!loading && workers.length > 0 && (
          <div className="flex-1 space-y-2 overflow-y-auto p-3" data-testid="mobile-worker-list">
            {workers.map((worker) => (
              <MobileWorkerCard
                key={worker.id}
                worker={worker}
                specialties={specialties}
                onClick={() => setEditingWorker(worker)}
              />
            ))}
          </div>
        )}

        {/* Edit dialog */}
        {editingWorker && (
          <WorkerEditDialog
            lng={lng}
            open={!!editingWorker}
            onClose={() => setEditingWorker(null)}
            worker={editingWorker}
            dimensions={dimensions}
            dimEntries={dimEntries}
            specialties={specialties}
            handleUpdateWorker={handleUpdateWorker}
            handleUpdateAttribute={handleUpdateAttribute}
          />
        )}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────
// MobileWorkerCard — individual worker card
// ─────────────────────────────────────────────
function MobileWorkerCard({
  worker,
  specialties,
  onClick,
}: {
  worker: WorkerT;
  specialties: SpecialtyT[];
  onClick: () => void;
}) {
  const initials = worker.acronym || worker.name?.charAt(0)?.toUpperCase() || '?';
  const specialtyNames = worker.specialtyIds
    .map((id) => specialties.find((s) => s.id === id)?.name)
    .filter(Boolean) as string[];

  return (
    <div
      onClick={onClick}
      className="flex cursor-pointer flex-col gap-2 rounded-lg border border-border bg-card p-3 shadow-sm transition-colors hover:bg-accent/50 active:bg-accent"
      data-testid={`mobile-worker-card-${worker.id}`}
    >
      {/* Top row: avatar + name + acronym */}
      <div className="flex items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {initials}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{worker.name || t_fallback('Unnamed')}</p>
          <p className="truncate text-xs text-muted-foreground">{worker.acronym || '—'}</p>
        </div>
      </div>

      {/* Metrics row: weekly hours + annual leave */}
      <div className="flex items-center gap-3 pl-12 text-xs text-muted-foreground">
        <span data-testid={`mobile-worker-hours-${worker.id}`}>{worker.weeklyHours}h</span>
        <span aria-hidden="true">·</span>
        <span data-testid={`mobile-worker-leave-${worker.id}`}>{worker.annualLeave}d</span>
      </div>

      {/* Specialty badges */}
      {specialtyNames.length > 0 && (
        <div className="flex flex-wrap gap-1 pl-12">
          {specialtyNames.map((name) => (
            <Badge key={name} variant="secondary" className="px-1.5 py-0 text-xs">
              {name}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// Static fallback so the card component works without the t() hook;
// the real consumer uses i18n for other strings.
function t_fallback(s: string) {
  return s;
}
