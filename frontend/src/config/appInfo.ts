const apiBasePath = "/auth/";

export const websiteDomain = process.env.NEXT_PUBLIC_CLIENT_URL;

export const appInfo = {
  appName: "nsp_pro",
  websiteDomain: websiteDomain as string,
  apiDomain: process.env.NEXT_PUBLIC_API_URL as string,
  apiBasePath,
};
