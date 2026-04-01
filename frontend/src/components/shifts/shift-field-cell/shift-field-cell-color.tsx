import React, { useState } from 'react';
// MUI
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Menu from '@mui/material/Menu';
import TableCell from '@mui/material/TableCell';
import Popover from '@mui/material/Popover';
import Button from '@mui/material/Button';
// Types
import { ShiftT, ShiftLeaveType, ShiftRestType } from '../../../types/shift';
// Constants
import { ShiftColorMappings } from '../../../constants/constants';

export default function ShiftFieldCellColor({
  shift,
  handleUpdateShift,
}: {
  shift: ShiftT;
  handleUpdateShift: (updatedShift: ShiftT) => void;
}) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (shift.leaveType === ShiftLeaveType.NONE && shift.restType !== ShiftRestType.OFF) {
      setAnchorEl(event.currentTarget);
    }
  };
  const handleClose = () => {
    setAnchorEl(null);
  };
  const handleColorChange = (colorKey: string) => {
    if (colorKey !== shift.color) {
      handleUpdateShift({ ...shift, color: colorKey });
    }
    handleClose();
  };

  return (
    <TableCell component="th" scope="row" sx={{ width: 30, paddingY: 0 }}>
      <Box style={{ width: '100%' }}>
        <Box
          onClick={handleClick}
          sx={{
            display: 'inline-flex',
            minWidth: 0,
            cursor:
              shift.leaveType === ShiftLeaveType.NONE && shift.restType !== ShiftRestType.OFF
                ? 'pointer'
                : 'default',
          }}
        >
          <Chip
            label=""
            style={{
              width: '30px',
              height: '22px',
              backgroundColor: ShiftColorMappings[shift.color]?.sample || '#ccc',
            }}
          />
        </Box>
        <Popover
          id="color-popover"
          open={open}
          anchorEl={anchorEl}
          onClose={handleClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
        >
          <Box sx={{ display: 'flex', flexWrap: 'wrap', padding: 1 }}>
            {Object.keys(ShiftColorMappings).map((colorKey) => (
              <Button
                key={colorKey}
                onClick={() => handleColorChange(colorKey)}
                sx={{
                  backgroundColor: ShiftColorMappings[colorKey].sample,
                  width: 30,
                  height: 30,
                  minWidth: 0,
                  margin: 0.5,
                  borderRadius: '50%',
                  // border: "1px solid #ccc",
                  '&:hover': {
                    backgroundColor: ShiftColorMappings[colorKey].text,
                  },
                }}
              />
            ))}
          </Box>
        </Popover>
      </Box>
    </TableCell>
  );
}
