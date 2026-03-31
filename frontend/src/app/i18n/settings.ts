export const fallbackLng = "en";
export const languages = [fallbackLng, "es", "fr"];
export const defaultNS = "translation";
export const cookieName = "i18next";

export function getOptions(
  lng = fallbackLng,
  ns: string | string[] = defaultNS,
) {
  return {
    // debug: true,
    supportedLngs: languages,
    // preload: languages,
    fallbackLng,
    lng,
    fallbackNS: defaultNS,
    defaultNS,
    ns,
    interpolation: {
      // React already escapes values; disabling here prevents double-encoding
      // special characters (e.g. "/" rendered as "&#x2F;").
      escapeValue: false,
    },
    // backend: {
    //   projectId: '01b2e5e8-6243-47d1-b36f-963dbb8bcae3'
    // }
  };
}
