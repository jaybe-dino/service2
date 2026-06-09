"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

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
  const [brands, setBrands] = useState<string[]>([]);
  const [influencers, setInfluencers] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw) as { brands?: string[]; influencers?: string[] };
        setBrands(d.brands ?? []);
        setInfluencers(d.influencers ?? []);
      }
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const persist = (b: string[], i: string[]) => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ brands: b, influencers: i }));
    } catch {
      /* ignore */
    }
  };

  const has = (type: BookmarkType, id: string) =>
    type === "brand" ? brands.includes(id) : influencers.includes(id);

  const toggle = (type: BookmarkType, id: string) => {
    if (type === "brand") {
      const next = brands.includes(id) ? brands.filter((x) => x !== id) : [...brands, id];
      setBrands(next);
      persist(next, influencers);
    } else {
      const next = influencers.includes(id) ? influencers.filter((x) => x !== id) : [...influencers, id];
      setInfluencers(next);
      persist(brands, next);
    }
  };

  return (
    <Ctx.Provider value={{ brands, influencers, has, toggle, ready }}>{children}</Ctx.Provider>
  );
}

export function useBookmarks(): BookmarkState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useBookmarks must be used within BookmarkProvider");
  return ctx;
}
