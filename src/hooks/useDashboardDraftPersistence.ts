import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

type PersistableField = HTMLInputElement | HTMLTextAreaElement;
type DraftMap = Record<string, { value: string; updatedAt: number }>;

const STORAGE_PREFIX = "chora:dashboard-draft";
const RESTORE_DELAYS = [0, 120, 420, 900];
const IGNORED_INPUT_TYPES = new Set([
  "button",
  "checkbox",
  "color",
  "date",
  "datetime-local",
  "file",
  "hidden",
  "image",
  "month",
  "password",
  "radio",
  "range",
  "reset",
  "search",
  "submit",
  "time",
  "week",
]);

const shouldIgnoreByText = (value: string | null) => /buscar|pesquisar|filtrar/i.test(value ?? "");

const isPersistableField = (node: EventTarget | Element | null): node is PersistableField => {
  if (!(node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement)) return false;
  if (node.disabled || node.readOnly) return false;
  if (node.closest('[data-draft-persist="off"]')) return false;
  if (node instanceof HTMLInputElement && IGNORED_INPUT_TYPES.has(node.type)) return false;
  if (shouldIgnoreByText(node.placeholder) || shouldIgnoreByText(node.getAttribute("aria-label"))) return false;
  const autocomplete = node.getAttribute("autocomplete") ?? "";
  if (/password|one-time-code|cc-|card/i.test(autocomplete)) return false;
  return true;
};

const fieldKey = (field: PersistableField) => {
  const fields = Array.from(document.querySelectorAll("input, textarea")).filter(isPersistableField);
  const index = Math.max(0, fields.indexOf(field));
  const type = field instanceof HTMLInputElement ? field.type || "text" : "textarea";
  const stableId = field.name || field.id || field.getAttribute("aria-label") || field.placeholder || "field";
  return `${field.tagName.toLowerCase()}:${type}:${stableId}:${index}`;
};

const readDraft = (key: string): DraftMap => {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "{}") as DraftMap;
  } catch {
    return {};
  }
};

const writeDraft = (key: string, draft: DraftMap) => {
  try {
    if (Object.keys(draft).length === 0) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(draft));
  } catch {
    // localStorage pode falhar em modo privado, não bloqueia a UI
  }
};

const setNativeValue = (field: PersistableField, value: string) => {
  const prototype = field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
  setter?.call(field, value);
  field.dispatchEvent(new Event("input", { bubbles: true }));
  field.dispatchEvent(new Event("change", { bubbles: true }));
};

export const useDashboardDraftPersistence = () => {
  const { pathname } = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    if (!pathname.startsWith("/app")) return;

    const storageKey = `${STORAGE_PREFIX}:${user?.id ?? "anon"}:${pathname}`;

    const saveField = (field: PersistableField) => {
      const draft = readDraft(storageKey);
      const key = fieldKey(field);
      if (field.value.trim()) draft[key] = { value: field.value, updatedAt: Date.now() };
      else delete draft[key];
      writeDraft(storageKey, draft);
    };

    const persistAll = () => {
      const draft = readDraft(storageKey);
      document.querySelectorAll("input, textarea").forEach((node) => {
        if (!isPersistableField(node)) return;
        const key = fieldKey(node);
        if (node.value.trim()) draft[key] = { value: node.value, updatedAt: Date.now() };
        else delete draft[key];
      });
      writeDraft(storageKey, draft);
    };

    const restoreField = (field: PersistableField) => {
      if (field.value) return;
      const saved = readDraft(storageKey)[fieldKey(field)]?.value;
      if (saved) setNativeValue(field, saved);
    };

    const restoreAll = () => {
      document.querySelectorAll("input, textarea").forEach((node) => {
        if (isPersistableField(node)) restoreField(node);
      });
    };

    const scheduleRestore = () => {
      RESTORE_DELAYS.forEach((delay) => window.setTimeout(restoreAll, delay));
    };

    const onInput = (event: Event) => {
      if (isPersistableField(event.target)) saveField(event.target);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") persistAll();
      else scheduleRestore();
    };

    const observer = new MutationObserver(scheduleRestore);

    scheduleRestore();
    document.addEventListener("input", onInput, true);
    document.addEventListener("change", onInput, true);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", scheduleRestore);
    window.addEventListener("pagehide", persistAll);
    window.addEventListener("beforeunload", persistAll);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      persistAll();
      document.removeEventListener("input", onInput, true);
      document.removeEventListener("change", onInput, true);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", scheduleRestore);
      window.removeEventListener("pagehide", persistAll);
      window.removeEventListener("beforeunload", persistAll);
      observer.disconnect();
    };
  }, [pathname, user?.id]);
};