import React, { useState } from 'react';
import { useTranslation } from '../../../app/i18n/client';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
// Styles
import '../../../styles/text-styles.css';
// Types
import { DimensionType } from '@/types/dimension';
import { DimensionEntryType } from '@/types/dimension';
import { DimEntryT } from '@/types/dim-entry';
import { DimensionT } from '@/types/dimension';

export default function LinkDimensionList({
  lng,
  dimensionType,
  dimensions,
  dimEntries,
  setOpenParent,
  handleUpdateDimension,
}: {
  lng: string;
  dimensionType: DimensionType;
  dimensions: DimensionT[];
  dimEntries: DimEntryT[];
  setOpenParent: (open: boolean) => void | null;
  handleUpdateDimension: (dimension: DimensionT) => void;
}) {
  const { t } = useTranslation(lng, 'shift-page');
  const [selectedDimension, setSelectedDimension] = useState<DimensionT | null>(null);

  const componentTitle = {
    [DimensionType.WORKER]: t('link_to_shifts'),
    [DimensionType.SHIFT]: t('link_to_workers_or_rests'),
    [DimensionType.REST_SHIFT]: t('link_to_workers_or_shifts'),
  };

  const dimensionsLink = dimensions.filter(
    (d) =>
      !d.dimTypes.includes(dimensionType) &&
      (d.entryType === DimensionEntryType.DIM_ENTRIES || d.entryType === DimensionEntryType.BOOL),
  );

  const handleSelectDimension = (dimension: DimensionT) => {
    selectedDimension?.id === dimension.id
      ? setSelectedDimension(null)
      : setSelectedDimension(dimension);
  };

  const handleLinkDimension = () => {
    if (!selectedDimension) return;
    if (selectedDimension.dimTypes.includes(dimensionType)) return;
    const newDimension = {
      ...selectedDimension,
      dimTypes: [...selectedDimension.dimTypes, dimensionType],
    };
    handleUpdateDimension(newDimension);
    setOpenParent(false);
  };

  return (
    <div>
      <span className="subtitle">{componentTitle[dimensionType]}</span>
      {dimensionsLink.map((dimension) => (
        <div
          key={dimension.id}
          onClick={() => handleSelectDimension(dimension)}
          className={`link-dimension-list-item mb-1 flex cursor-pointer items-center justify-between rounded-md border border-border p-2 transition-colors ${
            selectedDimension?.id === dimension.id ? 'border-primary bg-accent' : 'hover:bg-muted'
          }`}
        >
          <div>
            <span className="link-dimension-item-name font-medium">{dimension.name}</span>
            <div className="link-dimension-list-dim-entries mt-1 flex flex-wrap gap-1">
              {selectedDimension?.id === dimension.id &&
                dimEntries
                  .filter((de) => de.dimensionId === dimension.id)
                  .map((de) => (
                    <Badge key={de.id} variant="outline">
                      {de.name}
                    </Badge>
                  ))}
            </div>
          </div>
          {selectedDimension?.id === dimension.id && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                handleLinkDimension();
              }}
              className="h-8 w-8"
            >
              <Plus className="size-4" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
