'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/app/i18n/client';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
// shadcn
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
// Icons
import { FileSpreadsheet, Loader2, Plus } from 'lucide-react';
// Auth
import { useAuth } from '@/contexts/auth-context';
import { env } from '@/config/env';
import { getImpersonationToken } from '@/app/lib/impersonation-storage';

dayjs.extend(utc);

// ── Types ────────────────────────────────────────────────────────────────────

interface ImportSummary {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  filename: string;
  memberCount: number;
  shiftCount: number;
  requestCount: number;
  assignmentCount: number;
}

// ── Auth headers ─────────────────────────────────────────────────────────────

function buildAuthHeaders(user: { id_token?: string } | null | undefined): Record<string, string> {
  const headers: Record<string, string> = {};

  if (env.isDevelopment) {
    headers['X-Dev-User-ID'] = env.devUserId;
    headers['X-API-Key'] = env.devApiKey;
  } else if (user?.id_token) {
    headers['Authorization'] = `Bearer ${user.id_token}`;
  }

  const impToken = getImpersonationToken();
  if (impToken) {
    headers['X-Impersonation-Token'] = impToken;
  }

  return headers;
}

// ── Component ────────────────────────────────────────────────────────────────

interface Props {
  lng: string;
  onOpenCreate: () => void;
  refreshKey: number; // increment to re-fetch
}

export default function AdminImportList({ lng, onOpenCreate, refreshKey }: Props) {
  const { t } = useTranslation(lng, 'admin-import');
  const { user } = useAuth();
  const router = useRouter();

  const [imports, setImports] = useState<ImportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch imports ──────────────────────────────────────────────────────

  const fetchImports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = buildAuthHeaders(user);
      const resp = await fetch(`${env.apiUrl}/admin/imports`, { headers });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail || `Server error: ${resp.status}`);
      }
      const data: ImportSummary[] = await resp.json();
      setImports(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load imports');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchImports();
  }, [fetchImports, refreshKey]);

  // ── Render ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        <span className="text-sm">{t('loading_imports')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" size="sm" className="mt-2" onClick={fetchImports}>
          {t('retry')}
        </Button>
      </div>
    );
  }

  if (imports.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <FileSpreadsheet className="size-12 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">{t('no_imports')}</p>
        <Button onClick={onOpenCreate}>
          <Plus className="mr-1.5 size-4" />
          {t('create_import')}
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t('import_count').replace('{count}', String(imports.length))}
        </p>
        <Button size="sm" onClick={onOpenCreate}>
          <Plus className="mr-1.5 size-4" />
          {t('create_import')}
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('import_name')}</TableHead>
              <TableHead>{t('import_date')}</TableHead>
              <TableHead>{t('import_file')}</TableHead>
              <TableHead className="text-right">{t('members_tab')}</TableHead>
              <TableHead className="text-right">{t('shifts_tab')}</TableHead>
              <TableHead className="text-right">{t('requests_tab')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {imports.map((imp) => (
              <TableRow
                key={imp.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => router.push(`/${lng}/admin/import/editor?id=${imp.id}`)}
              >
                <TableCell className="font-medium">{imp.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {dayjs.unix(imp.createdAt).utc().format('YYYY-MM-DD HH:mm')}
                </TableCell>
                <TableCell className="max-w-[200px] truncate text-muted-foreground">
                  {imp.filename}
                </TableCell>
                <TableCell className="text-right">{imp.memberCount}</TableCell>
                <TableCell className="text-right">{imp.shiftCount}</TableCell>
                <TableCell className="text-right">{imp.requestCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
