import * as React from 'react';
// MUI
import AddIcon from '@mui/icons-material/Add';
import Tooltip from '@mui/material/Tooltip';
// Styles
import './table-add-button.css';

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
      className="add-button"
      onClick={() => handleClick && handleClick()}
      data-testid={dataTestId ?? `add-${text.toLowerCase()}-button`}
    >
      {showIcon && <AddIcon sx={{ height: '17px' }} />}
      {text}
    </button>
  );

  return tooltip ? <Tooltip title={tooltip}>{button}</Tooltip> : button;
};
export default TableAddButton;
