import React, { useState, useRef, useEffect, useCallback } from "react";

import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";

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
  return (
    <div
      style={{
        border: "1px solid black",
        borderRadius: "4px",
        maxHeight: "200px",
        overflowY: "auto",
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
    </div>
  );
}
