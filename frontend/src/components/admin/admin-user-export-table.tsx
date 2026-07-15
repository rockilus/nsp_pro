'use client';

import React, { useMemo, useState } from 'react';
import { useTranslation } from '@/app/i18n/client';
import { Download, Loader2 } from 'lucide-react';
// Types
import { AdminExportSelection, AdminTeamSummary } from '@/app/lib/api/adminApi';
// shadcn
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

// Must match EXPORTABLE_DATA_TYPES in the backend
// (backend/api_gateway/src/services/test_service.py)
export const EXPORT_DATA_TYPES = [
  'specialties',
  'workers',
  'shifts',
  'link_shifts',
  'dimensions',
  'dim_entries',
  'attributes',
  'shift_demand_templates',
  'shift_demands',
  'constraints',
  'requests',
  'schedules',
] as const;

type CheckedState = boolean | 'indeterminate';

interface AdminUserExportTableProps {
  lng: string;
  teams: AdminTeamSummary[];
  exporting: boolean;
  onExport: (selections: AdminExportSelection[]) => void;
}

export default function AdminUserExportTable({
  lng,
  teams,
  exporting,
  onExport,
}: AdminUserExportTableProps) {
  const { t } = useTranslation(lng, 'admin-user-details');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const cellKey = (teamId: string, dataType: string) => `${teamId}|${dataType}`;

  const toggleCell = (teamId: string, dataType: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const key = cellKey(teamId, dataType);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const columnState = (teamId: string): CheckedState => {
    const count = EXPORT_DATA_TYPES.filter((dt) => selected.has(cellKey(teamId, dt))).length;
    if (count === 0) return false;
    if (count === EXPORT_DATA_TYPES.length) return true;
    return 'indeterminate';
  };

  const rowState = (dataType: string): CheckedState => {
    const count = teams.filter((team) => selected.has(cellKey(team.id, dataType))).length;
    if (count === 0) return false;
    if (count === teams.length) return true;
    return 'indeterminate';
  };

  const toggleColumn = (teamId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const allChecked = EXPORT_DATA_TYPES.every((dt) => next.has(cellKey(teamId, dt)));
      EXPORT_DATA_TYPES.forEach((dt) => {
        if (allChecked) next.delete(cellKey(teamId, dt));
        else next.add(cellKey(teamId, dt));
      });
      return next;
    });
  };

  const toggleRow = (dataType: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const allChecked = teams.every((team) => next.has(cellKey(team.id, dataType)));
      teams.forEach((team) => {
        if (allChecked) next.delete(cellKey(team.id, dataType));
        else next.add(cellKey(team.id, dataType));
      });
      return next;
    });
  };

  const selections = useMemo<AdminExportSelection[]>(
    () =>
      teams
        .map((team) => ({
          teamId: team.id,
          dataTypes: EXPORT_DATA_TYPES.filter((dt) => selected.has(cellKey(team.id, dt))),
        }))
        .filter((selection) => selection.dataTypes.length > 0),
    [teams, selected],
  );

  return (
    <div data-testid="admin-user-export" className="space-y-3">
      <p className="text-sm text-muted-foreground">{t('exportDescription')}</p>
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold">{t('dataType')}</TableHead>
              {teams.map((team) => (
                <TableHead key={team.id} className="font-semibold">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      data-testid={`export-team-checkbox-${team.id}`}
                      aria-label={t('selectAllForTeam', { team: team.name })}
                      checked={columnState(team.id)}
                      onCheckedChange={() => toggleColumn(team.id)}
                    />
                    <span>{team.name}</span>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {EXPORT_DATA_TYPES.map((dataType) => (
              <TableRow key={dataType} data-testid={`export-row-${dataType}`}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      data-testid={`export-type-checkbox-${dataType}`}
                      aria-label={t('selectAllForDataType', {
                        dataType: t(`dataTypes.${dataType}`),
                      })}
                      checked={rowState(dataType)}
                      onCheckedChange={() => toggleRow(dataType)}
                    />
                    <span>{t(`dataTypes.${dataType}`)}</span>
                  </div>
                </TableCell>
                {teams.map((team) => (
                  <TableCell key={team.id}>
                    <Checkbox
                      data-testid={`export-cell-checkbox-${team.id}-${dataType}`}
                      aria-label={t('selectCell', {
                        team: team.name,
                        dataType: t(`dataTypes.${dataType}`),
                      })}
                      checked={selected.has(cellKey(team.id, dataType))}
                      onCheckedChange={() => toggleCell(team.id, dataType)}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Button
        data-testid="export-user-data-btn"
        disabled={exporting || selections.length === 0}
        onClick={() => onExport(selections)}
      >
        {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
        {exporting ? t('exporting') : t('exportButton')}
      </Button>
    </div>
  );
}
