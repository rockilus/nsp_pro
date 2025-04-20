import React, { useState } from "react";
import { useTranslation } from "../../../app/i18n/client";
// MUI
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import AddIcon from "@mui/icons-material/Add";
// Styles
import "../../../styles/text-styles.css";
import "./link-dimension-list.css";
// Types
import { DimensionType } from "@/types/dimension";
import { DimensionEntryType } from "@/types/dimension";
import { DimEntryT } from "@/types/dim-entry";
import { DimensionT } from "@/types/dimension";

export default function LinkDimensionList({
  lng,
  dimensionType,
  dimensions,
  dimEntries,
  setOpenParent,
  handleUpdateDimension,
}: {
  lng: string;
  dimensionType: DimensionType;
  dimensions: DimensionT[];
  dimEntries: DimEntryT[];
  setOpenParent: (open: boolean) => void | null;
  handleUpdateDimension: (dimension: DimensionT) => void;
}) {
  const { t } = useTranslation(lng, "shift-page");
  const [selectedDimension, setSelectedDimension] = useState<DimensionT | null>(
    null
  );

  const componentTitle = {
    [DimensionType.WORKER]: t("link_to_shifts"),
    [DimensionType.SHIFT]: t("link_to_workers_or_rests"),
    [DimensionType.REST_SHIFT]: t("link_to_workers_or_shifts"),
  };

  console.log("dimensions", dimensions);

  const dimensionsLink = dimensions.filter(
    (d) =>
      !d.dimTypes.includes(dimensionType) &&
      (d.entryType === DimensionEntryType.DIM_ENTRIES ||
        d.entryType === DimensionEntryType.BOOL)
  );

  const handleSelectDimension = (dimension: DimensionT) => {
    selectedDimension?.id === dimension.id
      ? setSelectedDimension(null)
      : setSelectedDimension(dimension);
  };

  const handleLinkDimension = () => {
    if (!selectedDimension) return;
    if (selectedDimension.dimTypes.includes(dimensionType)) return;
    const newDimension = {
      ...selectedDimension,
      dimTypes: [...selectedDimension.dimTypes, dimensionType],
    };
    handleUpdateDimension(newDimension);
    setOpenParent(false);
  };

  return (
    <div>
      <span className="subtitle">{componentTitle[dimensionType]}</span>
      {dimensionsLink.map((dimension) => (
        <div
          key={dimension.id}
          onClick={() => handleSelectDimension(dimension)}
          className={`link-dimension-list-item ${
            selectedDimension?.id === dimension.id ? "selected" : ""
          }`}
        >
          <div>
            <span className="link-dimension-item-name">{dimension.name}</span>
            <div className="link-dimension-list-dim-entries">
              {selectedDimension?.id === dimension.id &&
                dimEntries
                  .filter((de) => de.dimensionId === dimension.id)
                  .map((de) => (
                    <div key={de.id}>
                      <Chip label={de.name} />
                    </div>
                  ))}
            </div>
          </div>
          {selectedDimension?.id === dimension.id && (
            <IconButton onClick={handleLinkDimension}>
              <AddIcon />
            </IconButton>
          )}
        </div>
      ))}
    </div>
  );
}
