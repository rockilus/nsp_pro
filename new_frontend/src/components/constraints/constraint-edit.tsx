import React, { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
// MUI
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
// Components
import BlockDisplay from "./block-display";
// Types
import {
  ConstraintT,
  TemplateT,
  BlockT,
  TemplateBlockT,
  TemplateOptionValueT,
} from "../../types/constraint";

export default function ConstraintEdit({
  lng,
  constraint,
  constraintTemplate,
  handleAddConstraint,
  handleUpdateConstraint,
}: {
  lng: string;
  constraint: ConstraintT;
  constraintTemplate: TemplateT | null;
  handleAddConstraint: (constraint: ConstraintT) => void;
  handleUpdateConstraint: (updatedConstraint: ConstraintT) => void;
}) {
  const { t } = useTranslation();

  const initialBlockValue = (
    templateBlock: TemplateBlockT
  ): string | number | string[] | TemplateOptionValueT[] => {
    if (templateBlock.type === "text") {
      return templateBlock.placeholder;
    } else if (templateBlock.type === "dict") {
      return [];
    } else {
      if (
        templateBlock.options.length === 0 &&
        templateBlock.type !== "number"
      ) {
        return templateBlock.placeholder;
      } else if (
        Array.isArray(templateBlock.options) &&
        templateBlock.options.length === 1
      ) {
        return templateBlock.options[0] as string;
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

  const handleSaveConstraint = () => {
    if (constraint.id === "") {
      handleAddConstraint(constraintState);
    } else {
      handleUpdateConstraint(constraintState);
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
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
      }}
    >
      <div style={{ display: "flex", flexDirection: "row" }}>
        {constraintTemplate?.blocks.map((templateBlock, index) => (
          <div
            key={index}
            style={{
              display: "flex",
              alignItems: "center",
              marginRight: "5px",
            }}
          >
            <BlockDisplay
              lng={lng}
              block={findBlockByName(templateBlock.name)}
              templateBlock={templateBlock}
              handleEditBlock={handleEditBlock}
            />
          </div>
        ))}
      </div>
      <Button
        variant="contained"
        onClick={handleSaveConstraint}
        sx={{ textTransform: "none", height: 35, width: 60 }}
      >
        {constraint.id === "" ? t("common.add") : t("common.save")}
      </Button>
    </Box>
  );
}
