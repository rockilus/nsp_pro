import React, { useState } from "react";
// Components
import PopoverBoxAnchorElOver from "../../SharedComponents/PopoverBoxAnchorElOver";
import { blockDislayValue } from "../../SharedComponents/blockDislay";
import ShiftOptionsEdit from "./ShiftOptionsEdit";
// Types
import { TemplateOptionValueT } from "../../Constraint/types";
import { StatsShiftOptionsT } from "../types";

interface Props {
  selectedShifts: TemplateOptionValueT[];
  statsShiftOptions: StatsShiftOptionsT;
  handleEditSelectedShifts: (selectedShifts: TemplateOptionValueT[]) => void;
}

export default function ShiftOptionsDisplay({
  selectedShifts,
  statsShiftOptions,
  handleEditSelectedShifts,
}: Props) {
  const [open, setOpen] = useState(false);

  const blockDisplay = () => {
    return (
      <div>
        {selectedShifts.length !== 0
          ? blockDislayValue(
              selectedShifts
                .map((item) =>
                  typeof item === "object" && "name" in item ? item.name : ""
                )
                .join(", ")
            )
          : "Select shift options"}
      </div>
    );
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <PopoverBoxAnchorElOver
      buttonContent={blockDisplay()}
      content={
        <ShiftOptionsEdit
          selectedShifts={selectedShifts}
          statsShiftOptions={statsShiftOptions}
          handleEditSelectedShifts={handleEditSelectedShifts}
          handleClose={handleClose}
        />
      }
      open={open}
      setOpen={setOpen}
    />
  );
}

// {
//   "name": "shift",
//   "type": "dict",
//   "value": [
//       {
//           "name": "Garde chir",
//           "id": "660e64cd685891fc1057962b",
//           "idType": "shift"
//       },
//       {
//           "name": "Garde",
//           "id": "660d6c059120c7d1594a4f44",
//           "idType": "shift_dimension"
//       },
//       {
//           "name": "Plouharnel",
//           "id": "660e6af37562c0d0a1f7f0ec",
//           "idType": "shift_dimension"
//       },
//       {
//           "name": "Garde mat",
//           "id": "660e6a277562c0d0a1f7f0e2",
//           "idType": "shift"
//       },
//       {
//           "name": "Garde Plo",
//           "id": "660e6a287562c0d0a1f7f0e3",
//           "idType": "shift"
//       },
//       {
//           "name": "all shifts",
//           "id": "",
//           "idType": ""
//       }
//   ]
// }
