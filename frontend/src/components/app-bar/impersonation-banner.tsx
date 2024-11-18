"use client";

import React from "react";
// Hooks
import useAccessTokenPayload from "../../hooks/useAccessTokenPayload";
// Styles
import "./impersonation-banner.css";

const ImpersonationBanner = () => {
  const accessTokenPayload = useAccessTokenPayload();

  if (!accessTokenPayload?.isImpersonation) {
    return null;
  }

  return (
    <div className="impersonation-banner">
      <span className="impersonation-banner-text">
        You are currently impersonating a user.
      </span>
    </div>
  );
};

export default ImpersonationBanner;
