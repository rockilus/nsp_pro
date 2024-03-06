const apiBasePath = "/auth/";

export const websiteDomain = `${process.env.NEXT_PUBLIC_CLIENT_URL}:${process.env.NEXT_PUBLIC_CLIENT_PORT}`;

export const appInfo = {
  appName: "nsp_pro",
  websiteDomain,
  apiDomain: process.env.NEXT_PUBLIC_API_URL as string,
  apiBasePath,
};
