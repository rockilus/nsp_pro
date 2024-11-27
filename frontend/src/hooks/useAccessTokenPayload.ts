"use client";

import { useEffect, useState } from "react";
import Session from "supertokens-auth-react/recipe/session";

const useAccessTokenPayload = () => {
  const [accessTokenPayload, setAccessTokenPayload] = useState<Record<
    string,
    any
  > | null>(null);

  useEffect(() => {
    const getAccessTokenPayload = async () => {
      const payload = await Session.getAccessTokenPayloadSecurely();
      setAccessTokenPayload(payload);
    };
    getAccessTokenPayload();
  }, []);

  return accessTokenPayload;
};

export default useAccessTokenPayload;
