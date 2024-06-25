import React from "react";
// MUI
import Box from "@mui/material/Box";
// Components
import BlockDisplayDict from "./block-display-dict";
import BlockDisplayList from "./block-display-list";
import BlockDisplayString from "./block-display-string";
import BlockDisplayNumber from "./block-display-number";
import { blockDisplayText } from "../data-display/block-dislay";
// Types
import { TemplateBlockT, BlockT } from "../../types/constraint";

export default function BlockDisplay({
  lng,
  block,
  templateBlock,
  handleEditBlock,
}: {
  lng: string;
  block: BlockT | null;
  templateBlock: TemplateBlockT;
  handleEditBlock: (block: BlockT) => void;
}) {
  return (
    <Box sx={{ height: "100%" }}>
      {templateBlock.name === "text" ? (
        blockDisplayText(templateBlock.placeholder as string)
      ) : templateBlock.type === "dict" ? (
        <BlockDisplayDict
          lng={lng}
          block={block}
          templateBlock={templateBlock}
          handleEditBlock={handleEditBlock}
        />
      ) : templateBlock.type === "list" ? (
        <BlockDisplayList
          lng={lng}
          block={block}
          templateBlock={templateBlock}
          handleEditBlock={handleEditBlock}
        />
      ) : templateBlock.type === "string" ? (
        <BlockDisplayString
          lng={lng}
          block={block}
          templateBlock={templateBlock}
          handleEditBlock={handleEditBlock}
        />
      ) : templateBlock.type === "number" ? (
        <BlockDisplayNumber
          lng={lng}
          block={block}
          templateBlock={templateBlock}
          handleEditBlock={handleEditBlock}
        />
      ) : null}
    </Box>
  );
}
