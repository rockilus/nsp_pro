import { ApiUrl } from "../utils/env_config";

const port = process.env.APP_PORT || 3000;

const apiBasePath = "/auth/";

export const websiteDomain =
  process.env.APP_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  `http://127.0.0.1:${port}`;

export const appInfo = {
  appName: "nsp_pro",
  websiteDomain,
  apiDomain: ApiUrl,
  apiBasePath,
};
