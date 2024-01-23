import React, { useState, useRef, useEffect, useCallback } from "react";

import FieldEntry from "./FieldEntry";
import { ConstraintTemplateBlockT, BlockT } from "./types";

interface Props {
  block: BlockT | null;
  templateBlock: ConstraintTemplateBlockT;
  handleEditBlock: (block: BlockT) => void;
}

export default function BlockEdit({
  block,
  templateBlock,
  handleEditBlock,
}: Props) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

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
      <div className="field-name" style={{ fontSize: "10px" }}>
        {templateBlock.name.charAt(0).toUpperCase() +
          templateBlock.name.slice(1)}
      </div>
      {!open && (
        <div
          className="field-value"
          onClick={handleClickOpen}
          style={{
            display: "inline-block",
            cursor: "pointer",
            fontWeight: "bold",
            //   position: "absolute",
            //   position: "relative",
            //   top: "0px",
            //   left: "0px",
            //   width: "100%",
            //   height: "100%",
          }}
        >
          {block
            ? block.type === "string" || block.type == "number"
              ? block.value
              : block.value.join(", ")
            : templateBlock.placeholder}
        </div>
      )}

      {open && (
        <div>
          <div
            className="field-value-open"
            style={{
              // display: "inline-block",
              position: "absolute",
              //   zIndex: -1,
              //   position: "relative",
              //   top: "0px",
              //   left: "0px",
              //   width: "100%",
              //   height: "100%",
            }}
          ></div>
          <div
            ref={dialogRef}
            style={{
              position: "relative",
              //   position: "fixed",
              // position: "absolute",
              top: 0,
              left: 0,
              //   zIndex: 1,
              display: "inline-block",
            }}
          >
            <FieldEntry
              block={block}
              templateBlock={templateBlock}
              handleEditBlock={handleEditBlock}
            />
          </div>
        </div>
      )}
    </div>
  );
}
