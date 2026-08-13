"use client";
import { useEffect } from "react";

// 사이드바 스크롤스파이 — 보이는 섹션의 nav 링크를 활성화.
export default function ScrollSpy() {
  useEffect(() => {
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("nav[data-spy] a"));
    const secs = links.map((a) => document.querySelector(a.getAttribute("href") || "")).filter(Boolean) as Element[];
    if (!secs.length) return;
    const obs = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (e.isIntersecting) {
          const id = "#" + e.target.id;
          links.forEach((l) => l.classList.toggle("spy-active", l.getAttribute("href") === id));
        }
      });
    }, { rootMargin: "-35% 0px -55% 0px" });
    secs.forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, []);
  return null;
}
