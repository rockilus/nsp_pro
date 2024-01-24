import React, { useEffect, useState, useCallback } from "react";

import BlockDisplay from "./BlockDisplay";
import { ConstraintT, TemplateT, BlockT, TemplateBlockT } from "./types";
import { useConstraintStore } from "../../stores/constraintStore";
import TemplateList from "./TemplateList";

interface Props {
  constraint: ConstraintT;
  constraintTemplate: TemplateT | null;
}

export default function ConstraintEdit({
  constraint,
  constraintTemplate,
}: Props) {
  const initialBlockValue = (
    templateBlock: TemplateBlockT
  ): string | number | string[] => {
    if (templateBlock.type === "text") {
      return templateBlock.placeholder;
    } else {
      if (
        templateBlock.options.length === 0 &&
        templateBlock.type !== "number"
      ) {
        return templateBlock.placeholder;
      } else if (templateBlock.options.length === 1) {
        return templateBlock.options[0];
      } else {
        return templateBlock.type === "list" ? [] : "";
      }
    }
  };

  const initialConstraintState = useCallback((): ConstraintT => {
    if (constraint.id === "") {
      const blocks: BlockT[] = [];
      if (constraintTemplate && constraintTemplate.blocks) {
        for (let block of constraintTemplate.blocks) {
          blocks.push({
            name: block.name,
            type: block.type,
            value: initialBlockValue(block),
          });
        }
      }
      return { ...constraint, blocks: blocks };
    } else {
      return constraint;
    }
  }, [constraint, constraintTemplate]);

  const [constraintState, setConstraintState] = useState(
    initialConstraintState
  );
  const addConstraint = useConstraintStore((state) => state.addConstraint);
  const updateConstraint = useConstraintStore(
    (state) => state.updateConstraint
  );

  const handleSaveConstraint = () => {
    if (constraint.id === "") {
      addConstraint(constraintState);
    } else {
      updateConstraint(constraintState);
    }
  };

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

  useEffect(() => {
    setConstraintState(initialConstraintState());
  }, [initialConstraintState]);

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
            <BlockDisplay
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
      <button onClick={handleSaveConstraint}>Add</button>
    </div>
  );
}
