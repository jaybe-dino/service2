"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePlan } from "./PlanContext";
import { apiBookmarks, apiToggleBookmark } from "@/lib/client-api";

export type BookmarkType = "brand" | "influencer";

interface BookmarkState {
  brands: string[];
  influencers: string[];
  has: (type: BookmarkType, id: string) => boolean;
  toggle: (type: BookmarkType, id: string) => void;
  ready: boolean;
}

const Ctx = createContext<BookmarkState | null>(null);
const KEY = "ktrend.bookmarks";

export function BookmarkProvider({ children }: { children: ReactNode }) {
  const { user, serverMode } = usePlan();
  const [brands, setBrands] = useState<string[]>([]);
  const [influencers, setInfluencers] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  const useServer = serverMode && !!user;

  const persistLocal = (b: string[], i: string[]) => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ brands: b, influencers: i }));
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    let cancelled = false;
    if (useServer) {
      apiBookmarks().then((d) => {
        if (cancelled) return;
        setBrands(d.brands);
        setInfluencers(d.influencers);
        setReady(true);
      });
    } else {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) {
          const d = JSON.parse(raw) as { brands?: string[]; influencers?: string[] };
          setBrands(d.brands ?? []);
          setInfluencers(d.influencers ?? []);
        } else {
          setBrands([]);
          setInfluencers([]);
        }
      } catch {
        setBrands([]);
        setInfluencers([]);
      }
      setReady(true);
    }
    return () => {
      cancelled = true;
    };
  }, [useServer]);

  const has = (type: BookmarkType, id: string) =>
    type === "brand" ? brands.includes(id) : influencers.includes(id);

  const toggle = (type: BookmarkType, id: string) => {
    const cur = type === "brand" ? brands : influencers;
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    const nb = type === "brand" ? next : brands;
    const ni = type === "influencer" ? next : influencers;
    setBrands(nb);
    setInfluencers(ni);
    if (useServer) {
      apiToggleBookmark(type, id); // 서버 저장(낙관적)
    } else {
      persistLocal(nb, ni);
    }
  };

  return <Ctx.Provider value={{ brands, influencers, has, toggle, ready }}>{children}</Ctx.Provider>;
}

export function useBookmarks(): BookmarkState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useBookmarks must be used within BookmarkProvider");
  return ctx;
}
