import * as React from 'react';
// MUI
import Box from '@mui/material/Box';
import Popover from '@mui/material/Popover';

export default function PopoverBoxAnchorElOver({
  buttonContent,
  content,
  open,
  setOpen,
  'data-testid': dataTestId,
}: {
  buttonContent: React.ReactNode;
  content: React.ReactNode;
  open: boolean;
  setOpen: (open: boolean) => void;
  'data-testid'?: string;
}) {
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setAnchorEl(null);
  };

  const id = open ? 'simple-popover' : undefined;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
      }}
      data-testid={dataTestId}
    >
      <Box onClick={handleClick}>{buttonContent}</Box>
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        slotProps={{
          paper: {
            style: {
              boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.2)',
              padding: 0,
            },
          },
        }}
      >
        {content}
      </Popover>
    </div>
  );
}
