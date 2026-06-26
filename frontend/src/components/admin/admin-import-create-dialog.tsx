'use client';

import React, { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/app/i18n/client';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
// shadcn
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
// Icons
import { Loader2, Upload } from 'lucide-react';
// Auth
import { useAuth } from '@/contexts/auth-context';
import { env } from '@/config/env';

dayjs.extend(utc);

// ── Auth headers ─────────────────────────────────────────────────────────────

function buildAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};

  if (env.isDevelopment) {
    headers['X-Dev-User-ID'] = env.devUserId;
    headers['X-API-Key'] = env.devApiKey;
  }

  return headers;
}

// ── Component ────────────────────────────────────────────────────────────────

interface Props {
  lng: string;
  open: boolean;
  onClose: () => void;
  onCreated: () => void; // triggers refresh of list
}

export default function AdminImportCreateDialog({ lng, open, onClose, onCreated }: Props) {
  const { t } = useTranslation(lng, 'admin-import');
  const { user } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<'upload' | 'preview' | 'saving'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [importName, setImportName] = useState('');
  const [previewSummary, setPreviewSummary] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<unknown>(null);

  // ── Reset on open ──────────────────────────────────────────────────────

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setStep('upload');
        setFile(null);
        setImportName('');
        setPreviewSummary('');
        setError(null);
        setPreviewData(null);
        onClose();
      }
    },
    [onClose],
  );

  // ── Upload & Preview ───────────────────────────────────────────────────

  const handleUpload = useCallback(async () => {
    if (!file) return;
    setStep('preview');
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const headers = buildAuthHeaders();
      // Remove Content-Type so browser sets multipart boundary
      delete (headers as Record<string, string>)['Content-Type'];

      const resp = await fetch(`${env.apiUrl}/admin/import/preview`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail || `Server error: ${resp.status}`);
      }

      const data = await resp.json();

      // Surface parse errors returned as 200 (e.g. missing sheets, corrupt file)
      if (data.errors && data.errors.length > 0) {
        setError(t('parse_errors') + ': ' + data.errors.map((e: string) => `• ${e}`).join('\n'));
        setStep('upload');
        return;
      }

      setPreviewData(data);

      const m = data.members?.length ?? 0;
      const s = data.shifts?.length ?? 0;
      const r = data.requests?.length ?? 0;

      // Build preview summary with counts + optional warning count
      let summary = t('preview_summary')
        .replace('{workers}', String(m))
        .replace('{shifts}', String(s))
        .replace('{requests}', String(r))
        .replace('{assignments}', String(data.assignments?.length ?? 0));

      if (data.warnings && data.warnings.length > 0) {
        summary += ' ' + t('warnings_found').replace('{count}', String(data.warnings.length));
      }

      setPreviewSummary(summary);

      // Auto-generate name
      if (!importName) {
        const now = dayjs().utc().format('YYYY-MM-DD HH:mm');
        setImportName(`Import ${now}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setStep('upload');
    }
  }, [file, t, importName]);

  // ── Create import ──────────────────────────────────────────────────────

  const handleCreate = useCallback(async () => {
    if (!previewData) return;
    setStep('saving');
    setError(null);

    try {
      const headers = {
        ...buildAuthHeaders(),
        'Content-Type': 'application/json',
      };

      const resp = await fetch(`${env.apiUrl}/admin/imports`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: importName.trim() || undefined,
          filename: file?.name ?? 'unknown.xlsx',
          teamId: null,
          previewData,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail || `Server error: ${resp.status}`);
      }
      // temp comment
      const created = await resp.json();
      onCreated();
      handleOpenChange(false);
      // Navigate to the full-screen editor
      router.push(`/${lng}/admin/import/editor?id=${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create import');
      setStep('preview');
    }
  }, [previewData, importName, file, onCreated, handleOpenChange, router, lng]);

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('create_import')}</DialogTitle>
          <DialogDescription>{t('create_import_desc')}</DialogDescription>
        </DialogHeader>

        {/* Upload step */}
        {step === 'upload' && (
          <div className="flex flex-col gap-3">
            <div className="rounded-lg border border-dashed border-border p-6 text-center">
              <Upload className="mx-auto mb-2 size-8 text-muted-foreground" />
              <p className="mb-2 text-sm">{t('upload_excel_hint')}</p>
              <Button asChild variant="outline" size="sm">
                <label className="cursor-pointer">
                  {t('upload_and_preview')}
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    hidden
                    data-testid="import-file-input"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setFile(f);
                    }}
                  />
                </label>
              </Button>
              {file && <p className="mt-2 text-xs text-muted-foreground">{file.name}</p>}
            </div>

            {file && (
              <Button onClick={handleUpload} disabled={!file} data-testid="import-upload-btn">
                {t('upload_and_preview')}
              </Button>
            )}
          </div>
        )}

        {/* Preview step */}
        {step === 'preview' && (
          <div className="flex flex-col gap-3">
            {previewSummary && (
              <Alert data-testid="import-preview-summary">
                <AlertDescription>{previewSummary}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="import-name">{t('import_name')}</Label>
              <Input
                id="import-name"
                value={importName}
                onChange={(e) => setImportName(e.target.value)}
                placeholder={t('import_name_placeholder')}
              />
            </div>

            <Button onClick={handleCreate} disabled={!previewData} data-testid="import-create-btn">
              {t('create_and_open')}
            </Button>

            <Button variant="ghost" size="sm" onClick={() => setStep('upload')}>
              {t('back_to_upload')}
            </Button>
          </div>
        )}

        {/* Saving step */}
        {step === 'saving' && (
          <div className="flex items-center justify-center gap-2 py-6">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{t('saving')}</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </DialogContent>
    </Dialog>
  );
}
