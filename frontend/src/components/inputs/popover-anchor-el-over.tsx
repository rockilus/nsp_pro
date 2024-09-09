import * as React from "react";
// MUI
import Popover from "@mui/material/Popover";
import Button from "@mui/material/Button";

export default function PopoverAnchorElOver({
  buttonContent,
  content,
  open,
  setOpen,
}: {
  buttonContent: React.ReactNode;
  content: React.ReactNode;
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(
    null
  );

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setAnchorEl(null);
  };

  const id = open ? "simple-popover" : undefined;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
      }}
    >
      <Button
        aria-describedby={id}
        variant="contained"
        onClick={handleClick}
        sx={{
          backgroundColor: "transparent",
          border: "none",
          boxShadow: "none",
          "&:hover": {
            backgroundColor: "transparent",
            boxShadow: "none",
          },
          textTransform: "none",
          justifyContent: "flex-start",
          padding: 0,
          width: "100%",
          height: "100%",
          minHeight: 20,
        }}
      >
        {buttonContent}
      </Button>
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
      >
        {content}
      </Popover>
    </div>
  );
}
