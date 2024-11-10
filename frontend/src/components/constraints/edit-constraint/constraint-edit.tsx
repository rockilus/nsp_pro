import React, { useEffect, useState, useCallback } from "react";
import { useTranslation } from "../../../app/i18n/client";
// MUI
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
// Components
import BlockDisplay from "./constraint-blocks/block-display";
// Types
import {
  ConstraintT,
  TemplateT,
  BlockT,
  TemplateBlockT,
  ShiftWorkerOptionT,
} from "../../../types/constraint";
import { set } from "zod";

export default function ConstraintEdit({
  lng,
  constraint,
  template,
  handleAddConstraint,
  handleUpdateConstraint,
}: {
  lng: string;
  constraint: ConstraintT;
  template: TemplateT | null;
  handleAddConstraint: (constraint: ConstraintT) => void;
  handleUpdateConstraint: (updatedConstraint: ConstraintT) => void;
}) {
  const { t } = useTranslation(lng, "constraint-page");
  const [errors, setErrors] = useState<number[]>([]);

  const initialBlockValue = (
    templateBlock: TemplateBlockT
  ): string | number | string[] | ShiftWorkerOptionT[] => {
    if (templateBlock.type === "text") {
      return templateBlock.placeholder;
    } else if (templateBlock.type === "shift_worker_option") {
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
      if (template && template.blocks) {
        for (let block of template.blocks) {
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
  }, [constraint, template]);

  const [constraintState, setConstraintState] = useState(
    initialConstraintState
  );

  const validateConstraint = (): boolean => {
    const updatedErrors: number[] = [];
    if (template) {
      template.blocks.map((block, index) => {
        const value = constraintState.blocks[index].value;
        if (block.type === "shift_worker_option" || block.type === "list") {
          if (Array.isArray(value) && value.length === 0) {
            updatedErrors.push(index);
            console.log("added error", index);
          }
        } else if (block.type === "string" || block.type === "number") {
          if (value === "") {
            updatedErrors.push(index);
            console.log("added error", index);
          }
        }
      });
      setErrors(updatedErrors);
      return updatedErrors.length === 0;
    } else {
      return false;
    }
  };

  const handleRemoveError = (index: number): void => {
    const updatedErrors = errors.filter((error) => error !== index);
    console.log("errors after remove", updatedErrors);

    setErrors(updatedErrors);
  };

  const handleSaveConstraint = () => {
    const valid = validateConstraint();
    console.log("constraintState", constraintState);

    if (!valid) {
      return;
    }
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
    setErrors([]);
  }, [initialConstraintState]);

  console.log("errors", errors);

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
        {template?.blocks.map((templateBlock, index) => (
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
              index={index}
              block={findBlockByName(templateBlock.name)}
              templateBlock={templateBlock}
              error={errors.includes(index)}
              handleEditBlock={handleEditBlock}
              handleRemoveError={handleRemoveError}
            />
          </div>
        ))}
      </div>
      <Button
        variant="contained"
        onClick={handleSaveConstraint}
        sx={{ textTransform: "none", height: 35, width: 60 }}
      >
        {constraint.id === "" ? t("add") : t("save")}
      </Button>
    </Box>
  );
}
