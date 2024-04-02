import React, { useState, useEffect } from "react";
// MUI
import Button from "@mui/material/Button";
import Popover from "@mui/material/Popover";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";

interface Props {
  buttonContent: React.ReactNode;
  title: string;
  content: React.ReactNode;
  open: boolean;
  setOpen: (open: boolean) => void;
}

export default function PopoverRHS({
  buttonContent,
  title,
  content,
  open,
  setOpen,
}: Props) {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  const handleClick = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const id = open ? "floating-popover" : undefined;

  return (
    <Box>
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
        }}
      >
        {buttonContent}
      </Button>
      <Popover
        id={id}
        open={open}
        anchorReference="anchorPosition"
        anchorPosition={{ top: 40, left: windowWidth - 390 }}
        onClose={handleClose}
        slotProps={{
          paper: {
            style: {
              margin: 20,
              boxShadow: "0px 3px 5px rgba(0, 0, 0, 0.2)",
              padding: 20,
              //   maxWidth: 300,
              width: 350,
              height: "80%",
            },
          },
        }}
      >
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          sx={{ marginBottom: 1.5 }}
        >
          <Typography variant="h6">{title}</Typography>
          <IconButton onClick={handleClose} sx={{ padding: 0 }}>
            <CloseIcon />
          </IconButton>
        </Box>
        {content}
      </Popover>
    </Box>
  );
}
