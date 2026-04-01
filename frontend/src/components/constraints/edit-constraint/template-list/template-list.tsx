import React from "react";
import { useTranslation } from "../../../../app/i18n/client";
// MUI
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
// Styles
import "../../../../styles/text-styles.css";
import "./template-list.css";
// Types
import { TemplateT, ConstraintType } from "../../../../types/constraint";

export default function TemplateList({
  lng,
  templates,
  selectedTemplate,
  handleSelectedTemplate,
}: {
  lng: string;
  templates: TemplateT[];
  selectedTemplate: TemplateT | null;
  handleSelectedTemplate: (ct: TemplateT) => void;
}) {
  const { t } = useTranslation(lng, "constraint-page");

  return (
    <div data-testid="template-list">
      <span className="subtitle">{t("templates")}</span>
      <Box
        className="templates-container"
        sx={{
          maxHeight: "200px",
          overflowY: "auto",
          backgroundColor: "white",
          marginBottom: 1,
          border: "1px solid #e0e0e0",
        }}
      >
        <List dense={true} sx={{ padding: "0 0 0 0" }}>
          {templates
            .filter(
              (ct) =>
                ct.constraintType !== ConstraintType.FAI &&
                ct.constraintType !== ConstraintType.EVE,
            )
            .map((ct, index) => (
              <ListItemButton
                key={index}
                onClick={() => {
                  handleSelectedTemplate(ct);
                }}
                selected={selectedTemplate?.id === ct.id}
                sx={{ padding: "0 0 0 0" }}
                data-testid={`template-item-${index}`}
              >
                <ListItem sx={{ padding: "0 16px 0 16px" }}>
                  <ListItemText primary={ct.text} />
                </ListItem>
              </ListItemButton>
            ))}
        </List>
      </Box>
    </div>
  );
}
