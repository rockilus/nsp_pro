import React from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '../../../../app/i18n/client';
import { ReplacementCandidateT, MostConstrainingReasonT } from '../../../../types/replacement';
import {
  getCategoryEmoji,
  getReasonLabel,
  formatWeeklyTime,
  formatMonthlyDuties,
} from '../../../../utils/replacementHelpers';
import { useIsMobile } from '@/hooks/useIsMobile';

interface ReplacementCandidatesListProps {
  lng: string;
  candidates: ReplacementCandidateT[] | null;
  selectedCandidateId: string | null;
  onSelectCandidate: (candidateId: string) => void;
  onViewDetails: (candidate: ReplacementCandidateT) => void;
  onConfirmReplacement: (candidateId?: string) => void;
  onCheckReplacement: () => void;
  onCancel: () => void;
  isOpen: boolean;
  isSubmitting: boolean;
  isCheckingReplacement: boolean;
}

export function ReplacementCandidatesList({
  lng,
  candidates,
  selectedCandidateId,
  onSelectCandidate,
  onViewDetails,
  onConfirmReplacement,
  onCheckReplacement,
  onCancel,
  isOpen,
  isSubmitting,
  isCheckingReplacement,
}: ReplacementCandidatesListProps) {
  const { t } = useTranslation(lng, 'schedule-page');
  const isMobile = useIsMobile();

  return (
    <div>
      {!isOpen && (
        <Button
          variant="default"
          onClick={onCheckReplacement}
          disabled={isCheckingReplacement}
          data-testid="check-replacement-button"
          className="mt-4 mb-4"
        >
          {isCheckingReplacement ? (
            <>
              <Loader2 className="mr-1 size-4 animate-spin" />
              {t('checking')}
            </>
          ) : (
            t('analyze_replacement')
          )}
        </Button>
      )}

      {isOpen && candidates && candidates.length > 0 && (
        <>
          <Separator className="my-4" />
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold">{t('replacement_candidates')}</span>
            {!isMobile && (
              <Button
                size="sm"
                variant="default"
                onClick={() => {
                  if (candidates.length > 0) onViewDetails(candidates[0]);
                }}
                data-testid="see-details-button"
              >
                {t('see_details')}
              </Button>
            )}
          </div>
          <div className="max-h-[400px] space-y-1 overflow-auto">
            {candidates
              .filter((candidate) => candidate.rank !== 0)
              .map((candidate) => (
                <div
                  key={candidate.workerId}
                  className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50"
                  data-testid={`candidate-${candidate.workerId}`}
                >
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {getCategoryEmoji(candidate.replacementCategory)}
                      </span>
                      <span className="text-sm font-medium">{candidate.workerName}</span>
                    </div>
                    <span className="mt-0.5 text-xs text-muted-foreground">
                      {formatWeeklyTime(
                        candidate.replacementImplications.newWeeklyTime.newWeeklyWorkedMinutes,
                        candidate.replacementImplications.newWeeklyTime.newWeeklyTimeDeltaMinutes,
                      )}{' '}
                      |{' '}
                      {formatMonthlyDuties(
                        candidate.replacementImplications.newMonthlyDuties.newNumberMonthlyDuties,
                        candidate.replacementImplications.newMonthlyDuties.newMonthlyDutiesDelta,
                      )}{' '}
                      | {getReasonLabel(candidate.mostConstrainingReason, t)}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => {
                      onConfirmReplacement(candidate.workerId);
                    }}
                    disabled={isSubmitting}
                    data-testid={`replace-button-${candidate.workerId}`}
                    className="shrink-0"
                  >
                    {isSubmitting && selectedCandidateId === candidate.workerId ? (
                      <>
                        <Loader2 className="mr-0.5 size-3 animate-spin" />
                        {t('selecting')}
                      </>
                    ) : (
                      t('replace')
                    )}
                  </Button>
                </div>
              ))}
          </div>
          <div className="mt-2 flex justify-end">
            <Button variant="outline" onClick={onCancel} data-testid="cancel-replacement-button">
              {t('cancel')}
            </Button>
          </div>
          <Separator className="mt-2 mb-3" />
        </>
      )}
    </div>
  );
}
