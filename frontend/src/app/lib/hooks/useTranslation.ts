import React from "react";
import { useTranslation as useI18nTranslation } from "react-i18next";
import { useParams } from "next/navigation";
import { FlatNamespace, KeyPrefix } from "i18next";
import { UseTranslationOptions, FallbackNs } from "react-i18next";

export function useTranslation<
  Ns extends FlatNamespace,
  KPrefix extends KeyPrefix<FallbackNs<Ns>> = undefined
>(ns?: Ns, options?: UseTranslationOptions<KPrefix>) {
  const params = useParams();
  const lng = params.lng as string;
  const translationResult = useI18nTranslation(ns, options);

  // Ensure language is synced with URL
  React.useEffect(() => {
    if (translationResult.i18n.language !== lng) {
      translationResult.i18n.changeLanguage(lng);
    }
  }, [lng, translationResult.i18n]);

  return { ...translationResult, lng };
}

// Backward compatibility version that accepts lng parameter
export function useTranslationCompat<
  Ns extends FlatNamespace,
  KPrefix extends KeyPrefix<FallbackNs<Ns>> = undefined
>(lng: string, ns?: Ns, options?: UseTranslationOptions<KPrefix>) {
  const translationResult = useI18nTranslation(ns, options);

  // Ensure language is synced
  React.useEffect(() => {
    if (translationResult.i18n.language !== lng) {
      translationResult.i18n.changeLanguage(lng);
    }
  }, [lng, translationResult.i18n]);

  return translationResult;
}
