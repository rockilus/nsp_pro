import React, { useState, useRef, useEffect, useCallback } from "react";

import BlockEdit from "./BlockEdit";
import QuantityItem from "./QuantityItem";
import { ConstraintT, ConstraintTemplateT, BlockT } from "./types";

interface Props {
  constraint: ConstraintT;
  constraintTemplate: ConstraintTemplateT | null;
}

export default function ConstraintEdit({
  constraint,
  constraintTemplate,
}: Props) {
  const [constraintState, setConstraintState] = useState(constraint);

  const findBlockByName = (name: string): BlockT | null => {
    const block = constraintState.blocks.find((block) => block.name === name);
    return block ? block : null;
  };

  const handleEditBlock = (block: BlockT) => {
    if (findBlockByName(block.name) === null) {
      setConstraintState({
        ...constraintState,
        blocks: [...constraintState.blocks, block],
      });
    } else {
      setConstraintState({
        ...constraintState,
        blocks: constraintState.blocks.map((b) =>
          b.name === block.name ? block : b
        ),
      });
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", flexDirection: "row" }}>
        {constraintTemplate?.blocks.map((templateBlock, index) => (
          <div key={index} style={{ marginRight: "5px" }}>
            <BlockEdit
              block={findBlockByName(templateBlock.name)}
              templateBlock={templateBlock}
              handleEditBlock={handleEditBlock}
            />
          </div>
        ))}

        {/* {constraintTemplate?.blocks.map((templateBlock, index) => (
          <div key={index} style={{ marginRight: "5px" }}>
            {["operator", "shift", "worker", "timing"].includes(
              templateBlock.name
            ) &&
              (templateBlock.options.length > 1 ? (
                <BlockEdit selector={templateBlock} />
              ) : (
                <div>
                  <div className="field-name" style={{ fontSize: "10px" }}>
                    {templateBlock.name.charAt(0).toUpperCase() +
                      templateBlock.name.slice(1)}
                  </div>
                  <div className="field-value">{templateBlock.selected[0]}</div>
                </div>
              ))}
            {templateBlock.name === "text" && (
              <div>
                <div className="field-name" style={{ height: "15px" }}></div>
                <div className="field-value">{templateBlock.selected[0]}</div>
              </div>
            )}
            {templateBlock.name === "#" && (
              <QuantityItem selector={templateBlock} />
            )}
          </div>
        ))} */}
      </div>
      <button style={{}}>Add</button>
    </div>
  );
}
