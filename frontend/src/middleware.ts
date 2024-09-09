import { NextResponse, NextRequest } from "next/server";
import acceptLanguage from "accept-language";
import { fallbackLng, languages, cookieName } from "./app/i18n/settings";
import { redirectAuth } from "./middleware/redirect-auth";
import { handleLanguage } from "./middleware/handle-language";

acceptLanguage.languages(languages);

export const config = {
  // matcher: '/:lng*'
  matcher: [
    "/((?!api|_next/static|_next/image|assets|favicon.ico|sw.js|site.webmanifest).*)",
  ],
};

export function middleware(req: NextRequest) {
  const imageExtensions = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"];
  const isImageRequest = imageExtensions.some((ext) =>
    req.nextUrl.pathname.endsWith(ext)
  );

  if (
    req.nextUrl.pathname.indexOf("icon") > -1 ||
    req.nextUrl.pathname.indexOf("chrome") > -1 ||
    isImageRequest
  ) {
    return NextResponse.next();
  }

  const response = redirectAuth(req);
  if (response) return response;

  return handleLanguage(req);
}
