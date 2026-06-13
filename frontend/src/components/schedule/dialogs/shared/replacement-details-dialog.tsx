import { Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ReplacementCandidateT } from '../../../../types/replacement';
import {
  renderBoolean,
  renderWeeklyTime,
  renderMonthlyDuties,
  renderConstraintHit,
  renderOverlapHit,
  renderFilterHit,
  renderRequestHit,
} from '../../../common/implications-renderers';
import { getCategoryEmoji } from '../../../../utils/replacementHelpers';
import { useTranslation } from '../../../../app/i18n/client';
import { WorkerT } from '../../../../types/worker';
import { ShiftT } from '../../../../types/shift';
import { AssignmentT } from '../../../../types/assignment';

interface ReplacementDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  candidates: ReplacementCandidateT[];
  onReplace: (candidateId: string) => void;
  isSubmitting: boolean;
  lng: string;
  assignment?: AssignmentT | null;
  workers?: WorkerT[];
  shifts?: ShiftT[];
}

// Column width for rotated metric columns
const COL_W = 40;

// Rotated header cell with native title tooltip
function RotatedHeader({ title, label }: { title: string; label: string }) {
  return (
    <th
      className="min-w-[40px] p-0 pb-1 font-bold"
      style={{ minWidth: COL_W, writingMode: 'sideways-lr' as React.CSSProperties['writingMode'] }}
    >
      <span title={title}>{label}</span>
    </th>
  );
}

export function ReplacementDetailsDialog({
  open,
  onClose,
  candidates,
  onReplace,
  isSubmitting,
  lng,
  assignment,
  workers,
  shifts,
}: ReplacementDetailsDialogProps) {
  const sortedCandidates = [...candidates].sort((a, b) => a.rank - b.rank);
  const headerWorkerName =
    assignment && workers ? workers.find((w) => w.id === assignment.workerId)?.name || '' : '';
  const { t } = useTranslation(lng, 'schedule-page');

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent
        className="max-w-[95vw] sm:max-w-[90vw] lg:max-w-[1200px]"
        data-testid="replacement-details-dialog"
      >
        <DialogHeader>
          <DialogTitle>
            {t('replace_dialog.title')}{' '}
            {headerWorkerName ? (
              <span className="font-bold">{headerWorkerName}</span>
            ) : (
              t('replace_dialog.assignment')
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Assignment info */}
        {assignment &&
          shifts &&
          (() => {
            const shift = shifts.find((s) => s.id === assignment.shiftId);
            const dateStr = assignment.date
              ? assignment.date.locale(lng).format('dddd, D MMMM')
              : '';
            if (!shift) return null;
            const startStr = shift.startTime.format('HH:mm');
            const endStr = shift.endTime.format('HH:mm');
            const endsNextDay =
              shift.endTime.isBefore(shift.startTime) ||
              shift.endTime.diff(shift.startTime, 'day') > 0;

            return (
              <div className="mb-3">
                <p className="text-base font-bold">{shift.name}</p>
                <p className="text-sm text-muted-foreground">
                  {dateStr}
                  {' \u00A0⋅\u00A0 '}
                  {startStr} – {endStr}
                  {endsNextDay && <sup>+1</sup>}
                </p>
              </div>
            );
          })()}

        {/* Table */}
        <div className="max-h-[600px] overflow-auto rounded-md border border-border">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                {/* Rank */}
                <th
                  className="sticky left-0 z-10 bg-popover p-0 text-center font-bold"
                  style={{ minWidth: 60 }}
                />
                {/* Candidate name */}
                <th
                  className="sticky left-[60px] z-10 bg-popover p-0 align-bottom font-bold"
                  style={{ minWidth: 180 }}
                >
                  {t('replace_dialog.candidate')}
                </th>
                {/* Category emoji */}
                <th
                  className="z-10 bg-popover p-0 text-center font-bold"
                  style={{ minWidth: 50 }}
                />
                {/* Rotated metric columns */}
                <RotatedHeader
                  title={t('replace_dialog.tooltip.h_week')}
                  label={t('replace_dialog.h_week')}
                />
                <RotatedHeader
                  title={t('replace_dialog.tooltip.duties_per_month')}
                  label={t('replace_dialog.duties_per_month')}
                />
                <RotatedHeader
                  title={t('replace_dialog.tooltip.shift_ltm')}
                  label={t('replace_dialog.shift_ltm')}
                />
                <RotatedHeader
                  title={t('replace_dialog.tooltip.day_ltm')}
                  label={t('replace_dialog.day_ltm')}
                />
                <RotatedHeader
                  title={t('replace_dialog.tooltip.soft')}
                  label={t('replace_dialog.soft')}
                />
                <RotatedHeader
                  title={t('replace_dialog.tooltip.hard')}
                  label={t('replace_dialog.hard')}
                />
                <RotatedHeader
                  title={t('replace_dialog.tooltip.request')}
                  label={t('replace_dialog.request')}
                />
                <RotatedHeader
                  title={t('replace_dialog.tooltip.overlap')}
                  label={t('replace_dialog.overlap')}
                />
                <RotatedHeader
                  title={t('replace_dialog.tooltip.filter')}
                  label={t('replace_dialog.filter')}
                />
                <RotatedHeader
                  title={t('replace_dialog.tooltip.leave')}
                  label={t('replace_dialog.leave')}
                />
                <RotatedHeader
                  title={t('replace_dialog.tooltip.specialty')}
                  label={t('replace_dialog.specialty')}
                />
                <RotatedHeader
                  title={t('replace_dialog.tooltip.employed')}
                  label={t('replace_dialog.employed')}
                />
                {/* Actions column */}
                <th className="p-0 text-center align-bottom font-bold" style={{ minWidth: 120 }} />
              </tr>
            </thead>
            <tbody>
              {sortedCandidates.map((candidate) => {
                const isCurrentWorker = candidate.rank === 0;
                const impl = candidate.replacementImplications;

                return (
                  <tr
                    key={candidate.workerId}
                    data-testid={`candidate-row-${candidate.workerId}`}
                    className={isCurrentWorker ? 'border-b-[3px] border-primary bg-muted/50' : ''}
                  >
                    {/* Rank */}
                    <td
                      className="sticky left-0 z-[1] bg-popover p-0 text-center"
                      style={isCurrentWorker ? { backgroundColor: undefined } : {}}
                    >
                      {isCurrentWorker ? '' : candidate.rank}
                    </td>
                    {/* Worker name */}
                    <td
                      className="sticky left-[60px] z-[1] bg-popover p-0"
                      style={isCurrentWorker ? { backgroundColor: undefined } : {}}
                    >
                      <span className="text-sm font-medium">{candidate.workerName}</span>
                    </td>
                    {/* Category emoji */}
                    <td className="z-[1] bg-popover p-0 text-center">
                      <span className="text-lg">
                        {getCategoryEmoji(candidate.replacementCategory)}
                      </span>
                    </td>
                    {/* Metric cells */}
                    <td className="p-0 text-center">{renderWeeklyTime(impl)}</td>
                    <td className="p-0 text-center">{renderMonthlyDuties(impl)}</td>
                    <td className="p-0 text-center">{impl.nbTimesDidShiftLtm.count}</td>
                    <td className="p-0 text-center">{impl.nbTimesWorkedWeekdayLtm.count}</td>
                    <td className="p-0 text-center">
                      {renderConstraintHit(impl.softConstraintHits, 'soft')}
                    </td>
                    <td className="p-0 text-center">
                      {renderConstraintHit(impl.hardConstraintHits, 'hard')}
                    </td>
                    <td className="p-0 text-center">{renderRequestHit(impl)}</td>
                    <td className="p-0 text-center">{renderOverlapHit(impl)}</td>
                    <td className="p-0 text-center">{renderFilterHit(impl)}</td>
                    <td className="p-0 text-center">{renderBoolean(impl.isntOnLeave)}</td>
                    <td className="p-0 text-center">{renderBoolean(impl.hasSpecialty)}</td>
                    <td className="p-0 text-center">{renderBoolean(impl.isEmployed)}</td>
                    {/* Replace button */}
                    <td className="p-0 text-center">
                      {!isCurrentWorker && (
                        <Button
                          size="xs"
                          variant="default"
                          onClick={() => onReplace(candidate.workerId)}
                          disabled={isSubmitting}
                          data-testid={`replace-candidate-${candidate.workerId}`}
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="mr-0.5 size-3 animate-spin" />
                              {t('replace_dialog.replacing')}
                            </>
                          ) : (
                            t('replace_dialog.replace')
                          )}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
