"use strict";

// 뷰어: 상태 폴링 + 허용 브랜드 이동 + noVNC iframe(same-origin, 쿠키 인증).
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var brandSel = $("brand");
  var goBtn = $("go");
  var msg = $("msg");
  var screen = $("screen");
  var last = null;
  var navigating = false;

  // ?brand=<id> 는 선택만 미리 해 둔다(자동 이동 없음).
  var wanted = new URLSearchParams(location.search).get("brand");

  function api(path, opts) {
    return fetch(path, Object.assign({ credentials: "same-origin", cache: "no-store" }, opts || {})).then(function (r) {
      if (r.status === 401) { location.href = "/login"; throw new Error("unauthorized"); }
      return r.json().then(function (j) { return { status: r.status, body: j }; });
    });
  }

  function chip(id, ok, text) {
    var el = $(id);
    el.textContent = text;
    el.className = "chip " + (ok === true ? "ok" : ok === false ? "bad" : "");
  }

  function renderStatus(s) {
    last = s;
    chip("st-vpn", s.vpn.running, "VPN: " + (s.vpn.running ? "연결됨" : "미연결 (" + s.vpn.state + ")"));
    if (s.egress.verified) chip("st-egress", true, "미국 egress: 확인됨 (" + s.egress.ip + ")");
    else chip("st-egress", false, "미국 egress: 미검증" + (s.egress.country ? " (현재 " + s.egress.country + ")" : ""));
    chip("st-browser", s.browser.seleniumReachable, "브라우저: " + (s.browser.seleniumReachable ? (s.browser.sessionActive ? "세션 사용 중" : "대기") : "응답 없음"));
    chip("st-stream", s.stream.activeConnections > 0, "화면 스트림: " + (s.stream.activeConnections > 0 ? "연결됨" : "미연결"));
    goBtn.disabled = !s.ready || navigating || !brandSel.value;
    goBtn.title = s.ready ? "" : "VPN·미국 egress·브라우저가 모두 확인돼야 이동할 수 있습니다.";
    // 브라우저 backend 가 응답할 때만 화면 iframe 연결
    if (s.browser.seleniumReachable && screen.getAttribute("src") === "about:blank") {
      screen.src = "/novnc/vnc.html?autoconnect=1&resize=scale&reconnect=1&reconnect_delay=3000&path=websockify";
    }
  }

  function refresh(recheck) {
    return api("/api/status" + (recheck ? "?recheck=1" : "")).then(function (r) { renderStatus(r.body); })
      .catch(function () { chip("st-vpn", false, "VPN: 상태 조회 실패"); goBtn.disabled = true; });
  }

  function loadBrands() {
    return api("/api/brands").then(function (r) {
      brandSel.innerHTML = "";
      var ph = document.createElement("option");
      ph.value = ""; ph.textContent = "브랜드 선택 (미국)";
      brandSel.appendChild(ph);
      r.body.brands.forEach(function (b) {
        var o = document.createElement("option");
        o.value = b.id;
        o.textContent = b.name + (b.company ? " · " + b.company : "");
        brandSel.appendChild(o);
      });
      if (wanted && r.body.brands.some(function (b) { return b.id === wanted; })) brandSel.value = wanted;
      brandSel.disabled = false;
    });
  }

  brandSel.addEventListener("change", function () { if (last) renderStatus(last); });
  $("recheck").addEventListener("click", function () { msg.textContent = "재확인 중…"; refresh(true).then(function () { msg.textContent = ""; }); });

  goBtn.addEventListener("click", function () {
    if (!brandSel.value) return;
    navigating = true; goBtn.disabled = true;
    msg.textContent = "이동 중… (화면에서 로딩/보안 퍼즐을 확인하세요)";
    api("/api/navigate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ brandId: brandSel.value }) })
      .then(function (r) {
        if (r.status === 200) msg.textContent = "이동 요청 완료 — 실제 로드 여부는 화면에서 확인하세요.";
        else if (r.status === 409) msg.textContent = "다른 이동이 진행 중입니다.";
        else if (r.status === 503) msg.textContent = "준비되지 않음: VPN/미국 egress/브라우저 확인 필요.";
        else msg.textContent = "이동 실패: " + ((r.body.navigation && r.body.navigation.error) || r.body.error || r.status);
      })
      .catch(function () { msg.textContent = "이동 요청 실패"; })
      .then(function () { navigating = false; return refresh(false); });
  });

  loadBrands().then(function () { return refresh(false); });
  setInterval(function () { refresh(false); }, 5000);
})();
