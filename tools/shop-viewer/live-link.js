"use strict";

// 실시간 미국 브라우저 뷰어(tools/shop-live) 진입 링크 판정.
// data.json meta.liveViewer 가 enabled=true + https origin + 검증 시각(verifiedAt)을 모두 갖춘 경우에만 origin 을 돌려준다.
// 실제 배포·검증 전에는 기본값(enabled=false, origin=null)이므로 링크가 나타나지 않는다.
(function (root) {
  function liveViewerOrigin(meta) {
    var lv = meta && meta.liveViewer;
    if (!lv || lv.enabled !== true) return null;
    if (typeof lv.origin !== "string" || typeof lv.verifiedAt !== "string") return null;
    if (isNaN(new Date(lv.verifiedAt).getTime())) return null;
    var u;
    try { u = new URL(lv.origin); } catch (e) { return null; }
    if (u.protocol !== "https:" || u.username || u.password) return null;
    if (u.href !== u.origin + "/" || (lv.origin !== u.origin && lv.origin !== u.href)) return null;
    return u.origin;
  }

  if (typeof module === "object" && module.exports) module.exports = { liveViewerOrigin: liveViewerOrigin };
  else root.ShopLiveLink = { liveViewerOrigin: liveViewerOrigin };
})(this);
