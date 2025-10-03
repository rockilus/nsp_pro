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
import { WorkerT } from "../../../../types/worker";
import { ShiftT } from "../../../../types/shift";

export default function BlockDisplay({
  lng,
  workers,
  shifts,
  index,
  block,
  templateBlock,
  error,
  handleEditBlock,
  handleRemoveError,
}: {
  lng: string;
  workers: WorkerT[];
  shifts: ShiftT[];
  index: number;
  block: BlockT | null;
  templateBlock: TemplateBlockT;
  error: boolean;
  handleEditBlock: (block: BlockT) => void;
  handleRemoveError: (index: number) => void;
}) {
  return (
    <Box
      sx={{ height: "100%" }}
      data-testid={`constraint-block-display-${index}`}
    >
      {templateBlock.name === BlockNameOptions.TEXT ? (
        blockDisplayText(templateBlock.placeholder as string)
      ) : templateBlock.type === BlockTypeOptions.SHIFT_WORKER_OPTION ? (
        <BlockDisplayShiftWorkerOption
          lng={lng}
          workers={workers}
          shifts={shifts}
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
