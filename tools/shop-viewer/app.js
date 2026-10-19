"use strict";

// TikTok Shop 판매창 캡처 갤러리 — 정적(buildless) 뷰어.
// data.json 을 읽어 카드로 렌더링하고, 검색/국가 필터/큰 이미지 보기(dialog)/JPG 다운로드를 제공한다.
// 캡처 이미지는 captures/<id>-product-us.jpg 로컬 파일. 이미지가 없으면 '확인 대기'로 정직하게 표시한다.

(function () {
  var STATUS_LABEL = { captured: "완료", preparing: "준비 중", pending: "확인 대기" };

  var state = { items: [], country: "all", query: "", liveOrigin: null };

  var gallery = document.getElementById("gallery");
  var emptyMsg = document.getElementById("empty");
  var searchInput = document.getElementById("search");
  var filterButtons = Array.prototype.slice.call(document.querySelectorAll(".filter"));
  var countCaptured = document.getElementById("count-captured");
  var countTotal = document.getElementById("count-total");

  // Dialog refs
  var viewer = document.getElementById("viewer");
  var viewerTitle = document.getElementById("viewer-title");
  var viewerImg = document.getElementById("viewer-img");
  var viewerMissing = document.getElementById("viewer-missing");
  var viewerMeta = document.getElementById("viewer-meta");
  var viewerDownload = document.getElementById("viewer-download");
  var viewerClose = document.getElementById("viewer-close");

  function fmtDate(iso) {
    if (!iso) return "캡처 시각 미기록";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "캡처 시각 미기록";
    var p = function (n) { return String(n).padStart(2, "0"); };
    return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(d) + " KST";
  }

  function downloadName(item) {
    if (!item.image) return item.id + "-product.jpg";
    var parts = item.image.split("/");
    return parts[parts.length - 1] || item.id + "-product.jpg";
  }

  function matchesQuery(item, q) {
    if (!q) return true;
    var hay = ((item.name || "") + " " + (item.company || "") + " " + (item.id || "")).toLowerCase();
    return hay.indexOf(q) !== -1;
  }

  function visibleItems() {
    return state.items.filter(function (it) {
      if (state.country !== "all" && it.country !== state.country) return false;
      return matchesQuery(it, state.query);
    });
  }

  function openViewer(item) {
    viewerTitle.textContent = item.name + (item.company ? " · " + item.company : "");
    viewerMeta.textContent = item.country + " · " + (STATUS_LABEL[item.status] || item.status) + " · " + fmtDate(item.capturedAt);

    if (item.image) {
      viewerImg.src = item.image;
      viewerImg.alt = item.name + " 상품 페이지 캡처";
      viewerImg.style.display = "block";
      viewerMissing.hidden = true;
      viewerDownload.hidden = false;
      viewerDownload.href = item.image;
      viewerDownload.setAttribute("download", downloadName(item));
      // 이미지 로드 실패 시 다운로드/이미지 숨기고 안내로 전환
      viewerImg.onerror = function () {
        viewerImg.style.display = "none";
        viewerMissing.hidden = false;
        viewerDownload.hidden = true;
      };
    } else {
      viewerImg.removeAttribute("src");
      viewerImg.style.display = "none";
      viewerMissing.hidden = false;
      viewerDownload.hidden = true;
    }

    if (typeof viewer.showModal === "function") {
      viewer.showModal();
    } else {
      viewer.setAttribute("open", "");
    }
  }

  function closeViewer() {
    if (typeof viewer.close === "function" && viewer.open) { viewer.close(); }
    else { viewer.removeAttribute("open"); }
    viewerImg.removeAttribute("src");
  }

  function makeBadge(status) {
    var b = document.createElement("span");
    b.className = "badge " + status;
    b.textContent = STATUS_LABEL[status] || status;
    return b;
  }

  function makeThumb(item) {
    var thumb = document.createElement("div");
    thumb.className = "thumb";
    thumb.appendChild(makeBadge(item.status));

    var flag = document.createElement("span");
    flag.className = "flag";
    flag.textContent = item.country;
    thumb.appendChild(flag);

    var viewBtn = document.createElement("button");
    viewBtn.type = "button";
    viewBtn.className = "view-btn";
    viewBtn.setAttribute("aria-label", item.name + " 캡처 크게 보기");
    viewBtn.disabled = true; // 이미지 로드 성공 시(onload) 활성화
    // 먼저 append — view-btn 은 absolute 라 DOM 순서와 무관하게 이미지/플레이스홀더 위에 겹친다.
    thumb.appendChild(viewBtn);

    function showPlaceholder(text) {
      var ph = document.createElement("div");
      ph.className = "placeholder";
      var icon = document.createElement("span");
      icon.className = "ph-icon";
      icon.textContent = "🖼";
      var label = document.createElement("span");
      label.textContent = text;
      ph.appendChild(icon);
      ph.appendChild(label);
      thumb.appendChild(ph);
      viewBtn.disabled = true;
    }

    if (item.image) {
      var img = document.createElement("img");
      img.alt = item.name + " 상품 페이지 캡처";
      img.loading = "lazy";
      img.onload = function () { viewBtn.disabled = false; };
      img.onerror = function () {
        if (img.parentNode) { img.parentNode.removeChild(img); }
        showPlaceholder("캡처 준비 중");
      };
      img.src = item.image;
      thumb.appendChild(img);
    } else {
      showPlaceholder(item.status === "pending" ? "판매 주소 확인 대기" : "캡처 준비 중");
    }

    viewBtn.addEventListener("click", function () {
      if (!viewBtn.disabled) openViewer(item);
    });
    return thumb;
  }

  function makeCard(item) {
    var card = document.createElement("article");
    card.className = "card";
    card.appendChild(makeThumb(item));

    var body = document.createElement("div");
    body.className = "card-body";

    var name = document.createElement("h2");
    name.className = "card-name";
    name.textContent = item.name;
    body.appendChild(name);

    if (item.company) {
      var company = document.createElement("p");
      company.className = "card-company";
      company.textContent = item.company;
      body.appendChild(company);
    }

    if (item.note) {
      var note = document.createElement("p");
      note.className = "card-note";
      note.textContent = item.note;
      body.appendChild(note);
    }

    var meta = document.createElement("p");
    meta.className = "card-meta";
    meta.textContent = (STATUS_LABEL[item.status] || item.status) + " · " + item.country + " · " + fmtDate(item.capturedAt);
    body.appendChild(meta);

    var actions = document.createElement("div");
    actions.className = "card-actions";

    // 원본 상품 링크
    if (item.productUrl) {
      var prod = document.createElement("a");
      prod.className = "btn";
      prod.href = item.productUrl;
      prod.target = "_blank";
      prod.rel = "noopener noreferrer";
      prod.textContent = "상품 원본 ↗";
      prod.title = "원본 페이지는 지역 제한으로 한국에서 열리지 않을 수 있습니다.";
      actions.appendChild(prod);
    }

    // 매장 링크(있을 때만)
    if (item.storeUrl) {
      var store = document.createElement("a");
      store.className = "btn";
      store.href = item.storeUrl;
      store.target = "_blank";
      store.rel = "noopener noreferrer";
      store.textContent = "매장 원본 ↗";
      store.title = "원본 페이지는 지역 제한으로 한국에서 열리지 않을 수 있습니다.";
      actions.appendChild(store);
    }

    // 실시간 미국 브라우저(검증된 HTTPS 뷰어가 설정된 경우에만, 미국 판매 URL 이 있는 항목만)
    if (state.liveOrigin && item.country === "미국" && item.productUrl) {
      var live = document.createElement("a");
      live.className = "btn";
      live.href = state.liveOrigin + "/?brand=" + encodeURIComponent(item.id);
      live.target = "_blank";
      live.rel = "noopener noreferrer";
      live.textContent = "실시간 미국 브라우저 ↗";
      live.title = "별도 인증이 필요한 1인용 뷰어가 새 탭에서 열립니다.";
      actions.appendChild(live);
    }

    // JPG 다운로드(이미지 경로가 있을 때만; 파일이 없으면 뷰어에서 안내)
    if (item.image) {
      var dl = document.createElement("a");
      dl.className = "btn btn-pink";
      dl.href = item.image;
      dl.setAttribute("download", downloadName(item));
      dl.textContent = "JPG 다운로드";
      actions.appendChild(dl);
    }

    body.appendChild(actions);
    card.appendChild(body);
    return card;
  }

  function updateCounts(visible) {
    var captured = state.items.filter(function (it) { return it.status === "captured"; }).length;
    countCaptured.textContent = "완료 캡처 " + captured;
    countTotal.textContent = "표시 " + visible.length + " / 전체 " + state.items.length;
  }

  function render() {
    var visible = visibleItems();
    gallery.innerHTML = "";
    visible.forEach(function (item) { gallery.appendChild(makeCard(item)); });
    emptyMsg.hidden = visible.length !== 0;
    updateCounts(visible);
  }

  function bindControls() {
    searchInput.addEventListener("input", function () {
      state.query = searchInput.value.trim().toLowerCase();
      render();
    });

    filterButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.country = btn.getAttribute("data-country");
        filterButtons.forEach(function (b) {
          var active = b === btn;
          b.classList.toggle("is-active", active);
          b.setAttribute("aria-pressed", active ? "true" : "false");
        });
        render();
      });
    });

    viewerClose.addEventListener("click", closeViewer);
    // 백드롭 클릭으로 닫기
    viewer.addEventListener("click", function (e) {
      if (e.target === viewer) closeViewer();
    });
    // Escape(native dialog cancel) 후 src 정리
    viewer.addEventListener("close", function () { viewerImg.removeAttribute("src"); });
  }

  function showLoadError() {
    gallery.innerHTML = "";
    emptyMsg.hidden = false;
    emptyMsg.textContent =
      "data.json 을 불러오지 못했습니다. 파일을 직접 열었다면 정적 서버로 실행해 주세요 (예: python3 -m http.server).";
  }

  function init() {
    bindControls();
    fetch("data.json", { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (json) {
        state.items = Array.isArray(json.items) ? json.items : [];
        state.liveOrigin = window.ShopLiveLink ? window.ShopLiveLink.liveViewerOrigin(json.meta) : null;
        render();
      })
      .catch(function () { showLoadError(); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
