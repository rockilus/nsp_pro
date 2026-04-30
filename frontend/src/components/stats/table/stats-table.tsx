import React, { useMemo } from 'react';
import { useTranslation } from '../../../app/i18n/client';
// MUI
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
// Utils
import { createColorScale, getHeatmapColors } from '../../../app/lib/utils/colorScaleUtils';
// Styles
import './stats-table.css';
// Types
import {
  StatsT,
  StatsValueT,
  StatsHeaderT,
  HeaderUnitOptions,
  StatsUnitOptions,
  StatsOptionsT,
} from '../../../types/stats';
import { ShiftT } from '../../../types/shift';
import { WorkerT } from '../../../types/worker';

export default function StatsTable({
  lng,
  statsOptions,
  stats,
  workers,
  shifts,
  statsUnitOptions,
  quickStats,
  isLoadingStats,
  handleAddHeader,
  handleDeleteHeader,
}: {
  lng: string;
  statsOptions: StatsOptionsT;
  stats: StatsT;
  workers: WorkerT[];
  shifts: ShiftT[];
  statsUnitOptions: {
    name: StatsUnitOptions;
    label: string;
    description: string;
  }[];
  quickStats: boolean;
  isLoadingStats: boolean;
  handleAddHeader: (header: StatsHeaderT) => void;
  handleDeleteHeader: (headerId: string) => void;
}) {
  const { t } = useTranslation(lng, 'stats-page');
  const { t: t_weekdays } = useTranslation(lng, 'week_days');
  const { t: t_months } = useTranslation(lng, 'months');

  const borderStyle = '1px solid #E8E8E8';

  const handleAddDeleteHeaderToCustom = (statsHeader: StatsHeaderT) => {
    if (statsHeader.isFavorite) {
      handleDeleteHeader(statsHeader.id);
    } else {
      handleAddHeader(statsHeader);
    }
  };

  // Calculate the sum of statsValue.value for each workerId and header totals
  const { workerSums, headerTotals, overallTotal } = useMemo(() => {
    const sums: { [workerId: string]: number } = stats.statsValues.reduce(
      (acc, statsValue) => {
        if (!acc[statsValue.workerId]) {
          acc[statsValue.workerId] = 0;
        }
        acc[statsValue.workerId] += statsValue.value;
        return acc;
      },
      {} as { [workerId: string]: number },
    );

    const totals: { [headerId: string]: number } = stats.statsHeaders.reduce(
      (acc, header) => {
        acc[header.id] = stats.statsValues
          .filter((statsValue) => statsValue.headerId === header.id)
          .reduce((sum, statsValue) => sum + statsValue.value, 0);
        return acc;
      },
      {} as { [headerId: string]: number },
    );

    const overall = Object.values(sums).reduce((sum, value) => sum + value, 0);

    return { workerSums: sums, headerTotals: totals, overallTotal: overall };
  }, [stats.statsValues, stats.statsHeaders]);

  // Number of columns to span for separator row when totals are shown
  const separatorColSpan = stats.statsHeaders.length + 1 + (!statsOptions.showFavorites ? 2 : 0);

  const translateHeaderValue = (name: string): string => {
    const translations: Record<string, string> = {
      Monday: t_weekdays('monday'),
      Tuesday: t_weekdays('tuesday'),
      Wednesday: t_weekdays('wednesday'),
      Thursday: t_weekdays('thursday'),
      Friday: t_weekdays('friday'),
      Saturday: t_weekdays('saturday'),
      Sunday: t_weekdays('sunday'),
    };

    const weekPattern = /^(\d{4}) W(\d{1,2})$/;
    const monthPattern = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4})$/;
    const matchWeek = name.match(weekPattern);
    const matchMonth = name.match(monthPattern);

    const monthAbbreviations: Record<string, string> = {
      jan: t_months('january'),
      feb: t_months('february'),
      mar: t_months('march'),
      apr: t_months('april'),
      may: t_months('may'),
      jun: t_months('june'),
      jul: t_months('july'),
      aug: t_months('august'),
      sep: t_months('september'),
      oct: t_months('october'),
      nov: t_months('november'),
      dec: t_months('december'),
    };

    if (matchWeek) {
      const year = parseInt(matchWeek[1], 10);
      const week = parseInt(matchWeek[2], 10);
      // ISO week start (Monday): Jan 4 is always in W1; find that week's Monday
      const jan4 = new Date(year, 0, 4);
      const jan4DayOfWeek = jan4.getDay() === 0 ? 7 : jan4.getDay(); // 1=Mon … 7=Sun
      const w1Monday = new Date(jan4.getTime() - (jan4DayOfWeek - 1) * 86400000);
      const weekStart = new Date(w1Monday.getTime() + (week - 1) * 7 * 86400000);
      const weekEnd = new Date(weekStart.getTime() + 6 * 86400000);
      return new Intl.DateTimeFormat(lng, { month: 'short', day: 'numeric' }).formatRange(
        weekStart,
        weekEnd,
      );
    }

    if (matchMonth) {
      const monthAbbreviation = matchMonth[1].toLowerCase();
      const month = monthAbbreviations[monthAbbreviation];
      const year = matchMonth[2];
      return `${month.substring(0, 3)} ${year}`;
    }

    return translations[name] ? translations[name].substring(0, 3) : name;
  };

  // Compute color scales for heatmap
  const { dataColorScale, totalsColorScale, rowTotalsColorScale, perColumnScales } = useMemo(() => {
    // Don't apply heatmap if disabled or loading
    if (!statsOptions.enableHeatmap || isLoadingStats) {
      return {
        dataColorScale: null,
        totalsColorScale: null,
        rowTotalsColorScale: null,
        perColumnScales: new Map(),
      };
    }

    if (statsOptions.showFavorites) {
      // In favorites mode, create one scale per column
      const scales = new Map<string, ReturnType<typeof createColorScale>>();

      stats.statsHeaders.forEach((header) => {
        const columnValues = stats.statsValues
          .filter((v) => v.headerId === header.id)
          .map((v) => v.value);

        scales.set(header.id, createColorScale(columnValues));
      });

      return {
        dataColorScale: null,
        totalsColorScale: null,
        rowTotalsColorScale: null,
        perColumnScales: scales,
      };
    } else {
      // Regular mode: one scale for data, separate scales for row totals and column totals
      const dataValues = stats.statsValues.map((v) => v.value);
      const columnTotalsValues = Object.values(headerTotals);
      const rowTotalsValues = Object.values(workerSums);

      return {
        dataColorScale: createColorScale(dataValues),
        totalsColorScale: createColorScale(columnTotalsValues), // For total row
        rowTotalsColorScale: createColorScale(rowTotalsValues), // For total column
        perColumnScales: new Map(),
      };
    }
  }, [
    stats.statsValues,
    stats.statsHeaders,
    statsOptions.enableHeatmap,
    statsOptions.showFavorites,
    isLoadingStats,
    workerSums,
    headerTotals,
  ]);

  console.log('isLoadingStats', isLoadingStats);

  return (
    <TableContainer
      sx={{
        height: 'calc(100vh - 130px)',
        backgroundColor: isLoadingStats ? '#f5f5f5' : '#ffffff',
      }}
    >
      <Table stickyHeader sx={{ minWidth: 650 }}>
        <TableHead>
          <TableRow>
            <TableCell
              sx={{
                padding: 0,
                backgroundColor: isLoadingStats ? '#f5f5f5' : '#ffffff',
              }}
            ></TableCell>
            {stats.statsHeaders.map((header, headerIndex) => (
              <TableCell
                key={headerIndex}
                align="center"
                sx={{
                  padding: 0,
                  backgroundColor: isLoadingStats ? '#f5f5f5' : '#ffffff',
                }}
              >
                <div className="column-header-container">
                  <span
                    className={`column-header ${quickStats ? 'quick-stats' : ''} ${header.headerUnit === HeaderUnitOptions.WEEK ? 'week' : ''}`}
                    style={
                      header.headerUnit === HeaderUnitOptions.WEEK
                        ? {
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '1px',
                          }
                        : undefined
                    }
                  >
                    {header.headerUnit === HeaderUnitOptions.SHIFT ? (
                      shifts.find((s) => s.id === header.value)?.name
                    ) : header.headerUnit === HeaderUnitOptions.WEEK ? (
                      <>
                        <span>{translateHeaderValue(header.value)}</span>
                        <span style={{ fontSize: '0.65rem', opacity: 0.6, fontWeight: 400 }}>
                          {lng === 'fr' || lng === 'es' ? 'S' : 'W'}
                          {header.value.match(/W(\d+)/)?.[1]}
                        </span>
                      </>
                    ) : (
                      translateHeaderValue(header.value)
                    )}
                  </span>
                  {statsOptions.showFavorites && (
                    <div className="column-header-custom-info">
                      <span
                        className={`column-header-stats-unit ${quickStats ? 'quick-stats' : ''}`}
                      >
                        {statsUnitOptions.find((u) => u.name === header.statsUnit)?.label ||
                          header.statsUnit}
                      </span>
                      <span
                        className={`column-header-shift-name ${quickStats ? 'quick-stats' : ''}`}
                      >
                        {header.selectedShifts
                          .map((ss) => (ss.name === 'all shifts' ? t('all_shifts') : ss.name))
                          .join(', ')}
                      </span>
                    </div>
                  )}
                  {!quickStats && (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <IconButton
                        onClick={() => handleAddDeleteHeaderToCustom(header)}
                        sx={{
                          borderRadius: '50%',
                          color: header.isFavorite ? 'red' : '#00000099',
                          '&:hover': {
                            backgroundColor: header.isFavorite
                              ? 'rgba(255, 0, 0, 0.2)'
                              : 'rgba(0, 0, 0, 0.1)',
                          },
                        }}
                      >
                        {header.isFavorite ? (
                          <FavoriteIcon fontSize="small" />
                        ) : (
                          <FavoriteBorderIcon fontSize="small" />
                        )}
                      </IconButton>
                    </div>
                  )}
                </div>
              </TableCell>
            ))}
            {!statsOptions.showFavorites && (
              <>
                <TableCell
                  sx={{
                    padding: 0,
                    width: '20px',
                    height: '20px',
                    backgroundColor: isLoadingStats ? '#f5f5f5' : '#ffffff',
                    border: 'none',
                  }}
                />
                <TableCell
                  sx={{
                    padding: 0,
                    alignContent: 'flex-start',
                    backgroundColor: isLoadingStats ? '#f5f5f5' : '#ffffff',
                  }}
                >
                  <div className="column-header-container">
                    <span className="column-header">{t('total')}</span>
                  </div>
                </TableCell>
              </>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {workers.map((worker, wIndex) => (
            <TableRow key={wIndex}>
              <TableCell align="left" sx={{ padding: 0, height: quickStats ? '25px' : '30px' }}>
                <span className={`row-worker-name ${quickStats ? 'quick-stats' : ''}`}>
                  {worker.name}
                </span>
              </TableCell>
              {stats.statsHeaders.map((header, headerIndex) => {
                const statsValue: StatsValueT | null =
                  stats.statsValues.find(
                    (s) => s.headerId === header.id && s.workerId === worker.id,
                  ) || null;

                if (!statsValue) return null;

                // Get heatmap colors
                const scale = statsOptions.showFavorites
                  ? perColumnScales.get(header.id) || null
                  : dataColorScale;
                const heatmapColors = getHeatmapColors(statsValue.value, scale);

                return (
                  <TableCell
                    key={wIndex + headerIndex}
                    align="center"
                    sx={{
                      padding: 0,
                      backgroundColor: heatmapColors.backgroundColor,
                    }}
                  >
                    <span
                      className={`row-value ${quickStats ? 'quick-stats' : ''}`}
                      style={{ color: heatmapColors.color }}
                    >
                      {statsValue.value}
                    </span>
                  </TableCell>
                );
              })}
              {!statsOptions.showFavorites && (
                <>
                  <TableCell
                    sx={{
                      padding: 0,
                      border: 'none',
                      width: '20px',
                      height: '20px',
                    }}
                  />
                  <TableCell
                    align="center"
                    sx={{
                      padding: 0,
                      backgroundColor: getHeatmapColors(workerSums[worker.id], rowTotalsColorScale)
                        .backgroundColor,
                    }}
                  >
                    <span
                      className="row-value row-total"
                      style={{
                        color: getHeatmapColors(workerSums[worker.id], rowTotalsColorScale).color,
                      }}
                    >
                      {workerSums[worker.id]}
                    </span>
                  </TableCell>
                </>
              )}
            </TableRow>
          ))}
          {/* Separator row between body and totals */}
          {!statsOptions.showFavorites && (
            <TableRow>
              <TableCell sx={{ padding: 0, height: '8px' }} />
              {stats.statsHeaders.map((header) => (
                <TableCell key={header.id} sx={{ padding: 0, height: '8px' }} />
              ))}
              {/* Separator column cell: remove border only for this column */}
              <TableCell
                sx={{
                  padding: 0,
                  width: '20px',
                  height: '20px',
                  border: 'none',
                }}
              />
              <TableCell sx={{ padding: 0, height: '8px' }} />
            </TableRow>
          )}
          <TableRow>
            <TableCell align="left" sx={{ padding: 0, height: quickStats ? '25px' : '30px' }}>
              <span className={`row-worker-name ${quickStats ? 'quick-stats' : ''} row-total`}>
                {t('total')}
              </span>
            </TableCell>
            {stats.statsHeaders.map((header) => {
              // In favorites mode, don't apply heatmap to totals row
              const scale = statsOptions.showFavorites ? null : totalsColorScale;
              const heatmapColors = getHeatmapColors(headerTotals[header.id], scale);

              return (
                <TableCell
                  key={header.id}
                  align="center"
                  sx={{
                    padding: 0,
                    backgroundColor: heatmapColors.backgroundColor,
                  }}
                >
                  <span className="row-value row-total" style={{ color: heatmapColors.color }}>
                    {headerTotals[header.id]}
                  </span>
                </TableCell>
              );
            })}
            {!statsOptions.showFavorites && (
              <>
                <TableCell
                  sx={{
                    padding: 0,
                    border: 'none',
                    width: '20px',
                    height: '20px',
                  }}
                />
                <TableCell align="center" sx={{ padding: 0 }}>
                  <span className="row-value row-total">{overallTotal}</span>
                </TableCell>
              </>
            )}
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
}
