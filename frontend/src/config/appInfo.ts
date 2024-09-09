import { API_URL, CLIENT_URL } from "../app/lib/env";

const apiBasePath = "/auth/";

export const appInfo = {
  appName: "nsp_pro",
  // websiteDomain: CLIENT_URL as string,
  websiteDomain: process.env.NEXT_PUBLIC_CLIENT_URL as string,
  apiDomain: API_URL as string,
  apiBasePath,
};
