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
      key={tab.id}
      onClick={() => handleSelectTab(tab.id)}
      sx={{
        borderRadius: 4,
        textTransform: "none",
        border: isSelected ? "1px solid" : "none",
        height: "30px",
        color: "#65676b",
      }}
    >
      {tab.label}
    </Button>
  );
};

export default TabButton;
