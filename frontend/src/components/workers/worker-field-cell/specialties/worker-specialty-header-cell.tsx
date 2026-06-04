import React, { useState } from 'react';
import { useTranslation } from '../../../../app/i18n/client';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
// Components
import PopoverAnchorElBelow from '../../../inputs/popover-anchor-el-below';
import UpdateSpecialtiesForm from './update-specialties-form';
import ColumnSortFilterMenu from '../../../table/ColumnSortFilterMenu';
// Styles
import '../../../../styles/table-styles.css';
//Types
import { SpecialtyT } from '@/types/specialty';
import { ColumnDefinition, ColumnFilter, TableSort } from '../../../../types/filter';

interface WorkerSpecialtyHeaderCellProps {
  lng: string;
  teamId: string;
  specialties: SpecialtyT[];
  column?: ColumnDefinition;
  currentSort?: TableSort;
  onSort?: (sort: TableSort | null) => void;
  onFilter?: (filter: ColumnFilter) => void;
  handleAddSpecialty: (specialty: SpecialtyT) => void;
  handleUpdateSpecialty: (specialty: SpecialtyT) => void;
  handleDeleteSpecialty: (specialtyId: string) => void;
}

export default function WorkerSpecialtyHeaderCell({
  lng,
  teamId,
  specialties,
  column,
  currentSort,
  onSort,
  onFilter,
  handleAddSpecialty,
  handleUpdateSpecialty,
  handleDeleteSpecialty,
}: WorkerSpecialtyHeaderCellProps) {
  const { t } = useTranslation(lng, 'worker-page');

  const [popoverAnchorOpen, setPopoverAnchorOpen] = useState(false);

  const cellContent = () => (
    <div className="table-header-default flex items-center justify-between">
      <Tooltip>
        <TooltipTrigger asChild>
          <span data-testid="worker-specialty-header-cell">{t('specialties')}</span>
        </TooltipTrigger>
        <TooltipContent>{t('specialties_tooltip')}</TooltipContent>
      </Tooltip>
      <div className="flex items-center gap-1">
        {onSort && onFilter && column && (
          <div onClick={(e) => e.stopPropagation()}>
            <ColumnSortFilterMenu
              column={column}
              currentSort={currentSort}
              currentFilter={undefined}
              onSort={onSort}
              onFilter={onFilter}
            />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <td className="worker-table-header h-9 border-b border-border bg-muted px-2 py-0 text-xs font-medium">
      <PopoverAnchorElBelow
        buttonContent={cellContent()}
        content={
          <UpdateSpecialtiesForm
            lng={lng}
            teamId={teamId}
            specialties={specialties}
            setOpenParent={setPopoverAnchorOpen}
            handleAddSpecialty={handleAddSpecialty}
            handleUpdateSpecialty={handleUpdateSpecialty}
            handleDeleteSpecialty={handleDeleteSpecialty}
          />
        }
        open={popoverAnchorOpen}
        setOpen={setPopoverAnchorOpen}
      />
    </td>
  );
}
