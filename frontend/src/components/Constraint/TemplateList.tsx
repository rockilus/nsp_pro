import React from "react";
import { useTranslation } from "react-i18next";
// MUI
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
// Types
import { TemplateT } from "./types";

interface Props {
  constraintTemplates: TemplateT[];
  selectedTemplate: TemplateT | null;
  handleSelectedTemplate: (ct: TemplateT) => void;
}

export default function TemplateList({
  constraintTemplates,
  selectedTemplate,
  handleSelectedTemplate,
}: Props) {
  const { t } = useTranslation();

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignSelf: "flex-start",
        width: "100%",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          minHeight: 35,
          paddingX: 1,
          borderTop: "1px solid lightgrey",
          borderBottom: "1px solid lightgrey",
          backgroundColor: "grey.100",
        }}
      >
        <Typography
          variant="subtitle2"
          align="left"
          sx={{ fontWeight: "bold" }}
        >
          {t("constraint.templates")}
        </Typography>
      </Box>
      <Box
        sx={{
          maxHeight: "200px",
          overflowY: "auto",
          backgroundColor: "white",
          marginBottom: 1,
        }}
      >
        <List dense={true} sx={{ padding: "0 0 0 0" }}>
          {constraintTemplates.map((ct, index) => (
            <ListItemButton
              key={index}
              onClick={() => {
                handleSelectedTemplate(ct);
              }}
              selected={selectedTemplate?.id === ct.id}
              sx={{ padding: "0 0 0 0" }}
            >
              <ListItem sx={{ padding: "0 16px 0 16px" }}>
                <ListItemText primary={ct.text} />
              </ListItem>
            </ListItemButton>
          ))}
        </List>
      </Box>
    </Box>
  );
}
