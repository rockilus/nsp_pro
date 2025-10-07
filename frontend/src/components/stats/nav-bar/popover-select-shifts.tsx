import * as React from "react";
// MUI
import Popover from "@mui/material/Popover";
// Styles
import "./popover-select-shifts.css";

export default function PopoverSelectShifts({
  buttonContent,
  content,
  open,
  disabled,
  handleOpenPopover,
  handleClosePopover,
}: {
  buttonContent: React.ReactNode;
  content: React.ReactNode;
  open: boolean;
  disabled: boolean;
  handleOpenPopover: () => void;
  handleClosePopover: () => void;
}) {
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    handleOpenPopover();
  };

  const handleClose = () => {
    handleClosePopover();
    setAnchorEl(null);
  };

  const id = open ? "simple-popover" : undefined;

  return (
    <div className={`popover-select-shifts ${disabled ? "disabled" : ""}`}>
      <label className="popover-select-shifts-label">
        <span className="popover-select-shifts-text">Select Shifts</span>
      </label>
      <div
        className="popover-select-shifts-button"
        onClick={handleClick}
        data-testid="shift-options-button"
      >
        {buttonContent}
      </div>
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        slotProps={{
          paper: {
            style: {
              boxShadow: "0px 3px 5px rgba(0, 0, 0, 0.2)",
              padding: 0,
            },
          },
        }}
        data-testid="shift-options-popover"
      >
        {content}
      </Popover>
    </div>
  );
}
