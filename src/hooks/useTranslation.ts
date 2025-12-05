import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

// Simple in-memory cache for translations
const translationCache = new Map<string, string>();

export function useTranslatedText(originalText: string | undefined | null) {
  const { language } = useLanguage();
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    // If no text or language is English, return original
    if (!originalText || language === "en") {
      setTranslatedText(null);
      return;
    }

    // Check cache first
    const cacheKey = `${language}:${originalText}`;
    if (translationCache.has(cacheKey)) {
      setTranslatedText(translationCache.get(cacheKey)!);
      return;
    }

    // Translate
    const translate = async () => {
      setIsTranslating(true);
      try {
        const { data, error } = await supabase.functions.invoke("translate-text", {
          body: { text: originalText, targetLanguage: language },
        });

        if (error) {
          console.error("Translation error:", error);
          setTranslatedText(null);
        } else if (data?.translatedText) {
          translationCache.set(cacheKey, data.translatedText);
          setTranslatedText(data.translatedText);
        }
      } catch (err) {
        console.error("Translation failed:", err);
        setTranslatedText(null);
      } finally {
        setIsTranslating(false);
      }
    };

    translate();
  }, [originalText, language]);

  return {
    text: translatedText || originalText || "",
    isTranslating,
    isTranslated: !!translatedText,
  };
}