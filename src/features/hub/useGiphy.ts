import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface GiphyItem {
  id: string;
  title: string;
  url: string;
  preview_url: string;
  original_url: string;
  width: number;
  height: number;
}

export const useGiphy = () => {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<GiphyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);

  const search = useCallback(async (q: string) => {
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ q, limit: "24" });
      const { data, error } = await supabase.functions.invoke(`giphy-search?${params}`, {
        method: "GET",
      });
      if (id !== reqId.current) return;
      if (error) {
        setError(error.message);
        setItems([]);
      } else {
        setItems((data?.items ?? []) as GiphyItem[]);
      }
    } catch (e) {
      if (id !== reqId.current) return;
      setError((e as Error).message);
      setItems([]);
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, []);

  // debounce de busca
  useEffect(() => {
    const t = setTimeout(() => search(query.trim()), 280);
    return () => clearTimeout(t);
  }, [query, search]);

  return { query, setQuery, items, loading, error };
};
