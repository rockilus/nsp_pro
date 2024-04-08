import * as React from "react";
// MUI
import Button from "@mui/material/Button";

interface Props {
  tab: { id: string; label: string };
  isSelected: boolean;
  handleSelectTab: (tabId: string) => void;
}

const TabButton = ({ tab, isSelected, handleSelectTab }: Props) => {
  return (
    <Button
      onClick={() => handleSelectTab(tab.id)}
      sx={{
        borderRadius: 4,
        textTransform: "none",
        border: isSelected ? "1px solid" : "none",
        height: "30px",
        color: "grey.700",
      }}
    >
      {tab.label}
    </Button>
  );
};

export default TabButton;
