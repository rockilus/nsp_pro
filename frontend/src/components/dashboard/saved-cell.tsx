import React from "react";
import Image from "next/image";
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
          <Image
            src="/mongodb_logo.png"
            alt="MongoDB logo"
            width={logoWidth}
            height={logoHeight}
            priority
          />
        )}
        {supertokens && (
          <Image
            src="/supertokens_logo.png"
            alt="SuperTokens logo"
            width={logoWidth}
            height={logoHeight}
            priority
          />
        )}
        {permit && (
          <Image
            src="/permit_logo.jpeg"
            alt="Permit.io logo"
            width={logoWidth}
            height={logoHeight}
            priority
          />
        )}
      </div>
    </TableCell>
  );
}
