import * as React from "react";
import Popover from "@mui/material/Popover";
import Button from "@mui/material/Button";

interface Props {
  buttonContent: React.ReactNode;
  content: React.ReactNode;
  open: boolean;
  setOpen: (open: boolean) => void;
}

export default function PopoverAnchorElBelow({
  buttonContent,
  content,
  open,
  setOpen,
}: Props) {
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
    <div>
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
          vertical: "bottom",
          horizontal: "left",
        }}
        slotProps={{
          paper: {
            style: {
              boxShadow: "0px 3px 5px rgba(0, 0, 0, 0.2)",
              padding: 20,
              width: 350,
            },
          },
        }}
      >
        {content}
      </Popover>
    </div>
  );
}
