import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  IconButton,
  Box,
  Typography,
  Tooltip,
  Table,
  TableContainer,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
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
  // Rotated column dimensions
  const ROTATED_COLUMN_WIDTH = 40;

  // Sort candidates by rank (current worker with rank=0 first)
  const sortedCandidates = [...candidates].sort((a, b) => a.rank - b.rank);

  const headerWorkerName =
    assignment && workers ? workers.find((w) => w.id === assignment.workerId)?.name || '' : '';

  const { t } = useTranslation(lng, 'schedule-page');

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      data-testid="replacement-details-dialog"
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            {t('replace_dialog.title')}{' '}
            {headerWorkerName ? (
              <Box component="span" sx={{ fontWeight: 'bold' }}>
                {headerWorkerName}
              </Box>
            ) : (
              t('replace_dialog.assignment')
            )}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ paddingBottom: '24px' }}>
        {assignment &&
          shifts &&
          (() => {
            const shift = shifts.find((s) => s.id === assignment.shiftId);
            const dateStr = assignment.date
              ? // format date in user's language
                assignment.date.locale(lng).format('dddd, D MMMM')
              : '';
            if (!shift) return null;
            const startStr = shift.startTime.format('HH:mm');
            const endStr = shift.endTime.format('HH:mm');
            const endsNextDay =
              shift.endTime.isBefore(shift.startTime) ||
              shift.endTime.diff(shift.startTime, 'day') > 0;

            return (
              <Box mb={1}>
                <Typography variant="subtitle1" fontWeight="bold">
                  {shift.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {dateStr} {'\u00A0⋅\u00A0'} {startStr} – {endStr}
                  {endsNextDay && <sup>+1</sup>}
                </Typography>
              </Box>
            );
          })()}
        <TableContainer sx={{ maxHeight: 600, overflowX: 'auto' }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    fontWeight: 'bold',
                    minWidth: 60,
                    position: 'sticky',
                    left: 0,
                    backgroundColor: 'background.paper',
                    zIndex: 2,
                    padding: 0,
                    textAlign: 'center',
                  }}
                ></TableCell>
                <TableCell
                  sx={{
                    fontWeight: 'bold',
                    minWidth: 180,
                    position: 'sticky',
                    left: 60,
                    backgroundColor: 'background.paper',
                    zIndex: 2,
                    padding: 0,
                    verticalAlign: 'bottom',
                  }}
                >
                  {t('replace_dialog.candidate')}
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 'bold',
                    minWidth: 50,
                    // position: "sticky",
                    left: 240,
                    backgroundColor: 'background.paper',
                    zIndex: 2,
                    padding: 0,
                    textAlign: 'center',
                  }}
                >
                  {/* Category emoji - no title */}
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 'bold',
                    minWidth: ROTATED_COLUMN_WIDTH,
                    padding: 0,
                    paddingBottom: '4px',
                    writingMode: 'sideways-lr',
                  }}
                >
                  <Tooltip title={t('replace_dialog.tooltip.h_week')} arrow>
                    <Box component="span">{t('replace_dialog.h_week')}</Box>
                  </Tooltip>
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 'bold',
                    minWidth: ROTATED_COLUMN_WIDTH,
                    padding: 0,
                    paddingBottom: '4px',
                    writingMode: 'sideways-lr',
                  }}
                >
                  <Tooltip title={t('replace_dialog.tooltip.duties_per_month')} arrow>
                    <Box component="span">{t('replace_dialog.duties_per_month')}</Box>
                  </Tooltip>
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 'bold',
                    minWidth: ROTATED_COLUMN_WIDTH,
                    padding: 0,
                    paddingBottom: '4px',
                    writingMode: 'sideways-lr',
                  }}
                >
                  <Tooltip title={t('replace_dialog.tooltip.shift_ltm')} arrow>
                    <Box component="span">{t('replace_dialog.shift_ltm')}</Box>
                  </Tooltip>
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 'bold',
                    minWidth: ROTATED_COLUMN_WIDTH,
                    padding: 0,
                    paddingBottom: '4px',
                    writingMode: 'sideways-lr',
                  }}
                >
                  <Tooltip title={t('replace_dialog.tooltip.day_ltm')} arrow>
                    <Box component="span">{t('replace_dialog.day_ltm')}</Box>
                  </Tooltip>
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 'bold',
                    minWidth: ROTATED_COLUMN_WIDTH,
                    padding: 0,
                    paddingBottom: '4px',
                    writingMode: 'sideways-lr',
                  }}
                >
                  <Tooltip title={t('replace_dialog.tooltip.soft')} arrow>
                    <Box component="span">{t('replace_dialog.soft')}</Box>
                  </Tooltip>
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 'bold',
                    minWidth: ROTATED_COLUMN_WIDTH,
                    padding: 0,
                    paddingBottom: '4px',
                    writingMode: 'sideways-lr',
                  }}
                >
                  <Tooltip title={t('replace_dialog.tooltip.hard')} arrow>
                    <Box component="span">{t('replace_dialog.hard')}</Box>
                  </Tooltip>
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 'bold',
                    minWidth: ROTATED_COLUMN_WIDTH,
                    padding: 0,
                    paddingBottom: '4px',
                    writingMode: 'sideways-lr',
                  }}
                >
                  <Tooltip title={t('replace_dialog.tooltip.request')} arrow>
                    <Box component="span">{t('replace_dialog.request')}</Box>
                  </Tooltip>
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 'bold',
                    minWidth: ROTATED_COLUMN_WIDTH,
                    padding: 0,
                    paddingBottom: '4px',
                    writingMode: 'sideways-lr',
                  }}
                >
                  <Tooltip title={t('replace_dialog.tooltip.overlap')} arrow>
                    <Box component="span">{t('replace_dialog.overlap')}</Box>
                  </Tooltip>
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 'bold',
                    minWidth: ROTATED_COLUMN_WIDTH,
                    padding: 0,
                    paddingBottom: '4px',
                    writingMode: 'sideways-lr',
                  }}
                >
                  <Tooltip title={t('replace_dialog.tooltip.filter')} arrow>
                    <Box component="span">{t('replace_dialog.filter')}</Box>
                  </Tooltip>
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 'bold',
                    minWidth: ROTATED_COLUMN_WIDTH,
                    padding: 0,
                    paddingBottom: '4px',
                    writingMode: 'sideways-lr',
                  }}
                >
                  <Tooltip title={t('replace_dialog.tooltip.leave')} arrow>
                    <Box component="span">{t('replace_dialog.leave')}</Box>
                  </Tooltip>
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 'bold',
                    minWidth: ROTATED_COLUMN_WIDTH,
                    padding: 0,
                    paddingBottom: '4px',
                    writingMode: 'sideways-lr',
                  }}
                >
                  <Tooltip title={t('replace_dialog.tooltip.specialty')} arrow>
                    <Box component="span">{t('replace_dialog.specialty')}</Box>
                  </Tooltip>
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 'bold',
                    minWidth: ROTATED_COLUMN_WIDTH,
                    padding: 0,
                    paddingBottom: '4px',
                    writingMode: 'sideways-lr',
                  }}
                >
                  <Tooltip title={t('replace_dialog.tooltip.employed')} arrow>
                    <Box component="span">{t('replace_dialog.employed')}</Box>
                  </Tooltip>
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 'bold',
                    minWidth: 120,
                    padding: 0,
                    textAlign: 'center',
                    verticalAlign: 'bottom',
                  }}
                ></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedCandidates.map((candidate) => {
                const isCurrentWorker = candidate.rank === 0;
                const impl = candidate.replacementImplications;

                return (
                  <TableRow
                    key={candidate.workerId}
                    sx={{
                      borderBottom: isCurrentWorker ? '3px solid' : undefined,
                      borderBottomColor: isCurrentWorker ? 'primary.main' : undefined,
                      backgroundColor: isCurrentWorker ? 'action.hover' : undefined,
                    }}
                    data-testid={`candidate-row-${candidate.workerId}`}
                  >
                    <TableCell
                      sx={{
                        position: 'sticky',
                        left: 0,
                        backgroundColor: isCurrentWorker ? 'action.hover' : 'background.paper',
                        zIndex: 1,
                        padding: 0,
                        textAlign: 'center',
                      }}
                    >
                      {isCurrentWorker ? '' : candidate.rank}
                    </TableCell>
                    <TableCell
                      sx={{
                        position: 'sticky',
                        left: 60,
                        backgroundColor: isCurrentWorker ? 'action.hover' : 'background.paper',
                        zIndex: 1,
                        padding: 0,
                      }}
                    >
                      <Typography variant="body2" fontWeight="medium">
                        {candidate.workerName}
                      </Typography>
                    </TableCell>
                    <TableCell
                      sx={{
                        // position: "sticky",
                        left: 240,
                        backgroundColor: isCurrentWorker ? 'action.hover' : 'background.paper',
                        zIndex: 1,
                        textAlign: 'center',
                        padding: 0,
                      }}
                    >
                      <span style={{ fontSize: '1.1rem' }}>
                        {getCategoryEmoji(candidate.replacementCategory)}
                      </span>
                    </TableCell>
                    <TableCell sx={{ padding: 0, textAlign: 'center' }}>
                      {renderWeeklyTime(impl)}
                    </TableCell>
                    <TableCell sx={{ padding: 0, textAlign: 'center' }}>
                      {renderMonthlyDuties(impl)}
                    </TableCell>
                    <TableCell sx={{ padding: 0, textAlign: 'center' }}>
                      <Typography variant="body2">{impl.nbTimesDidShiftLtm.count}</Typography>
                    </TableCell>
                    <TableCell sx={{ padding: 0, textAlign: 'center' }}>
                      <Typography variant="body2">{impl.nbTimesWorkedWeekdayLtm.count}</Typography>
                    </TableCell>
                    <TableCell sx={{ padding: 0, textAlign: 'center' }}>
                      {renderConstraintHit(impl.softConstraintHits, 'soft')}
                    </TableCell>
                    <TableCell sx={{ padding: 0, textAlign: 'center' }}>
                      {renderConstraintHit(impl.hardConstraintHits, 'hard')}
                    </TableCell>
                    <TableCell sx={{ padding: 0, textAlign: 'center' }}>
                      {renderRequestHit(impl)}
                    </TableCell>
                    <TableCell sx={{ padding: 0, textAlign: 'center' }}>
                      {renderOverlapHit(impl)}
                    </TableCell>
                    <TableCell sx={{ padding: 0, textAlign: 'center' }}>
                      {renderFilterHit(impl)}
                    </TableCell>
                    <TableCell sx={{ padding: 0, textAlign: 'center' }}>
                      {renderBoolean(impl.isntOnLeave)}
                    </TableCell>
                    <TableCell sx={{ padding: 0, textAlign: 'center' }}>
                      {renderBoolean(impl.hasSpecialty)}
                    </TableCell>
                    <TableCell sx={{ padding: 0, textAlign: 'center' }}>
                      {renderBoolean(impl.isEmployed)}
                    </TableCell>
                    <TableCell sx={{ padding: 0, textAlign: 'center' }}>
                      {!isCurrentWorker && (
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          onClick={() => onReplace(candidate.workerId)}
                          disabled={isSubmitting}
                          data-testid={`replace-candidate-${candidate.workerId}`}
                        >
                          {isSubmitting ? (
                            <>
                              <CircularProgress size={12} sx={{ mr: 0.5 }} />
                              {t('replace_dialog.replacing')}
                            </>
                          ) : (
                            t('replace_dialog.replace')
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
    </Dialog>
  );
}
