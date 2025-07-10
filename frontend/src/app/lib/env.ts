export const API_URL: string =
  process.env.NEXT_PUBLIC_API_URL ??
  (() => {
    throw new Error("NEXT_PUBLIC_API_URL is not set in environment variables");
  })();
export const CLIENT_URL = process.env.NEXT_PUBLIC_CLIENT_URL;
export const ST_FRONTEND_DOMAIN = process.env.NEXT_PUBLIC_ST_FRONTEND_DOMAIN;
export const USE_SQS_SOLVE = process.env.NEXT_PUBLIC_USE_SQS_SOLVE === "true";
