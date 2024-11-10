import React from "react";
// MUI
import Box from "@mui/material/Box";
// Components
import BlockDisplayShiftWorkerOption from "./block-display-shift-worker-option";
import BlockDisplayList from "./block-display-list";
import BlockDisplayString from "./block-display-string";
import BlockDisplayNumber from "./block-display-number";
import { blockDisplayText } from "../../../data-display/block-display";
// Types
import {
  TemplateBlockT,
  BlockT,
  BlockNameOptions,
  BlockTypeOptions,
} from "../../../../types/constraint";

export default function BlockDisplay({
  lng,
  index,
  block,
  templateBlock,
  error,
  handleEditBlock,
  handleRemoveError,
}: {
  lng: string;
  index: number;
  block: BlockT | null;
  templateBlock: TemplateBlockT;
  error: boolean;
  handleEditBlock: (block: BlockT) => void;
  handleRemoveError: (index: number) => void;
}) {
  return (
    <Box sx={{ height: "100%" }}>
      {templateBlock.name === BlockNameOptions.TEXT ? (
        blockDisplayText(templateBlock.placeholder as string)
      ) : templateBlock.type === BlockTypeOptions.SHIFT_WORKER_OPTION ? (
        <BlockDisplayShiftWorkerOption
          lng={lng}
          index={index}
          block={block}
          templateBlock={templateBlock}
          error={error}
          handleEditBlock={handleEditBlock}
          handleRemoveError={handleRemoveError}
        />
      ) : templateBlock.type === BlockTypeOptions.LIST ? (
        <BlockDisplayList
          lng={lng}
          index={index}
          block={block}
          templateBlock={templateBlock}
          error={error}
          handleEditBlock={handleEditBlock}
          handleRemoveError={handleRemoveError}
        />
      ) : templateBlock.type === BlockTypeOptions.STRING ? (
        <BlockDisplayString
          lng={lng}
          index={index}
          block={block}
          templateBlock={templateBlock}
          error={error}
          handleEditBlock={handleEditBlock}
          handleRemoveError={handleRemoveError}
        />
      ) : templateBlock.type === BlockTypeOptions.NUMBER ? (
        <BlockDisplayNumber
          lng={lng}
          index={index}
          block={block}
          templateBlock={templateBlock}
          error={error}
          handleEditBlock={handleEditBlock}
          handleRemoveError={handleRemoveError}
        />
      ) : null}
    </Box>
  );
}
