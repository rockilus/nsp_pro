import React from "react";
// MUI
import Box from "@mui/material/Box";
import Menu from "@mui/material/Menu";
// Components
import ConstraintEdit from "./ConstraintEdit";
// Types
import { ConstraintT, TemplateT } from "./types";

interface Props {
  buttonElement: React.ReactNode;
  constraint: ConstraintT;
  constraintTemplate: TemplateT | null;
}

export default function ConstraintButton({
  buttonElement,
  constraint,
  constraintTemplate,
}: Props) {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <Box style={{ width: "100%" }}>
      <Box onClick={handleClick} sx={{ display: "inline-flex", minWidth: 0 }}>
        {buttonElement}
      </Box>
      <Menu
        id="basic-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          "aria-labelledby": "basic-button",
        }}
        slotProps={{
          paper: {
            style: {
              width: "95%",
            },
          },
        }}
      >
        <ConstraintEdit
          constraint={constraint}
          constraintTemplate={constraintTemplate}
        />
      </Menu>
    </Box>
  );
}
