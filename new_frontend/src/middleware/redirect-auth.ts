import { NextResponse, NextRequest } from "next/server";

export function redirectAuth(req: NextRequest) {
  const url = req.nextUrl.clone();

  if (url.pathname.startsWith("/auth")) {
    const urlPathnameOriginal = url.pathname;
    const i18nextCookie = req.cookies.get("i18next");
    const acceptLanguage = req.headers.get("accept-language");

    if (i18nextCookie) {
      if (i18nextCookie.value === "fr") {
        url.pathname = `/fr${urlPathnameOriginal}`;
      } else if (i18nextCookie.value === "en") {
        url.pathname = `/en${urlPathnameOriginal}`;
      } else if (i18nextCookie.value === "es") {
        url.pathname = `/es${urlPathnameOriginal}`;
      }
    } else if (acceptLanguage) {
      if (acceptLanguage.startsWith("fr")) {
        url.pathname = `/fr${urlPathnameOriginal}`;
      } else if (acceptLanguage.startsWith("en")) {
        url.pathname = `/en${urlPathnameOriginal}`;
      } else if (acceptLanguage.startsWith("es")) {
        url.pathname = `/es${urlPathnameOriginal}`;
      }
    } else {
      url.pathname = `/en${urlPathnameOriginal}`;
    }

    return NextResponse.redirect(url);
  }
}

//   if (url.pathname === "/auth") {
//     if (i18nextCookie) {
//       if (i18nextCookie.value === "fr") {
//         url.pathname = "/fr/auth";
//       } else if (i18nextCookie.value === "en") {
//         url.pathname = "/en/auth";
//       } else if (i18nextCookie.value === "es") {
//         url.pathname = "/es/auth";
//       }
//     } else if (acceptLanguage) {
//       if (acceptLanguage.startsWith("fr")) {
//         url.pathname = "/fr/auth";
//       } else if (acceptLanguage.startsWith("en")) {
//         url.pathname = "/en/auth";
//       } else if (acceptLanguage.startsWith("es")) {
//         url.pathname = "/es/auth";
//       }
//     } else {
//       url.pathname = "/en/auth";
//     }

//     return NextResponse.redirect(url);
//   }
// }
