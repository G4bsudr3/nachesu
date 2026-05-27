import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "nachesu.readingEasy";
const CLASS_NAME = "reading-easy";

const readInitial = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "1";
};

const apply = (on: boolean) => {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle(CLASS_NAME, on);
};

/**
 * preferência de leitura acessível: aumenta entre-letras e altura da linha
 * pra ajudar estudantes com dislexia ou cansaço visual. persiste em
 * localStorage e aplica uma classe no <html>.
 */
export function useReadingPreferences() {
  const [easyRead, setEasyRead] = useState<boolean>(readInitial);

  useEffect(() => {
    apply(easyRead);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, easyRead ? "1" : "0");
    }
  }, [easyRead]);

  const toggle = useCallback(() => setEasyRead((v) => !v), []);

  return { easyRead, setEasyRead, toggle };
}

/** aplica preferência cedo no boot, antes do React montar a UI completa */
export function bootReadingPreferences() {
  apply(readInitial());
}
