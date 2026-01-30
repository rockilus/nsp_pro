import React from "react";
// MUI
import TableCell from "@mui/material/TableCell";
// Styles
import "./saved-cell.css";

export default function SavedCell({
  database,
  authn,
  authz,
}: {
  database: boolean;
  authn: boolean;
  authz: boolean;
}) {
  const logoWidthOriginal = 512;
  const logoHeightOriginal = 512;
  const logoAdjustFactor = 0.05;
  const logoWidth = logoWidthOriginal * logoAdjustFactor;
  const logoHeight = logoHeightOriginal * logoAdjustFactor;

  return (
    <TableCell>
      <div className="saved-cell-container">
        {database && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/mongodb_logo.png"
            alt="MongoDB logo"
            width={logoWidth}
            height={logoHeight}
          />
        )}
        {authn && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/supertokens_logo.png"
            alt="SuperTokens logo"
            width={logoWidth}
            height={logoHeight}
          />
        )}
        {authz && (
          // eslint-disable-next-line @next/next/no-img-element
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
