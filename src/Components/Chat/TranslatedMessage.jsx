import React, { useState, useEffect } from "react";
import { useUserStore } from "../lib/userStore";

const translationCache = Object.create(null);

function guessLang(str, fallback = "en") {
  if (!str) return fallback;

  // Script-based
  if (/[\u0400-\u04FF]/.test(str)) return "ru";       // Cyrillic
  if (/[\u3040-\u30FF]/.test(str)) return "ja";       // Japanese
  if (/[\u4E00-\u9FFF]/.test(str)) return "zh";       // Chinese
  if (/[\u0600-\u06FF]/.test(str)) return "ar";       // Arabic
  if (/[\u0900-\u097F]/.test(str)) return "hi";       // Hindi

  // Accents
  if (/[áéíóúñ¿¡]/i.test(str)) return "es";           // Spanish
  if (/[çâêîôûéèàù]/i.test(str)) return "fr";         // French
  if (/[äöüß]/i.test(str)) return "de";               // German

  // Word heuristics
  const tokens = str.toLowerCase().split(/[^a-záéíóúñü]+/).filter(Boolean);
  const esWords = new Set(["hola","gracias","por","para","que","como","donde","buenos","dias","amigo","adios","sí"]);
  const enWords = new Set(["the","and","is","are","you","hello","hi","thanks","please","good","morning","friend"]);

  let esHits = 0, enHits = 0;
  for (const t of tokens) {
    if (esWords.has(t)) esHits++;
    if (enWords.has(t)) enHits++;
  }
  if (esHits > enHits) return "es";
  if (enHits > esHits) return "en";

  return fallback;
}

const TranslatedMessage = ({ text }) => {
  const { currentUser } = useUserStore();
  const targetLang = currentUser?.language || "en";

  const [translatedText, setTranslatedText] = useState(text);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const translate = async () => {
      if (!text || !targetLang) {
        setTranslatedText(text);
        return;
      }

      const detectedLang = guessLang(text, "en");

      // Skip translation if detected == target
      if (detectedLang === targetLang) {
        setTranslatedText(text);
        return;
      }

      const cacheKey = `${text}::${detectedLang}->${targetLang}`;
      if (translationCache[cacheKey]) {
        setTranslatedText(translationCache[cacheKey]);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(
          `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
            text
          )}&langpair=${detectedLang}|${targetLang}`
        );

        const data = await res.json();
        let out = data?.responseData?.translatedText || text;

        if (!cancelled) {
          translationCache[cacheKey] = out;
          setTranslatedText(out);
        }
      } catch (err) {
        console.error("Translation error:", err);
        if (!cancelled) setTranslatedText(text);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    translate();
    return () => { cancelled = true; };
  }, [text, targetLang]);

  return (
    <span>{loading ? <em className="text-gray-400">Translating...</em> : translatedText}</span>
  );
};

export default TranslatedMessage;
