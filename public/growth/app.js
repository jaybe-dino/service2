"use strict";
/* 글로벌 성장 프로그램 2기 — 정적(buildless) 랜딩. 참여 신청은 서버(/api/launch-batch/inquiry)로
   durable 저장(로컬 접수 → 담당자 수동 확인). 운영대행 수수료 모델이라 권역별 과금 계산기는 없다. */
(function () {
  // 협업 브랜드 데이터 — glovek.space/refer(src/data/refer.ts) 분류 기준.
  var LOGO = "assets/logos/";
  var BRANDS = [
    { n: "유한양행", f: "yuhan-official.png" },
    { n: "클리오", f: "clio-official.svg" },
    { n: "톤28", f: "toun28-official.svg", invert: true },
    { n: "블리블리", f: "velyvely-official.png" },
    { n: "코오롱스포츠", f: "kolon-sport.png" },
    { n: "LG생활건강", f: "lg-hnh.png" },
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

  function el(tag, cls) { var e = document.createElement(tag); if (cls) e.className = cls; return e; }

  // 1) 로고 그리드 렌더 (12개 먼저, 나머지는 '전체 보기'로 펼침)
  var LOGO_PREVIEW = 12;
  function renderLogos() {
    var grid = document.getElementById("logoGrid");
    if (!grid) return;
    var previewNames = ["유한양행", "클리오", "톤28", "LG생활건강", "프럼네이처", "블리블리", "파우", "리꼼", "앱소", "닥터브라이언", "JMW / 로아띠", "웰더마"];
    var orderedBrands = previewNames.map(function (name) { return BRANDS.find(function (b) { return b.n === name; }); }).filter(Boolean).concat(BRANDS.filter(function (b) { return previewNames.indexOf(b.n) < 0; }));
    orderedBrands.forEach(function (b, idx) {
      var tile = el("div", "logo-tile");
      if (idx >= LOGO_PREVIEW) tile.setAttribute("data-extra", "");
      if (b.soft) tile.style.background = "#f5f5f6";
      var img = el("img");
      img.src = LOGO + b.f;
      img.alt = b.n + " 로고";
      img.loading = "lazy";
      img.width = 160; img.height = 90;
      if (b.invert) img.style.filter = "brightness(0)";
      if (b.market) img.title = b.n + " · " + b.market;
      tile.appendChild(img);
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

  // 3) 희망 시장(미국/일본/동남아) + 동남아 1개국 선택 UI — 과금 계산 없음, 메시지에 구조적으로 담는다.
  function seaEls() { return document.querySelectorAll('input[name="sea"]'); }
  function regionEls() { return document.querySelectorAll('input[name="region"]'); }
  function selectedRegions() {
    return Array.prototype.slice.call(document.querySelectorAll('input[name="region"]:checked')).map(function (c) { return c.value; });
  }
  function selectedSea() {
    var c = document.querySelector('input[name="sea"]:checked');
    return c && !c.disabled ? c.value : "";
  }
  function seaActive() {
    return Array.prototype.slice.call(regionEls()).some(function (c) { return c.value === "동남아" && c.checked; });
  }
  function toggleSea(on) {
    var wrap = document.getElementById("seaWrap");
    if (wrap) wrap.hidden = !on;
    Array.prototype.forEach.call(seaEls(), function (c) { c.disabled = !on; if (!on) c.checked = false; });
    if (!on) { var e = document.getElementById("ie-sea"); if (e) e.hidden = true; var group = document.getElementById("seaCountries"); if (group) group.removeAttribute("aria-invalid"); }
  }
  function initRegions() {
    Array.prototype.forEach.call(regionEls(), function (inp) {
      inp.addEventListener("change", function () { toggleSea(seaActive()); var e = document.getElementById("ie-region"); if (e && selectedRegions().length) e.hidden = true; });
    });
    Array.prototype.forEach.call(seaEls(), function (inp) {
      inp.addEventListener("change", function () { var e = document.getElementById("ie-sea"); if (e && selectedSea()) { e.hidden = true; var group = document.getElementById("seaCountries"); if (group) group.removeAttribute("aria-invalid"); } });
    });
    toggleSea(seaActive());
  }

  function genId() {
    try { if (window.crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) { /* 폴백 */ }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0, v = c === "x" ? r : (r & 0x3) | 0x8; return v.toString(16);
    });
  }

  // 4) 참여 신청 → /api/launch-batch/inquiry (durable 저장, 담당자 수동 확인).
  //    희망 시장·동남아 1개국·제품 URL을 메시지에 구조적으로 담아 저장한다(과금 스키마 없음).
  function initForm() {
    var form = document.getElementById("inquiryForm");
    if (!form) return;
    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    function phoneValid(v) {
      var s = (v || "").trim();
      if (!s) return false;
      if (s.length > 40) return false;
      if (!/^\+?[0-9\s().\-]+$/.test(s)) return false;
      var digits = s.replace(/[^0-9]/g, "");
      return digits.length >= 8 && digits.length <= 15;
    }
    var statusEl = document.getElementById("formStatus");
    var submitBtn = form.querySelector('button[type="submit"]');
    var consentEl = document.getElementById("f-consent");
    var reqId = genId();   // 제출 성공 전까지 유지 → 재시도해도 1건만 접수
    var sending = false;
    function show(id, on) { var e = document.getElementById(id); if (e) e.hidden = !on; }
    function setStatus(msg, kind) {
      if (!statusEl) return;
      statusEl.hidden = !msg;
      statusEl.textContent = msg || "";
      statusEl.className = "form-status" + (kind ? " form-status-" + kind : "");
    }

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      if (sending) return; // 중복 클릭 방지
      var brand = form.brand.value.trim(), name = form.manager.value.trim(),
          email = form.email.value.trim(), phone = form.phone.value.trim(),
          product = form.product ? form.product.value.trim() : "",
          userMsg = form.message ? form.message.value.trim() : "";
      var regions = selectedRegions(), sea = selectedSea();
      var ok = true, firstBad = null;
      function bad(cond, errId, field) { show(errId, cond); if (field) field.setAttribute("aria-invalid", cond ? "true" : "false"); if (cond) { ok = false; if (!firstBad) firstBad = field; } }
      bad(!brand, "ie-brand", form.brand);
      bad(!name, "ie-name", form.manager);
      bad(!emailRe.test(email), "ie-email", form.email);
      bad(!phoneValid(phone), "ie-phone", form.phone);
      var prodBad = product !== "" && !/^https?:\/\/\S+$/i.test(product);
      bad(prodBad, "ie-product", form.product);
      // 희망 시장 1개 이상
      var regionBad = regions.length < 1;
      show("ie-region", regionBad);
      if (regionBad) { ok = false; if (!firstBad) firstBad = form.querySelector('input[name="region"]'); }
      // 동남아 선택 시 하위 국가 정확히 1개 필수
      var seaBad = seaActive() && !sea;
      show("ie-sea", seaBad);
      var seaGroup = document.getElementById("seaCountries");
      if (seaGroup) seaGroup.setAttribute("aria-invalid", seaBad ? "true" : "false");
      if (seaBad) { ok = false; if (!firstBad) firstBad = document.querySelector('input[name="sea"]'); }
      // 개인정보 수집·이용 동의 필수
      var consentBad = !(consentEl && consentEl.checked);
      bad(consentBad, "ie-consent", consentEl);
      if (!ok) { if (firstBad) firstBad.focus(); setStatus("입력 내용을 확인해 주세요.", "error"); return; }

      // 희망 시장·동남아 1개국·제품 URL·사용자 메시지를 구조적으로 보관.
      var parts = ["[growth.glovek.space 글로벌 성장 프로그램 2기]"];
      parts.push("희망 시장: " + (regions.length ? regions.join("·") : "-"));
      if (seaActive() && sea) parts.push("동남아 1개국: " + sea);
      if (product) parts.push("제품 URL: " + product);
      if (userMsg) parts.push("메시지: " + userMsg);
      var message = parts.join(" / ");

      var payload = {
        requestId: reqId,
        brand: brand, manager: name, email: email, phone: phone, message: message,
        consent: true,
        company_website: form.company_website ? form.company_website.value : "" // 허니팟
      };

      sending = true;
      if (submitBtn) { if (!submitBtn.dataset.label) submitBtn.dataset.label = submitBtn.textContent; submitBtn.disabled = true; submitBtn.textContent = "접수 중…"; }
      setStatus("접수 중입니다…", "pending");

      fetch("/api/launch-batch/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (d) { return { status: r.status, d: d }; });
      }).then(function (res) {
        if (res.status >= 200 && res.status < 300 && res.d && res.d.ok) {
          setStatus("신청이 접수되었습니다. 접수번호 " + (res.d.receipt || "-") + " · 담당자가 확인 후 개별 안내드리겠습니다.", "ok");
          form.reset();            // 성공 시 초기화
          toggleSea(false);        // 동남아 하위 선택 UI도 초기화
          reqId = genId();         // 다음 신청용 새 멱등키
        } else {
          setStatus((res.d && res.d.error) || "접수에 실패했습니다. 잠시 후 다시 시도해 주세요.", "error");
        }
      }).catch(function () {
        setStatus("네트워크 오류로 접수하지 못했습니다. 잠시 후 다시 시도해 주세요.", "error");
      }).then(function () {
        sending = false;
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = submitBtn.dataset.label || "온라인 신청 접수"; }
      });
    });

    // 입력 시 해당 에러 숨김
    ["brand", "manager", "email", "phone", "product"].forEach(function (nm) {
      var map = { brand: "ie-brand", manager: "ie-name", email: "ie-email", phone: "ie-phone", product: "ie-product" };
      if (form[nm]) form[nm].addEventListener("input", function () { show(map[nm], false); form[nm].removeAttribute("aria-invalid"); });
    });
    if (consentEl) consentEl.addEventListener("change", function () { show("ie-consent", false); consentEl.removeAttribute("aria-invalid"); });
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

  // 5) 스크롤 진입 시 한 번만 드러나기 (reduced-motion / IO 미지원 시 즉시 노출)
  function initReveal() {
    var items = document.querySelectorAll(".reveal");
    if (!items.length) return;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof IntersectionObserver === "undefined") {
      Array.prototype.forEach.call(items, function (n) { n.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (ent) {
        if (ent.isIntersecting) { ent.target.classList.add("is-visible"); io.unobserve(ent.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    document.documentElement.classList.add("js");
    Array.prototype.forEach.call(items, function (n) { io.observe(n); });
  }

  // 6) 성장 패스 포인터 틸트 (fine pointer + reduced-motion 아닐 때만)
  function initPassTilt() {
    var pass = document.getElementById("pass"), inner = document.getElementById("passInner");
    if (!pass || !inner || !window.matchMedia) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    function onMove(e) {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { reset(); return; }
      var r = pass.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      inner.style.transform = "rotateY(" + (px * 5).toFixed(2) + "deg) rotateX(" + (-py * 5).toFixed(2) + "deg)";
    }
    function reset() { inner.style.transform = ""; }
    pass.addEventListener("pointermove", onMove);
    pass.addEventListener("pointerleave", reset);
  }

  // 7) 로드맵 ARIA 탭 (클릭 + 방향키/Home/End)
  function initRoadmapTabs() {
    var list = document.querySelector(".rm-nav[role=tablist]");
    if (!list) return;
    var tabs = Array.prototype.slice.call(list.querySelectorAll('[role="tab"]'));
    if (!tabs.length) return;
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(t.getAttribute("aria-controls"));
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
    }
    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () { select(tab, false); });
      tab.addEventListener("keydown", function (e) {
        var idx = null;
        switch (e.key) {
          case "ArrowRight": case "ArrowDown": idx = (i + 1) % tabs.length; break;
          case "ArrowLeft": case "ArrowUp": idx = (i - 1 + tabs.length) % tabs.length; break;
          case "Home": idx = 0; break;
          case "End": idx = tabs.length - 1; break;
          default: return;
        }
        e.preventDefault();
        select(tabs[idx], true);
      });
    });
  }

  // 8) 스크롤 위치에 따른 활성 내비 표시
  function initActiveNav() {
    var nav = document.getElementById("nav");
    if (!nav || typeof IntersectionObserver === "undefined") return;
    var links = Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]'));
    var map = {};
    links.forEach(function (a) {
      var id = a.getAttribute("href").slice(1);
      var sec = document.getElementById(id);
      if (sec) map[id] = a;
    });
    var ids = Object.keys(map);
    if (!ids.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (ent) {
        if (ent.isIntersecting) {
          links.forEach(function (a) { a.classList.remove("active"); });
          var a = map[ent.target.id];
          if (a) a.classList.add("active");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });
    ids.forEach(function (id) { io.observe(document.getElementById(id)); });
  }

  function init() {
    renderLogos(); initLogoMore(); initMenu(); initRegions(); initForm();
    initReveal(); initPassTilt(); initRoadmapTabs(); initActiveNav();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
