import React from "react";
// MUI
import Box from "@mui/material/Box";
// Components
import BlockDisplayDict from "./BlockDisplayDict";
import BlockDisplayList from "./BlockDisplayList";
import BlockDisplayString from "./BlockDisplayString";
import BlockDisplayNumber from "./BlockDisplayNumber";
import { blockDisplayText } from "../SharedComponents/blockDislay";
// Types
import { TemplateBlockT, BlockT } from "./types";

interface Props {
  block: BlockT | null;
  templateBlock: TemplateBlockT;
  handleEditBlock: (block: BlockT) => void;
}

export default function BlockDisplay({
  block,
  templateBlock,
  handleEditBlock,
}: Props) {
  return (
    <Box sx={{ height: "100%" }}>
      {templateBlock.name === "text" ? (
        blockDisplayText(templateBlock.placeholder as string)
      ) : templateBlock.type === "dict" ? (
        <BlockDisplayDict
          block={block}
          templateBlock={templateBlock}
          handleEditBlock={handleEditBlock}
        />
      ) : templateBlock.type === "list" ? (
        <BlockDisplayList
          block={block}
          templateBlock={templateBlock}
          handleEditBlock={handleEditBlock}
        />
      ) : templateBlock.type === "string" ? (
        <BlockDisplayString
          block={block}
          templateBlock={templateBlock}
          handleEditBlock={handleEditBlock}
        />
      ) : templateBlock.type === "number" ? (
        <BlockDisplayNumber
          block={block}
          templateBlock={templateBlock}
          handleEditBlock={handleEditBlock}
        />
      ) : null}
    </Box>
  );
}
