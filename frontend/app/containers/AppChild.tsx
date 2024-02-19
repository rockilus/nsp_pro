import React from "react";

import SuperTokens, { SuperTokensWrapper } from "supertokens-auth-react";
import { canHandleRoute, getRoutingComponent } from "supertokens-auth-react/ui";
import { SessionAuth } from "supertokens-auth-react/recipe/session";

import Home from "./Home";
import { PreBuiltUIList, SuperTokensConfig } from "../config/configToDelete";

SuperTokens.init(SuperTokensConfig);

export default function AppChild() {
  return canHandleRoute(PreBuiltUIList) ? (
    getRoutingComponent(PreBuiltUIList)
  ) : (
    <SuperTokensWrapper>
      {/* This protects the "/" route so that it shows
            <Home /> only if the user is logged in.
            Else it redirects the user to "/auth" */}
      <SessionAuth>
        <Home />
      </SessionAuth>
    </SuperTokensWrapper>
  );
}
