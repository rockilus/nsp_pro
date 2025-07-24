export const API_URL: string =
  process.env.NEXT_PUBLIC_API_URL ??
  (() => {
    throw new Error("NEXT_PUBLIC_API_URL is not set in environment variables");
  })();

console.log(`API_URL is set to: ${API_URL}`);
