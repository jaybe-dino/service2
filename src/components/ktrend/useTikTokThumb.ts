"use client";

import { useEffect, useState } from "react";

// TikTok oEmbed 썸네일: 뷰포트 진입 시 지연 로드 + 캐시 (실패 시 폴백은 호출부에서 그라데이션).
// 콘텐츠 레퍼런스 카드(Explorer / Remake 공용).
const thumbCache = new Map<string, string | null>();
const thumbInflight = new Map<string, Promise<string | null>>();

export function fetchThumb(url: string): Promise<string | null> {
  if (thumbCache.has(url)) return Promise.resolve(thumbCache.get(url) ?? null);
  if (thumbInflight.has(url)) return thumbInflight.get(url)!;
  try {
    const cached = sessionStorage.getItem(`tt:${url}`);
    if (cached !== null) {
      const v = cached || null;
      thumbCache.set(url, v);
      return Promise.resolve(v);
    }
  } catch {
    /* 무시 */
  }
  const p = fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`)
    .then((r) => (r.ok ? r.json() : null))
    .then((j: { thumbnail_url?: string } | null) => {
      const t = j?.thumbnail_url ?? null;
      thumbCache.set(url, t);
      try {
        sessionStorage.setItem(`tt:${url}`, t ?? "");
      } catch {
        /* 무시 */
      }
      return t;
    })
    .catch(() => {
      thumbCache.set(url, null);
      return null;
    })
    .finally(() => thumbInflight.delete(url));
  thumbInflight.set(url, p);
  return p;
}

export function useTikTokThumb(url: string, ref: React.RefObject<HTMLElement | null>): string | null {
  const [thumb, setThumb] = useState<string | null>(() => thumbCache.get(url) ?? null);
  useEffect(() => {
    const cached = thumbCache.get(url);
    if (cached) {
      setThumb(cached);
      return;
    }
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      fetchThumb(url).then(setThumb);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          fetchThumb(url).then(setThumb);
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [url, ref]);
  return thumb;
}
