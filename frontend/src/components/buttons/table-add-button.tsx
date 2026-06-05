'use client';

import * as React from 'react';
import { Plus } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

const TableAddButton = ({
  text,
  handleClick,
  showIcon = true,
  tooltip,
  dataTestId,
}: {
  text: string;
  handleClick?: () => void;
  showIcon?: boolean;
  tooltip?: string;
  dataTestId?: string;
}) => {
  const button = (
    <button
      className="add-button inline-flex cursor-pointer items-center gap-1 rounded-md border-none bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      onClick={() => handleClick && handleClick()}
      data-testid={dataTestId ?? `add-${text.toLowerCase()}-button`}
    >
      {showIcon && <Plus className="size-[17px]" />}
      {text}
    </button>
  );

  return tooltip ? (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  ) : (
    button
  );
};
export default TableAddButton;
