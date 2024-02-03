import React, { useState, useRef, useEffect, useCallback } from "react";

import BlockEditList from "./BlockEditList";
import BlockEditString from "./BlockEditString";
import BlockEditQty from "./BlockEditQty";
import BlockEditDict from "./BlockEditDict";
import { TemplateBlockT, BlockT, TemplateOptionValueT } from "./types";
import { ConstraintDefaultColors } from "../../utils/constants";

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
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  console.log("BlockDisplay", block);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dialogRef.current &&
        !dialogRef.current.contains(event.target as Node)
      ) {
        handleClose();
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, handleClose]);

  return (
    <div>
      {templateBlock.name === "text" ? (
        <div
          className="field-value"
          style={{
            display: "inline-block",
            color: ConstraintDefaultColors.shade3,
          }}
        >
          {templateBlock.placeholder}
        </div>
      ) : open ? (
        <div>
          <div
            className="field-value-open"
            style={{
              position: "absolute",
            }}
          ></div>
          <div
            ref={dialogRef}
            style={{
              position: "relative",
              top: 0,
              left: 0,
              display: "inline-block",
            }}
          >
            {templateBlock.type === "dict" && (
              <BlockEditDict
                block={block}
                templateBlock={templateBlock}
                handleEditBlock={handleEditBlock}
                handleClose={handleClose}
              />
            )}
            {templateBlock.type === "list" && (
              <BlockEditList
                block={block}
                templateBlock={templateBlock}
                handleEditBlock={handleEditBlock}
                handleClose={handleClose}
              />
            )}
            {templateBlock.type === "string" && (
              <BlockEditString
                block={block}
                templateBlock={templateBlock}
                handleEditBlock={handleEditBlock}
                handleClose={handleClose}
              />
            )}
            {templateBlock.type === "number" && (
              <BlockEditQty
                block={block}
                templateBlock={templateBlock}
                handleEditBlock={handleEditBlock}
                handleClose={handleClose}
              />
            )}
          </div>
        </div>
      ) : (
        <div>
          {block &&
          block.type === "string" &&
          Array.isArray(block.value) &&
          block.value.length !== 0 ? (
            <div
              className="field-value"
              onClick={handleClickOpen}
              style={{
                display: "inline-block",
                cursor: "pointer",
                fontWeight: "bold",
                color: ConstraintDefaultColors.shade3,
              }}
            >
              {block.value.join(", ")}
            </div>
          ) : block &&
            block.type === "dict" &&
            Array.isArray(block.value) &&
            block.value.length !== 0 ? (
            <div
              className="field-value"
              onClick={handleClickOpen}
              style={{
                display: "inline-block",
                cursor: "pointer",
                fontWeight: "bold",
                color: ConstraintDefaultColors.shade3,
              }}
            >
              {block.value
                .map((item) =>
                  typeof item === "object" && "name" in item ? item.name : ""
                )
                .join(", ")}
            </div>
          ) : block &&
            ((block.type === "string" && block.value !== "") ||
              (block.type === "number" && block.value !== "")) ? (
            <div
              className="field-value"
              onClick={handleClickOpen}
              style={{
                display: "inline-block",
                cursor: "pointer",
                fontWeight: "bold",
                color: ConstraintDefaultColors.shade3,
              }}
            >
              {block.value as string | number}
            </div>
          ) : (
            <div
              className="field-value"
              onClick={handleClickOpen}
              style={{
                display: "inline-block",
                cursor: "pointer",
                fontStyle: "italic",
                fontWeight: "bold",
                color: ConstraintDefaultColors.shade2,
              }}
            >
              {templateBlock.placeholder}
            </div>
          )}
          <hr style={{ marginTop: "1px", marginBottom: "0px" }} />
          <div
            className="field-name"
            style={{
              fontSize: "10px",
              color: ConstraintDefaultColors.shade3,
            }}
          >
            {templateBlock.name.charAt(0).toUpperCase() +
              templateBlock.name.slice(1)}
          </div>
        </div>
      )}
    </div>
  );
}
