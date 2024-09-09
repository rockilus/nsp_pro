import { API_URL, CLIENT_URL } from "../../lib/env";
import { appInfo } from "../../../config/appInfo";

export async function GET(request: Request) {
  return new Response(
    JSON.stringify({
      status: "ok",
      test: "this is the test value",
      websiteDomain: CLIENT_URL,
      apiDomain: API_URL,
      envVars: process.env,
      appInfo: appInfo,
    }),
    {
      headers: { "Content-Type": "application/json" },
      status: 200,
    }
  );
}
