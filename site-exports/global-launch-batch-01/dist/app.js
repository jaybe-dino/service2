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

  // 권역당 정가 300만원 → 10월 신청 한정 50% 할인(공급가 150만원 / VAT 포함 165만원)
  var UNIT_REG = 3000000, UNIT_SUPPLY = 1500000, UNIT_INCL = 1650000;
  var won = function (n) { return n.toLocaleString("ko-KR") + "원"; };

  function el(tag, cls) { var e = document.createElement(tag); if (cls) e.className = cls; return e; }

  // 1) 로고 그리드 렌더 (12개 먼저, 나머지는 '전체 보기'로 펼침)
  var LOGO_PREVIEW = 12;
  function renderLogos() {
    var grid = document.getElementById("logoGrid");
    if (!grid) return;
    var previewNames = ["유한양행", "클리오", "톤28", "LG생활건강", "CJ제일제당", "블리블리", "파우", "리꼼", "앱소", "닥터브라이언", "JMW / 로아띠", "웰더마"];
    var orderedBrands = previewNames.map(function (name) { return BRANDS.find(function (b) { return b.n === name; }); }).filter(Boolean).concat(BRANDS.filter(function (b) { return previewNames.indexOf(b.n) < 0; }));
    orderedBrands.forEach(function (b, idx) {
      var tile = el("div", "logo-tile");
      if (idx >= LOGO_PREVIEW) tile.setAttribute("data-extra", "");
      if (b.soft) tile.style.background = "#f5f5f6";
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
    nav.addEventListener("click", function (e) { if (e.target.closest("a")) set(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") set(false); });
    window.addEventListener("resize", function () { if (window.innerWidth > 1024) set(false); });
  }

  // 3) 상태(참여방식·권역) + 가격 계산 — calc ↔ form 동기화
  function selectedRegions() {
    return Array.prototype.slice.call(document.querySelectorAll('input[name="region"]:checked')).map(function (c) { return c.value; });
  }
  // 권역/동남아 하위 국가 요소 접근자
  function calcRegionEls() { return document.querySelectorAll('input[name="region"]'); }
  function formRegionEls() { return document.querySelectorAll('input[name="fregion"]'); }
  function seaEls() { return document.querySelectorAll('input[name="sea"]'); }
  function selectedSea() { return Array.prototype.slice.call(seaEls()).filter(function (c) { return c.checked && !c.disabled; }).map(function (c) { return c.value; }); }
  function seaActive() { return Array.prototype.slice.call(calcRegionEls()).some(function (c) { return c.value === "동남아" && c.checked; }); }

  function recalc() {
    var regions = selectedRegions(), n = regions.length;
    var reg = UNIT_REG * n, supply = UNIT_SUPPLY * n, incl = UNIT_INCL * n;
    var rEl = document.getElementById("calcRegions");
    if (rEl) rEl.textContent = n ? (regions.join(", ") + " (" + n + "권역)") : "권역을 선택하세요";
    var g = document.getElementById("calcReg"), s = document.getElementById("calcSupply"), i = document.getElementById("calcIncl");
    if (g) { g.textContent = n ? won(reg) : "권역 선택 후 안내"; g.classList.toggle("reg", n > 0); }
    if (s) s.textContent = n ? won(supply) : "권역 선택 후 안내";
    if (i) i.textContent = n ? won(incl) : "권역 선택 후 안내";
    return { regions: regions, n: n, reg: reg, supply: supply, incl: incl };
  }

  // 계산기 ↔ 신청서 권역을 값으로만 미러링(이벤트 미발생 → 중복 계산 방지)
  function mirror(src, dst) {
    var vals = Array.prototype.slice.call(src).filter(function (c) { return c.checked; }).map(function (c) { return c.value; });
    Array.prototype.forEach.call(dst, function (c) { c.checked = vals.indexOf(c.value) !== -1; });
  }
  function toggleSea(on) {
    var wrap = document.getElementById("seaWrap");
    if (wrap) wrap.hidden = !on;
    Array.prototype.forEach.call(seaEls(), function (c) { c.disabled = !on; if (!on) c.checked = false; });
    if (!on) { var e = document.getElementById("e-sea"); if (e) e.hidden = true; var group = document.getElementById("seaCountries"); if (group) group.removeAttribute("aria-invalid"); }
  }
  function syncRegions(fromForm) {
    if (fromForm) mirror(formRegionEls(), calcRegionEls());
    else mirror(calcRegionEls(), formRegionEls());
    toggleSea(seaActive());
    recalc();
  }

  function initCalc() {
    Array.prototype.forEach.call(calcRegionEls(), function (inp) { inp.addEventListener("change", function () { syncRegions(false); }); });
    Array.prototype.forEach.call(formRegionEls(), function (inp) { inp.addEventListener("change", function () { syncRegions(true); }); });
    Array.prototype.forEach.call(seaEls(), function (inp) { inp.addEventListener("change", function () { var e = document.getElementById("e-sea"); if (e && selectedSea().length) { e.hidden = true; var group = document.getElementById("seaCountries"); if (group) group.removeAttribute("aria-invalid"); } }); });
    toggleSea(seaActive());
    recalc();
  }

  // 4) 문의 폼 → mailto 초안 (실제 발송 자동화 없음)
  // 메일 URL 생성은 순수 함수로 분리(테스트에서 반환값 검증 가능).
  function buildMailto(form) {
    var brand = form.brand.value.trim(), name = form.manager.value.trim(),
        email = form.email.value.trim(), product = form.product.value.trim(),
        msg = form.message.value.trim();
    var chosen = selectedRegions();
    var sea = selectedSea();
    var n = chosen.length, reg = UNIT_REG * n, supply = UNIT_SUPPLY * n, incl = UNIT_INCL * n;
    var regions = n ? chosen.map(function (r) { return (r === "동남아" && sea.length) ? ("동남아(" + sea.join("·") + ")") : r; }).join(", ") + " (" + n + "권역)" : "미선택";
    var cost = n ? ("정가 " + won(reg) + " → 50% 할인 공급가 " + won(supply) + " / VAT 포함 " + won(incl)) : "권역 미선택";
    var subject = "[글로벌 진출 배치 1기] 배치 1기 참여 신청 - " + brand;
    var body = [
      "글로벌 진출 배치 1기 / GLOBAL LAUNCH BATCH 01 신청",
      "",
      "■ 브랜드명: " + brand,
      "■ 담당자: " + name,
      "■ 이메일: " + email,
      "■ 제품 URL: " + (product || "-"),
      "■ 참여 방식: 배치 1기 참여",
      "■ 희망 권역: " + regions,
      "■ 예상 온보딩 비용(10월 신청 한정 50% 할인): " + cost,
      "■ 신청 기한: 2026년 10월 31일 23:59 (한국시간)",
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
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var brand = form.brand.value.trim(), name = form.manager.value.trim(),
          email = form.email.value.trim(), product = form.product.value.trim();
      var ok = true, firstBad = null;
      function bad(cond, errId, field) { show(errId, cond); field.setAttribute("aria-invalid", cond ? "true" : "false"); if (cond) { ok = false; if (!firstBad) firstBad = field; } }
      bad(!brand, "e-brand", form.brand);
      bad(!name, "e-name", form.manager);
      bad(!emailRe.test(email), "e-email", form.email);
      var prodBad = product !== "" && !/^https?:\/\/\S+$/i.test(product);
      bad(prodBad, "e-product", form.product);
      // 동남아 선택 시 하위 국가 1개 이상 필수
      var seaBad = seaActive() && selectedSea().length === 0;
      var eSea = document.getElementById("e-sea");
      if (eSea) eSea.hidden = !seaBad;
      var seaGroup = document.getElementById("seaCountries");
      if (seaGroup) seaGroup.setAttribute("aria-invalid", seaBad ? "true" : "false");
      if (seaBad) { ok = false; if (!firstBad) firstBad = document.querySelector('input[name="sea"]'); }
      if (!ok) { if (firstBad) firstBad.focus(); return; }
      window.location.href = buildMailto(form);
    });
    // 입력 시 해당 에러 숨김
    ["brand", "manager", "email", "product"].forEach(function (nm) {
      var map = { brand: "e-brand", manager: "e-name", email: "e-email", product: "e-product" };
      if (form[nm]) form[nm].addEventListener("input", function () { show(map[nm], false); form[nm].removeAttribute("aria-invalid"); });
    });
  }

  // 1b) 전체 협업 브랜드 보기 토글
  function initLogoMore() {
    var btn = document.getElementById("logoMore"), grid = document.getElementById("logoGrid");
    if (!btn || !grid) return;
    if (BRANDS.length <= LOGO_PREVIEW) { btn.hidden = true; return; }
    btn.addEventListener("click", function () {
      var open = grid.classList.toggle("show-all");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.textContent = open ? "협업 브랜드 접기" : "전체 협업 브랜드 보기";
    });
  }

  function init() { renderLogos(); initLogoMore(); initMenu(); initCalc(); initForm(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
