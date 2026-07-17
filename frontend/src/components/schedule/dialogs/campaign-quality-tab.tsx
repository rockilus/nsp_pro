'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from '../../../app/i18n/client';
import { useGetCampaignQuality } from '../../../hooks/useCampaignQuality';
import { CampaignQualityT, WorkerQualityT } from '../../../types/campaignQuality';
import { Skeleton } from '../../ui/skeleton';
import { Badge } from '../../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { cn } from '@/lib/utils';

function scoreColor(score: number): string {
  if (score >= 80) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
  if (score >= 50)
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
  return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
}

function scoreBg(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
}

function ScoreBadge({ score }: { score: number }) {
  return (
    <Badge variant="outline" className={cn('font-semibold', scoreColor(score))}>
      {Math.round(score)}
    </Badge>
  );
}

function GlobalScoreBanner({ score, t }: { score: number; t: (key: string) => string }) {
  const barWidth = Math.max(0, Math.min(100, score));
  return (
    <div className="mb-6 rounded-lg border p-4">
      <div className="mb-2 text-sm font-medium text-muted-foreground">
        {t('quality.global_score')}
      </div>
      <div className="mb-3 text-center text-3xl font-bold">{Math.round(score)}/100</div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-all', scoreBg(score))}
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  );
}

function minutesToHours(minutes: number, t: (key: string) => string): string {
  const h = minutes / 60;
  return `${h.toFixed(1)}${t('quality.hours_abbr')}`;
}

interface FairnessTableProps {
  workers: WorkerQualityT[];
  aggregateFairnessScore: number;
  fairnessDutiesScore: number;
  fairnessOnCallScore: number;
  fairnessTimeWorkedScore: number;
  fairnessWeekendScore: number;
  t: (key: string) => string;
}

function FairnessTable({
  workers,
  fairnessDutiesScore,
  fairnessOnCallScore,
  fairnessTimeWorkedScore,
  fairnessWeekendScore,
  t,
}: FairnessTableProps) {
  return (
    <div className="mb-6">
      <h3 className="mb-2 text-sm font-semibold">{t('quality.fairness')}</h3>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[130px]" />
              <TableHead className="text-center">{t('quality.num_duties')}</TableHead>
              <TableHead className="text-center">{t('quality.num_on_call')}</TableHead>
              <TableHead className="text-center">{t('quality.time_worked')}</TableHead>
              <TableHead className="text-center">{t('quality.time_weekend')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="bg-muted/30 font-medium">
              <TableCell>{t('quality.team_avg')}</TableCell>
              <TableCell className="text-center">
                <ScoreBadge score={fairnessDutiesScore} />
              </TableCell>
              <TableCell className="text-center">
                <ScoreBadge score={fairnessOnCallScore} />
              </TableCell>
              <TableCell className="text-center">
                <ScoreBadge score={fairnessTimeWorkedScore} />
              </TableCell>
              <TableCell className="text-center">
                <ScoreBadge score={fairnessWeekendScore} />
              </TableCell>
            </TableRow>
            {workers.map((w) => (
              <TableRow key={w.workerId}>
                <TableCell className="font-medium">{w.workerName}</TableCell>
                <TableCell className="text-center text-xs">{Math.round(w.numDuties)}</TableCell>
                <TableCell className="text-center text-xs">{Math.round(w.numOnCall)}</TableCell>
                <TableCell className="text-center text-xs">
                  {minutesToHours(w.timeWorkedMinutes, t)}
                </TableCell>
                <TableCell className="text-center text-xs">
                  {minutesToHours(w.timeWorkedWeekendMinutes, t)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

interface IndividualTableProps {
  workers: WorkerQualityT[];
  aggregateIndividualScore: number;
  t: (key: string) => string;
}

function IndividualTable({ workers, aggregateIndividualScore, t }: IndividualTableProps) {
  return (
    <div className="mb-6">
      <h3 className="mb-2 text-sm font-semibold">{t('quality.individual')}</h3>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[130px]" />
              <TableHead className="text-center">{t('quality.shift_diversity')}</TableHead>
              <TableHead className="text-center">{t('quality.shift_spread')}</TableHead>
              <TableHead className="text-center">{t('quality.time_consistency')}</TableHead>
              <TableHead className="text-center">{t('quality.individual_score')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="bg-muted/30 font-medium">
              <TableCell>{t('quality.team_avg')}</TableCell>
              <TableCell className="text-center" />
              <TableCell className="text-center" />
              <TableCell className="text-center" />
              <TableCell className="text-center">
                <ScoreBadge score={aggregateIndividualScore} />
              </TableCell>
            </TableRow>
            {workers.map((w) => (
              <TableRow key={w.workerId}>
                <TableCell className="font-medium">{w.workerName}</TableCell>
                <TableCell className="text-center">
                  <ScoreBadge score={w.shiftDiversityScore} />
                </TableCell>
                <TableCell className="text-center">
                  <ScoreBadge score={w.shiftSpreadScore} />
                </TableCell>
                <TableCell className="text-center">
                  <ScoreBadge score={w.workTimeConsistencyScore} />
                </TableCell>
                <TableCell className="text-center">
                  <ScoreBadge score={w.individualScore} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 w-full rounded-lg" />
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40 w-full rounded-md" />
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40 w-full rounded-md" />
    </div>
  );
}

export default function CampaignQualityTab({ lng, teamId }: { lng: string; teamId: string }) {
  const { t } = useTranslation(lng, 'schedule-page');
  const getCampaignQuality = useGetCampaignQuality();

  const [data, setData] = useState<CampaignQualityT | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getCampaignQuality(teamId);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [getCampaignQuality, teamId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <LoadingState />;

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <p className="text-sm text-muted-foreground">{t('quality.error')}</p>
        <button
          onClick={fetchData}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {t('quality.retry')}
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        {t('quality.no_campaign')}
      </div>
    );
  }

  return (
    <div className="pt-2">
      <GlobalScoreBanner score={data.globalScore} t={t} />
      <FairnessTable
        workers={data.workers}
        aggregateFairnessScore={data.aggregateFairnessScore}
        fairnessDutiesScore={data.fairnessDutiesScore}
        fairnessOnCallScore={data.fairnessOnCallScore}
        fairnessTimeWorkedScore={data.fairnessTimeWorkedScore}
        fairnessWeekendScore={data.fairnessWeekendScore}
        t={t}
      />
      <IndividualTable
        workers={data.workers}
        aggregateIndividualScore={data.aggregateIndividualScore}
        t={t}
      />
    </div>
  );
}
