import React, { useState, useEffect } from "react";
// MUI
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";

export default function DimensionDialog({
  buttonContent,
  title,
  content,
  open,
  setOpen,
}: {
  buttonContent: React.ReactNode;
  title: string;
  content: React.ReactNode;
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== "undefined" ? window.innerWidth : 0,
  );

  const handleClick = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleResize = () => {
        setWindowWidth(window.innerWidth);
      };

      window.addEventListener("resize", handleResize);

      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  const id = open ? "floating-dialog" : undefined;

  return (
    <Box>
      {/* trigger wrapper: use a non-button element so we don't accidentally nest buttons */}
      <Box
        component="span"
        aria-describedby={id}
        onClick={handleClick}
        sx={{
          display: "inline-block",
          backgroundColor: "transparent",
          border: "none",
          boxShadow: "none",
          "&:hover": {
            backgroundColor: "transparent",
            boxShadow: "none",
          },
          padding: 0,
          cursor: "pointer",
        }}
      >
        {buttonContent}
      </Box>

      <Dialog
        id={id}
        open={open}
        onClose={handleClose}
        aria-labelledby="floating-dialog-title"
        data-testid="new-dimension-dialog"
        // position the paper near the right side similar to the popover
        PaperProps={{
          style: {
            margin: 20,
            padding: 20,
            width: 350,
            height: "80%",
            boxSizing: "border-box",
            position: "absolute",
            top: 40,
            right: 20,
            boxShadow: "0px 3px 5px rgba(0, 0, 0, 0.2)",
          },
        }}
      >
        <DialogContent dividers={false} sx={{ margin: 0, padding: 0 }}>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            sx={{ marginBottom: 1.5 }}
          >
            <Typography
              variant="h6"
              id="floating-dialog-title"
              data-testid="new-dimension-dialog-title"
            >
              {title}
            </Typography>
            <IconButton
              onClick={handleClose}
              sx={{ padding: 0 }}
              data-testid="new-dimension-dialog-close"
            >
              <CloseIcon />
            </IconButton>
          </Box>
          {content}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
