'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AdminImportEditor from '@/components/admin/admin-import-editor';
import { Loader2 } from 'lucide-react';

function EditorContent({ lng }: { lng: string }) {
  const searchParams = useSearchParams();
  const importId = searchParams.get('id');

  if (!importId) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">No import ID provided.</p>
      </div>
    );
  }

  return <AdminImportEditor lng={lng} importId={importId} />;
}

export default function AdminImportEditorPage({ params }: { params: Promise<{ lng: string }> }) {
  const { lng } = React.use(params as Promise<{ lng: string }>);

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <EditorContent lng={lng} />
    </Suspense>
  );
}
