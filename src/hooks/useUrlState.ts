import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Persistent string state synced to a single URL query param.
 * Empty value (or === defaultValue) removes the param to keep URLs clean.
 *
 * Use for filters/search inputs that should survive reload + back/forward.
 */
export function useUrlState(
  key: string,
  defaultValue = "",
): [string, (next: string) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const value = searchParams.get(key) ?? defaultValue;

  const setValue = useCallback(
    (next: string) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          if (!next || next === defaultValue) {
            params.delete(key);
          } else {
            params.set(key, next);
          }
          return params;
        },
        { replace: true },
      );
    },
    [key, defaultValue, setSearchParams],
  );

  return [value, setValue];
}
