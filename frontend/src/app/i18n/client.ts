"use client";

import { useEffect, useState } from "react";
import i18next, { FlatNamespace, KeyPrefix } from "i18next";
import {
  initReactI18next,
  useTranslation as useTranslationOrg,
  UseTranslationOptions,
  UseTranslationResponse,
  FallbackNs,
} from "react-i18next";
import { useCookies } from "react-cookie";
import resourcesToBackend from "i18next-resources-to-backend";
// import LocizeBackend from 'i18next-locize-backend'
import LanguageDetector from "i18next-browser-languagedetector";
import { getOptions, languages, cookieName } from "./settings";

const runsOnServerSide = typeof window === "undefined";

// on client side the normal singleton is ok
i18next
  .use(initReactI18next)
  .use(LanguageDetector)
  .use(
    resourcesToBackend(
      (language: string, namespace: string) =>
        import(`./locales/${language}/${namespace}.json`)
    )
  )
  // .use(LocizeBackend) // locize backend could be used on client side, but prefer to keep it in sync with server side
  .init({
    ...getOptions(),
    lng: undefined, // let detect the language on client side
    detection: {
      order: ["path", "htmlTag", "cookie", "navigator"],
    },
    preload: runsOnServerSide ? languages : [],
  });

export function useTranslation<
  Ns extends FlatNamespace,
  KPrefix extends KeyPrefix<FallbackNs<Ns>> = undefined
>(
  lng: string,
  ns?: Ns,
  options?: UseTranslationOptions<KPrefix>
): UseTranslationResponse<FallbackNs<Ns>, KPrefix> {
  const [cookies, setCookie] = useCookies([cookieName]);
  const ret = useTranslationOrg(ns, options);
  const { i18n } = ret;
  // No local `activeLng` state here — `react-i18next`'s internal state
  // (`i18n.resolvedLanguage`) will trigger re-renders via the hook return
  // value. Previously we kept a separate `activeLng` state and updated it
  // inside an effect which caused the `react-hooks/set-state-in-effect`
  // ESLint error; that state was unused elsewhere so it was removed.

  useEffect(() => {
    if (!runsOnServerSide && lng && i18n.resolvedLanguage !== lng) {
      i18n.changeLanguage(lng);
    }
  }, [lng, i18n]);

  // No state sync effect required — let `react-i18next` handle updates.

  useEffect(() => {
    if (!lng || i18n.resolvedLanguage === lng) return;
    i18n.changeLanguage(lng);
  }, [lng, i18n]);

  useEffect(() => {
    if (cookies.i18next === lng) return;
    setCookie(cookieName, lng, { path: "/" });
  }, [lng, cookies.i18next, setCookie]);

  return ret;
}

// export function useTranslation<
//   Ns extends FlatNamespace,
//   KPrefix extends KeyPrefix<FallbackNs<Ns>> = undefined
// >(
//   lng: string,
//   ns?: Ns,
//   options?: UseTranslationOptions<KPrefix>
// ): UseTranslationResponse<FallbackNs<Ns>, KPrefix> {
//   const [cookies, setCookie] = useCookies([cookieName]);
//   const ret = useTranslationOrg(ns, options);
//   const { i18n } = ret;
//   // console.log("lng", lng);
//   // console.log("runsOnServerSide", runsOnServerSide);
//   // console.log("i18n.resolvedLanguage", i18n.resolvedLanguage);

//   if (runsOnServerSide && lng && i18n.resolvedLanguage !== lng) {
//     i18n.changeLanguage(lng);
//   } else {

//     // eslint-disable-next-line react-hooks/rules-of-hooks
//     useEffect(() => {
//       if (activeLng === i18n.resolvedLanguage) return;
//       console.log("setActiveLng");
//       setActiveLng(i18n.resolvedLanguage);
//     }, [activeLng, i18n.resolvedLanguage]);
//     // eslint-disable-next-line react-hooks/rules-of-hooks
//     useEffect(() => {
//       if (!lng || i18n.resolvedLanguage === lng) return;
//       console.log("changeLanguage");
//       i18n.changeLanguage(lng);
//     }, [lng, i18n]);
//     // eslint-disable-next-line react-hooks/rules-of-hooks
//     useEffect(() => {
//       if (cookies.i18next === lng) return;
//       console.log("setCookie");
//       setCookie(cookieName, lng, { path: "/" });
//       // eslint-disable-next-line react-hooks/exhaustive-deps
//     }, [lng, cookies.i18next]);

//   }
//   return ret;
// }
