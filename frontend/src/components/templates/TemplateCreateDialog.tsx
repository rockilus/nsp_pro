'use client';

import React from 'react';
import { useTranslation } from '../../app/i18n/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { TemplateType } from '../../types/schedule-template';

interface TemplateCreateDialogProps {
  lng: string;
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string, templateType: TemplateType, description?: string) => void;
  mode?: 'create' | 'edit';
  initialName?: string;
  initialDescription?: string;
  initialTemplateType?: TemplateType;
}

export function TemplateCreateDialog({
  lng,
  open,
  onClose,
  onSubmit,
  mode = 'create',
  initialName = '',
  initialDescription = '',
  initialTemplateType = TemplateType.STANDARD,
}: TemplateCreateDialogProps) {
  const { t } = useTranslation(lng, 'schedule-templates');
  const [name, setName] = React.useState(initialName);
  const [description, setDescription] = React.useState(initialDescription);
  const [templateType, setTemplateType] = React.useState<TemplateType>(initialTemplateType);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (open) {
      setName(initialName);
      setDescription(initialDescription);
      setTemplateType(initialTemplateType);
      setError('');
    }
  }, [open, initialName, initialDescription, initialTemplateType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t('template_name_required'));
      return;
    }
    setError('');
    onSubmit(name.trim(), templateType, description.trim() || undefined);
    setName('');
    setDescription('');
    setTemplateType(TemplateType.STANDARD);
  };

  const isEdit = mode === 'edit';

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('edit_template') : t('create_template')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="template-name">{t('template_name')}</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('template_name')}
              maxLength={100}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="template-desc">{t('description')}</Label>
            <Input
              id="template-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('template_description_placeholder')}
              maxLength={500}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('template_type')}</Label>
            <RadioGroup
              value={templateType}
              onValueChange={(v) => setTemplateType(v as TemplateType)}
            >
              <div className="flex items-start gap-3 rounded-md border p-3">
                <RadioGroupItem
                  value={TemplateType.STANDARD}
                  id="type-standard"
                  className="mt-0.5"
                />
                <div>
                  <Label htmlFor="type-standard" className="font-medium">
                    {t('standard')}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t('standard_template_explanation')}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-md border p-3">
                <RadioGroupItem
                  value={TemplateType.EVEN_ODD}
                  id="type-even-odd"
                  className="mt-0.5"
                />
                <div>
                  <Label htmlFor="type-even-odd" className="font-medium">
                    {t('even_odd')}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t('even_odd_template_explanation')}
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('cancel')}
            </Button>
            <Button type="submit">{isEdit ? t('save') : t('create_template')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
