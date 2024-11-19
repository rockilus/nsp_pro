"use client";

import React from "react";
// Hooks
import useAccessTokenPayload from "../../hooks/useAccessTokenPayload";
// Actions
import { stopImpersonation } from "../../app/lib/dashboard";
// Styles
import "./impersonation-banner.css";

const ImpersonationBanner = () => {
  const accessTokenPayload = useAccessTokenPayload();

  if (!accessTokenPayload?.isImpersonation) {
    return null;
  }

  const handleStopImpersonation = async () => {
    if (
      accessTokenPayload?.isImpersonation &&
      accessTokenPayload?.adminUserId
    ) {
      const impersonationStopped = await stopImpersonation();
      if (impersonationStopped) {
        window.location.href = `/en/plan/dashboard`;
      }
    }
  };

  return (
    <div className="impersonation-banner">
      <span className="impersonation-banner-text">
        Impersonating{" "}
        <strong>{accessTokenPayload?.impersonatedUserEmail}</strong>
      </span>
      <button
        className="stop-impersonation-button"
        onClick={handleStopImpersonation}
        disabled={
          !accessTokenPayload?.isImpersonation ||
          !accessTokenPayload?.adminUserId
        }
      >
        Stop Impersonation
      </button>
    </div>
  );
};

export default ImpersonationBanner;
