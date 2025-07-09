import React from "react";
// MUI
import TableCell from "@mui/material/TableCell";
// Styles
import "./saved-cell.css";

export default function SavedCell({
  mongo,
  supertokens,
  permit,
}: {
  mongo: boolean;
  supertokens: boolean;
  permit: boolean;
}) {
  const logoWidthOriginal = 512;
  const logoHeightOriginal = 512;
  const logoAdjustFactor = 0.05;
  const logoWidth = logoWidthOriginal * logoAdjustFactor;
  const logoHeight = logoHeightOriginal * logoAdjustFactor;

  return (
    <TableCell>
      <div className="saved-cell-container">
        {mongo && (
          <img
            src="/mongodb_logo.png"
            alt="MongoDB logo"
            width={logoWidth}
            height={logoHeight}
          />
        )}
        {supertokens && (
          <img
            src="/supertokens_logo.png"
            alt="SuperTokens logo"
            width={logoWidth}
            height={logoHeight}
          />
        )}
        {permit && (
          <img
            src="/permit_logo.jpeg"
            alt="Permit.io logo"
            width={logoWidth}
            height={logoHeight}
          />
        )}
      </div>
    </TableCell>
  );
}
