import React from 'react';
import {
  Box,
  Button,
  CircularProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  Divider,
} from '@mui/material';
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
    <Box>
      {!isOpen && (
        <Button
          variant="contained"
          color="info"
          onClick={onCheckReplacement}
          disabled={isCheckingReplacement}
          // fullWidth
          data-testid="check-replacement-button"
          sx={{ mt: '16px', mb: '16px', textTransform: 'none' }}
        >
          {isCheckingReplacement ? (
            <>
              <CircularProgress size={16} sx={{ mr: 1 }} />
              {t('checking')}
            </>
          ) : (
            t('analyze_replacement')
          )}
        </Button>
      )}

      {isOpen && candidates && candidates.length > 0 && (
        <>
          <Divider sx={{ mb: '8px', mt: '16px' }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
            {t('replacement_candidates')}{' '}
          </Typography>
          {!isMobile && (
            <Button
              size="small"
              variant="contained"
              onClick={() => {
                // Open dialog with all candidates for comparison
                if (candidates.length > 0) onViewDetails(candidates[0]);
              }}
              sx={{ textTransform: 'none', mb: 1, ml: 'auto' }}
              data-testid="see-details-button"
            >
              {t('see_details')}
            </Button>
          )}
          <List sx={{ maxHeight: 400, overflow: 'auto', p: 0 }}>
            {candidates
              .filter((candidate) => candidate.rank !== 0)
              .map((candidate) => (
                <ListItem
                  key={candidate.workerId}
                  sx={{
                    mb: 0.5,
                    py: 0.75,
                    px: 2,
                  }}
                  data-testid={`candidate-${candidate.workerId}`}
                >
                  <ListItemText
                    primary={
                      <Box
                        display="flex"
                        alignItems="center"
                        justifyContent="space-between"
                        gap={1}
                      >
                        <Box display="flex" alignItems="center" gap={1}>
                          <Box
                            component="span"
                            sx={{
                              display: 'inline-block',
                              fontSize: '1.1rem',
                            }}
                          >
                            {getCategoryEmoji(candidate.replacementCategory)}
                          </Box>
                          <Typography variant="body2" fontWeight="medium">
                            {candidate.workerName}
                          </Typography>
                        </Box>
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          onClick={() => {
                            onConfirmReplacement(candidate.workerId);
                          }}
                          disabled={isSubmitting}
                          data-testid={`replace-button-${candidate.workerId}`}
                          sx={{ ml: 'auto', textTransform: 'none' }}
                        >
                          {isSubmitting && selectedCandidateId === candidate.workerId ? (
                            <>
                              <CircularProgress size={12} sx={{ mr: 0.5 }} />
                              {t('selecting')}
                            </>
                          ) : (
                            t('replace')
                          )}
                        </Button>
                      </Box>
                    }
                    secondary={
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        component="div"
                        sx={{ mt: 0.25 }}
                      >
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
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
          </List>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              color="primary"
              onClick={onCancel}
              data-testid="cancel-replacement-button"
              sx={{ textTransform: 'none' }}
            >
              {t('cancel')}
            </Button>
          </Box>
          <Divider sx={{ mt: '8px', mb: '12px' }} />{' '}
        </>
      )}
    </Box>
  );
}
