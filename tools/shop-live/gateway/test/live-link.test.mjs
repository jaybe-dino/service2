// 기존 정적 갤러리(tools/shop-viewer)의 실시간 링크 노출 조건
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const require = createRequire(import.meta.url);
const { liveViewerOrigin } = require("../../../shop-viewer/live-link.js");
const data = JSON.parse(readFileSync(new URL("../../../shop-viewer/data.json", import.meta.url), "utf8"));

test("현재 data.json 기본값: 비활성 → 링크 없음, 원래 9개 항목 보존", () => {
  assert.equal(data.meta.liveViewer.enabled, false);
  assert.equal(liveViewerOrigin(data.meta), null);
  assert.equal(data.items.length, 9);
});

test("검증된 https origin + verifiedAt 일 때만 링크", () => {
  const ok = { enabled: true, origin: "https://live.example.com", verifiedAt: "2026-10-20T00:00:00Z" };
  assert.equal(liveViewerOrigin({ liveViewer: ok }), "https://live.example.com");
  for (const bad of [
    { ...ok, enabled: "true" },
    { ...ok, verifiedAt: null },
    { ...ok, verifiedAt: "not a date" },
    { ...ok, origin: "http://live.example.com" },
    { ...ok, origin: "https://live.example.com/path" },
    { ...ok, origin: "https://live.example.com/?t=secret" },
    { ...ok, origin: "https://user:pw@live.example.com" },
    { ...ok, origin: "javascript:alert(1)" },
    { ...ok, origin: null },
  ]) assert.equal(liveViewerOrigin({ liveViewer: bad }), null, JSON.stringify(bad));
  assert.equal(liveViewerOrigin(null), null);
});
