(function () {
  "use strict";

  const CURRENT_YEAR = new Date().getFullYear();
  const MIN_YEAR = 1950;
  const APPROX_RANGE = 2; // 「だいたいで探す」の許容範囲(±年)

  const yearInput = document.getElementById("year");
  const rangeInput = document.getElementById("yearRange");
  const rangeMaxLabel = document.getElementById("rangeMax");
  const form = document.getElementById("form");
  const decBtn = document.getElementById("dec");
  const incBtn = document.getElementById("inc");
  const includeFictionCb = document.getElementById("includeFiction");
  const approxCb = document.getElementById("approxSearch");

  const resultSection = document.getElementById("result");
  const resultsListEl = document.getElementById("resultsList");
  const emptyNoteEl = document.getElementById("emptyNote");
  const cardEl = document.getElementById("card");
  const fileNoEl = document.getElementById("fileNo");
  const cardYearEl = document.getElementById("cardYear");
  const fallbackNoteEl = document.getElementById("fallbackNote");
  const robotIconUse = document.getElementById("robotIconUse");
  const robotNameEl = document.getElementById("robotName");
  const robotNameEnEl = document.getElementById("robotNameEn");
  const robotCategoryEl = document.getElementById("robotCategory");
  const robotMakerLabelEl = document.getElementById("robotMakerLabel");
  const robotMakerEl = document.getElementById("robotMaker");
  const robotKindEl = document.getElementById("robotKind");
  const robotBlurbEl = document.getElementById("robotBlurb");
  const shareBtn = document.getElementById("shareBtn");
  const imageSearchBtn = document.getElementById("imageSearchBtn");

  yearInput.max = String(CURRENT_YEAR);
  rangeInput.max = String(CURRENT_YEAR);
  rangeMaxLabel.textContent = String(CURRENT_YEAR);
  // rangeInput の max はHTML上仮の値(2100)だったため、正しいmaxに更新した直後に
  // value を明示的に再代入してつまみの位置を再計算させる(でないと初期位置がズレる)
  rangeInput.value = yearInput.value;

  function clampYear(v) {
    v = Math.round(v);
    if (Number.isNaN(v)) return 1990;
    return Math.max(MIN_YEAR, Math.min(CURRENT_YEAR, v));
  }

  function syncFromNumber() {
    const v = clampYear(parseInt(yearInput.value, 10));
    yearInput.value = v;
    rangeInput.value = v;
  }
  function syncFromRange() {
    yearInput.value = rangeInput.value;
  }

  decBtn.addEventListener("click", () => {
    yearInput.value = clampYear(parseInt(yearInput.value, 10) - 1);
    rangeInput.value = yearInput.value;
  });
  incBtn.addEventListener("click", () => {
    yearInput.value = clampYear(parseInt(yearInput.value, 10) + 1);
    rangeInput.value = yearInput.value;
  });
  yearInput.addEventListener("change", syncFromNumber);
  rangeInput.addEventListener("input", syncFromRange);

  // 年ごとの一覧（IDから直接記録を開く用。フィクションも含む全件）
  const byYear = new Map();
  ROBOTS.forEach((r) => {
    if (!byYear.has(r.year)) byYear.set(r.year, []);
    byYear.get(r.year).push(r);
  });

  // 指定年に対する候補を近い順に返す。maxDiff=0なら完全一致のみ。
  function findMatches(year, includeFiction, maxDiff) {
    const pool = includeFiction ? ROBOTS : ROBOTS.filter((r) => !r.fiction);
    return pool
      .map((r) => ({ robot: r, diff: Math.abs(r.year - year) }))
      .filter((m) => m.diff <= maxDiff)
      .sort((a, b) => a.diff - b.diff || a.robot.year - b.robot.year || a.robot.id - b.robot.id);
  }

  let requestedYear = 0;
  // true のときは「一覧から直接開いた記録」であり、閲覧者自身の生まれ年とは無関係。
  // シェア文で「私は◯◯年生まれ」と偽らないよう、この場合は文面を変える。
  let cameFromDirectLink = false;

  function buildRow(robot, diff) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ledger-row";
    const color = CATEGORY_COLOR[robot.category] || "#6b6b6b";
    btn.style.borderLeft = "4px solid " + color;
    btn.style.backgroundColor = color + "1a";
    const diffLabel = diff === 0 ? "ぴったり" : "±" + diff + "年";
    btn.innerHTML =
      '<span class="ledger-year">' + robot.year + "</span>" +
      '<span class="ledger-name">' + robot.name + (robot.nameEn ? '<span class="ledger-en">' + robot.nameEn + "</span>" : "") + "</span>" +
      '<span class="ledger-cat">' + (CATEGORY_LABEL[robot.category] || robot.category) + "</span>" +
      '<span class="ledger-kind' + (diff === 0 ? " is-exact" : "") + '">' + diffLabel + "</span>";
    btn.addEventListener("click", () => {
      showDetail(robot, diff);
      resultsListEl.querySelectorAll(".ledger-row").forEach((r) => r.classList.remove("is-selected"));
      btn.classList.add("is-selected");
    });
    return btn;
  }

  function renderResultsList(matches) {
    resultsListEl.innerHTML = "";
    let lastVisible = null;
    matches.forEach((m) => {
      const row = buildRow(m.robot, m.diff);
      resultsListEl.appendChild(row);
      lastVisible = row;
    });
    if (lastVisible) lastVisible.classList.add("is-last-visible");
  }

  function showDetail(robot, diff) {
    const actualYear = robot.year;
    const isFallback = diff > 0;

    fileNoEl.textContent = String(robot.id).padStart(3, "0");
    // フィクションは実年表とのズレが分かるよう、作中設定の年か発表年かを併記する
    let yearNote = "";
    if (robot.fiction) {
      yearNote = robot.yearType === "story" ? "（作中設定）" : "（公開年）";
    }
    cardYearEl.textContent = actualYear + "年生まれ" + yearNote;

    if (isFallback) {
      fallbackNoteEl.hidden = false;
      fallbackNoteEl.textContent =
        requestedYear + "年ぴったりではなく、" + actualYear + "年(±" + diff + "年)の記録です。";
    } else {
      fallbackNoteEl.hidden = true;
    }

    robotIconUse.setAttribute("href", "#icon-" + robot.category);
    robotNameEl.textContent = robot.name;
    if (robot.nameEn) {
      robotNameEnEl.hidden = false;
      robotNameEnEl.textContent = robot.nameEn;
    } else {
      robotNameEnEl.hidden = true;
      robotNameEnEl.textContent = "";
    }
    robotCategoryEl.textContent = CATEGORY_LABEL[robot.category] || robot.category;
    robotMakerLabelEl.textContent = robot.fiction ? "初出" : "開発";
    robotMakerEl.textContent = robot.maker;
    robotKindEl.textContent = robot.fiction ? "フィクション" : "実在";
    robotBlurbEl.textContent = robot.blurb;

    let shareText;
    if (cameFromDirectLink) {
      // 一覧からの直接表示: 閲覧者の生まれ年は分からないので「同い年」を名乗らない
      shareText = "「" + robot.name + "」（" + actualYear + "年）を見つけました🤖 #同い年ロボット";
    } else if (isFallback) {
      shareText =
        "私(" + requestedYear + "年生まれ)とだいたい同い年(" + actualYear + "年生まれ)のロボットは「" + robot.name + "」でした🤖 #同い年ロボット";
    } else {
      shareText = "私(" + requestedYear + "年生まれ)と同い年のロボットは「" + robot.name + "」でした🤖 #同い年ロボット";
    }
    const shareUrl = location.origin + location.pathname + "?year=" + requestedYear + "&id=" + robot.id;
    shareBtn.href =
      "https://twitter.com/intent/tweet?text=" + encodeURIComponent(shareText) + "&url=" + encodeURIComponent(shareUrl);

    const imageQuery = robot.searchName || (robot.name + (robot.nameEn ? " " + robot.nameEn : ""));
    imageSearchBtn.href = "https://www.google.com/search?tbm=isch&q=" + encodeURIComponent(imageQuery);

    history.replaceState(null, "", "?year=" + requestedYear + "&id=" + robot.id);

    cardEl.hidden = false;
    cardEl.classList.remove("replay");
    // アニメーションを再トリガーする
    void cardEl.offsetWidth;
    cardEl.classList.add("replay");
  }

  function runSearch(year) {
    requestedYear = year;
    cameFromDirectLink = false;

    const includeFiction = includeFictionCb.checked;
    const maxDiff = approxCb.checked ? APPROX_RANGE : 0;
    const matches = findMatches(year, includeFiction, maxDiff);

    resultSection.hidden = false;

    if (matches.length === 0) {
      resultsListEl.innerHTML = "";
      resultsListEl.hidden = true;
      cardEl.hidden = true;
      emptyNoteEl.hidden = false;
      emptyNoteEl.textContent = approxCb.checked
        ? year + "年の前後" + APPROX_RANGE + "年には記録が見つかりませんでした。年を変えてお試しください。"
        : year + "年ぴったりの記録はまだありません。「だいたいで探す」をオンにすると近い年の記録も表示されます。";
    } else {
      resultsListEl.hidden = false;
      emptyNoteEl.hidden = true;
      renderResultsList(matches);
      showDetail(matches[0].robot, matches[0].diff);
      resultsListEl.querySelector(".ledger-row").classList.add("is-selected");
    }

    resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function openDirect(year, id) {
    const robot = ROBOTS.find((r) => r.id === id);
    if (!robot) {
      runSearch(clampYear(year));
      return;
    }
    requestedYear = year;
    cameFromDirectLink = true;

    const group = byYear.get(robot.year) || [robot];
    const matches = group
      .slice()
      .sort((a, b) => a.id - b.id)
      .map((r) => ({ robot: r, diff: 0 }));

    resultSection.hidden = false;
    resultsListEl.hidden = false;
    emptyNoteEl.hidden = true;
    renderResultsList(matches);
    const rowIndex = matches.findIndex((m) => m.robot === robot);
    const row = Array.from(resultsListEl.querySelectorAll(".ledger-row"))[rowIndex];
    if (row) row.classList.add("is-selected");
    showDetail(robot, 0);
    resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    syncFromNumber();
    runSearch(parseInt(yearInput.value, 10));
  });

  // 共有されたリンク (?year=&id=) を開いた場合はその記録を直接表示する
  const params = new URLSearchParams(location.search);
  const paramYear = parseInt(params.get("year"), 10);
  const paramId = parseInt(params.get("id"), 10);
  if (!Number.isNaN(paramYear) && !Number.isNaN(paramId)) {
    yearInput.value = clampYear(paramYear);
    rangeInput.value = yearInput.value;
    // フォーム欄は1950〜現在の範囲に収めるが、だいたい同い年の判定には元の年をそのまま使う
    // (1927年のマリアや2112年のドラえもんのような範囲外の記録も、一覧からのリンクでは正しく表示するため)
    openDirect(paramYear, paramId);
  }
})();
