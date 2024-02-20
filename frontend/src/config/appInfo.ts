const port = process.env.APP_PORT || 3000;

// const apiBasePath = "/api/auth/";
const apiBasePath = "/auth/";

export const websiteDomain =
  process.env.APP_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  `http://127.0.0.1:${port}`;

export const appInfo = {
  appName: "nsp_pro",
  websiteDomain,
  apiDomain: "http://127.0.0.1:5000",
  apiBasePath,
};
