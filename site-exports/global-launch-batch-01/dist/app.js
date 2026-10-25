"use strict";
/* 글로벌 진출 배치 1기 — 정적(buildless) 사이트. 서버/DB 없음. */
(function () {
  // 협업 브랜드 데이터 — glovek.space/refer(src/data/refer.ts) 분류 기준.
  // tiktok: TikTok Shop 입점·운영을 함께한 브랜드(모든 협업 브랜드가 TikTok 고객은 아님).
  var LOGO = "assets/logos/";
  var BRANDS = [
    { n: "유한양행", f: "yuhan-official.png" },
    { n: "클리오", f: "clio-official.svg" },
    { n: "톤28", f: "toun28-official.svg", invert: true },
    { n: "블리블리", f: "velyvely-official.png" },
    { n: "코오롱스포츠", f: "kolon-sport.png" },
    { n: "LG생활건강", f: "lg-hnh.png" },
    { n: "CJ제일제당", f: "cj-cheiljedang.png" },
    { n: "애경", f: "aekyung.png" },
    { n: "농협", f: "nonghyup.png" },
    { n: "동화약품", f: "dongwha.png" },
    { n: "동아오츠카", f: "donga-otsuka.png" },
    { n: "신원", f: "shinwon.png" },
    { n: "동국", f: "dongkook.png" },
    { n: "모두투어", f: "modetour.png" },
    { n: "보딩패스", f: "boardingpass-official.jpg" },
    { n: "파우", f: "fau.png", tiktok: true, market: "미국" },
    { n: "리꼼", f: "licom.png", tiktok: true, market: "미국" },
    { n: "앱소", f: "abso.png", tiktok: true, market: "미국" },
    { n: "허브이오", f: "herb-io.png", tiktok: true, market: "미국" },
    { n: "고려공작1392", f: "koryo-1392.png", tiktok: true, market: "미국" },
    { n: "프럼네이처", f: "from-nature.png", tiktok: true, market: "미국" },
    { n: "피븐", f: "peeven.png", tiktok: true, market: "미국" },
    { n: "부강코스메틱", f: "bukang-cosmetic.svg", tiktok: true, market: "미국" },
    { n: "닥터브라이언", f: "dr-brian.png", tiktok: true, market: "태국" },
    { n: "볼라보", f: "volabo.png", tiktok: true, market: "베트남" },
    { n: "베리즈", f: "berries.png", tiktok: true, market: "태국·베트남" },
    { n: "닥터노바메디", f: "dr-novamedi.png", tiktok: true, market: "동남아·태국", soft: true },
    { n: "JMW / 로아띠", f: "jmw-roatti.png", tiktok: true },
    { n: "웰더마", f: "wellderma.png", tiktok: true },
    { n: "닥터비타", f: "dr-vita.png", tiktok: true },
    { n: "픽셀퓨어", f: "pixelpure.png", tiktok: true },
    { n: "더이유", f: "the-yiu.png", tiktok: true },
    { n: "버모어", f: "vermore.png", tiktok: true },
    { n: "리터뉴", f: "returnu.png", tiktok: true }
  ];

  var UNIT_SUPPLY = 2000000, UNIT_INCL = 2200000;
  var won = function (n) { return n.toLocaleString("ko-KR") + "원"; };

  function el(tag, cls) { var e = document.createElement(tag); if (cls) e.className = cls; return e; }

  // 1) 로고 그리드 렌더
  function renderLogos() {
    var grid = document.getElementById("logoGrid");
    if (!grid) return;
    BRANDS.forEach(function (b) {
      var tile = el("div", "logo-tile");
      if (b.soft) tile.style.background = "#f1f5f9";
      var img = el("img");
      img.src = LOGO + b.f;
      img.alt = b.n + (b.tiktok ? " (TikTok Shop 입점·운영)" : "") + " 로고";
      img.loading = "lazy";
      img.width = 160; img.height = 90;
      if (b.invert) img.style.filter = "brightness(0)";
      if (b.market) img.title = b.n + " · " + b.market;
      tile.appendChild(img);
      if (b.tiktok) { var t = el("span", "tt"); t.textContent = "TikTok Shop"; tile.appendChild(t); }
      var nm = el("span", "nm"); nm.textContent = b.n; tile.appendChild(nm);
      grid.appendChild(tile);
    });
  }

  // 2) 모바일 메뉴
  function initMenu() {
    var btn = document.getElementById("menuToggle"), nav = document.getElementById("nav");
    if (!btn || !nav) return;
    var set = function (open) {
      nav.classList.toggle("open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
    };
    btn.addEventListener("click", function () { set(btn.getAttribute("aria-expanded") !== "true"); });
    nav.addEventListener("click", function (e) { if (e.target.tagName === "A") set(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") set(false); });
    window.addEventListener("resize", function () { if (window.innerWidth > 640) set(false); });
  }

  // 3) 상태(참여방식·권역) + 가격 계산 — calc ↔ form 동기화
  function selectedRegions() {
    return Array.prototype.slice.call(document.querySelectorAll('input[name="region"]:checked')).map(function (c) { return c.value; });
  }
  function currentTrack() {
    var r = document.querySelector('input[name="track"]:checked');
    return r ? r.value : "batch";
  }
  var TRACK_LABEL = { batch: "배치 1기 참여", onboarding: "온보딩만 진행" };

  function recalc() {
    var regions = selectedRegions(), n = regions.length;
    var supply = UNIT_SUPPLY * n, incl = UNIT_INCL * n;
    var rEl = document.getElementById("calcRegions");
    if (rEl) rEl.textContent = n ? (regions.join(", ") + " (" + n + "권역)") : "권역을 선택하세요";
    var s = document.getElementById("calcSupply"), i = document.getElementById("calcIncl");
    if (s) s.textContent = won(supply);
    if (i) i.textContent = won(incl);
    // form select(#f-track, #f-region) 반영
    var fTrack = document.getElementById("f-track");
    if (fTrack) fTrack.value = TRACK_LABEL[currentTrack()];
    var fRegion = document.getElementById("f-region");
    if (fRegion) Array.prototype.forEach.call(fRegion.options, function (o) { o.selected = regions.indexOf(o.value) !== -1; });
    return { regions: regions, n: n, supply: supply, incl: incl };
  }

  function initCalc() {
    document.querySelectorAll('input[name="region"], input[name="track"]').forEach(function (inp) {
      inp.addEventListener("change", recalc);
    });
    // form → calc 역동기화
    var fTrack = document.getElementById("f-track");
    if (fTrack) fTrack.addEventListener("change", function () {
      var key = fTrack.value === TRACK_LABEL.onboarding ? "onboarding" : "batch";
      var radio = document.querySelector('input[name="track"][value="' + key + '"]');
      if (radio) { radio.checked = true; }
      recalc();
    });
    var fRegion = document.getElementById("f-region");
    if (fRegion) fRegion.addEventListener("change", function () {
      var vals = Array.prototype.slice.call(fRegion.selectedOptions).map(function (o) { return o.value; });
      document.querySelectorAll('input[name="region"]').forEach(function (c) { c.checked = vals.indexOf(c.value) !== -1; });
      recalc();
    });
    // hero CTA 프리셋
    document.querySelectorAll("[data-track]").forEach(function (a) {
      a.addEventListener("click", function () {
        var key = a.getAttribute("data-track");
        var radio = document.querySelector('input[name="track"][value="' + key + '"]');
        if (radio) { radio.checked = true; recalc(); }
      });
    });
    recalc();
  }

  // 4) 문의 폼 → mailto 초안 (실제 발송 자동화 없음)
  // 메일 URL 생성은 순수 함수로 분리(테스트에서 반환값 검증 가능).
  function buildMailto(form) {
    var brand = form.brand.value.trim(), name = form.manager.value.trim(),
        email = form.email.value.trim(), product = form.product.value.trim(),
        msg = form.message.value.trim();
    var st = recalc();
    var track = document.getElementById("f-track").value;
    var regions = st.n ? st.regions.join(", ") + " (" + st.n + "권역)" : "미선택";
    var cost = st.n ? ("공급가 " + won(st.supply) + " / VAT 포함 " + won(st.incl)) : "권역 미선택";
    var subject = "[글로벌 진출 배치 1기] " + track + " 신청 - " + brand;
    var body = [
      "글로벌 진출 배치 1기 / GLOBAL LAUNCH BATCH 01 신청",
      "",
      "■ 브랜드명: " + brand,
      "■ 담당자: " + name,
      "■ 이메일: " + email,
      "■ 제품 URL: " + (product || "-"),
      "■ 참여 방식: " + track,
      "■ 희망 권역: " + regions,
      "■ 예상 비용: " + cost,
      "",
      "■ 메시지:",
      (msg || "-"),
      "",
      "— 본 메일은 신청 초안입니다. 메일 앱에서 실제 전송을 완료해야 접수됩니다."
    ].join("\n");
    return "mailto:jaybe@dinostudio.kr?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  }

  function initForm() {
    var form = document.getElementById("contactForm");
    if (!form) return;
    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    function show(id, on) { var e = document.getElementById(id); if (e) e.hidden = !on; }
    // 테스트용 노출 — 메일 URL 생성(반환값) 검증 전용. 실제 발송은 하지 않음.
    window.__glbBuildMailto = function () { return buildMailto(form); };
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var brand = form.brand.value.trim(), name = form.manager.value.trim(),
          email = form.email.value.trim(), product = form.product.value.trim();
      var ok = true, firstBad = null;
      function bad(cond, errId, field) { show(errId, cond); if (cond) { ok = false; if (!firstBad) firstBad = field; } }
      bad(!brand, "e-brand", form.brand);
      bad(!name, "e-name", form.manager);
      bad(!emailRe.test(email), "e-email", form.email);
      var prodBad = product !== "" && !/^https?:\/\/\S+$/i.test(product);
      bad(prodBad, "e-product", form.product);
      if (!ok) { if (firstBad) firstBad.focus(); return; }
      window.location.href = buildMailto(form);
    });
    // 입력 시 해당 에러 숨김
    ["brand", "manager", "email", "product"].forEach(function (nm) {
      var map = { brand: "e-brand", manager: "e-name", email: "e-email", product: "e-product" };
      if (form[nm]) form[nm].addEventListener("input", function () { show(map[nm], false); });
    });
  }

  function init() { renderLogos(); initMenu(); initCalc(); initForm(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
