(function () {
  "use strict";

  const CURRENT_YEAR = new Date().getFullYear();
  const MIN_YEAR = 1950;

  const yearInput = document.getElementById("year");
  const rangeInput = document.getElementById("yearRange");
  const rangeMaxLabel = document.getElementById("rangeMax");
  const form = document.getElementById("form");
  const decBtn = document.getElementById("dec");
  const incBtn = document.getElementById("inc");

  const resultSection = document.getElementById("result");
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
  const moreBtn = document.getElementById("moreBtn");
  const cardEl = document.getElementById("card");

  yearInput.max = String(CURRENT_YEAR);
  rangeInput.max = String(CURRENT_YEAR);
  rangeMaxLabel.textContent = String(CURRENT_YEAR);

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

  // 年ごとの候補一覧
  const byYear = new Map();
  ROBOTS.forEach((r) => {
    if (!byYear.has(r.year)) byYear.set(r.year, []);
    byYear.get(r.year).push(r);
  });
  const availableYears = Array.from(byYear.keys()).sort((a, b) => a - b);

  function candidatesFor(year) {
    if (byYear.has(year)) return { year, exact: true, list: byYear.get(year) };
    // 一番近い年（複数タイなら両方の年をまとめて対象にする）
    let bestDiff = Infinity;
    availableYears.forEach((y) => {
      const diff = Math.abs(y - year);
      if (diff < bestDiff) bestDiff = diff;
    });
    const nearYears = availableYears.filter((y) => Math.abs(y - year) === bestDiff);
    const list = nearYears.flatMap((y) => byYear.get(y));
    return { year: nearYears[0], exact: false, list };
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  let queue = [];
  let requestedYear = 0;

  function render(robot, isFallback, actualYear) {
    fileNoEl.textContent = String(robot.id).padStart(3, "0");
    cardYearEl.textContent = actualYear + "年生まれ";

    if (isFallback) {
      fallbackNoteEl.hidden = false;
      fallbackNoteEl.textContent =
        requestedYear + "年ぴったりの記録はまだありません。一番近い" + actualYear + "年の記録を表示しています。";
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

    const shareText =
      "私(" + requestedYear + "年生まれ)と同い年のロボットは「" + robot.name + "」でした🤖 #同い年ロボット";
    const shareUrl = location.origin + location.pathname + "?year=" + requestedYear + "&id=" + robot.id;
    shareBtn.href =
      "https://twitter.com/intent/tweet?text=" + encodeURIComponent(shareText) + "&url=" + encodeURIComponent(shareUrl);

    moreBtn.hidden = queue.length === 0;

    history.replaceState(null, "", "?year=" + requestedYear + "&id=" + robot.id);

    resultSection.hidden = false;
    cardEl.classList.remove("replay");
    // アニメーションを再トリガーする
    void cardEl.offsetWidth;
    cardEl.classList.add("replay");
    resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function pickAndRender(year, presetId) {
    requestedYear = year;

    // 一覧ページ等から特定のIDが指定された場合は、要求年の候補群に関わらずその記録を直接表示する
    if (presetId != null) {
      const robot = ROBOTS.find((r) => r.id === presetId);
      if (robot) {
        const group = byYear.get(robot.year) || [robot];
        queue = shuffle(group.filter((r) => r !== robot));
        render(robot, robot.year !== year, robot.year);
        return;
      }
    }

    const { list, exact, year: actualYear } = candidatesFor(year);
    const shuffled = shuffle(list);
    const robot = shuffled[0];
    queue = shuffled.slice(1);
    render(robot, !exact, actualYear);
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    syncFromNumber();
    pickAndRender(parseInt(yearInput.value, 10), null);
  });

  moreBtn.addEventListener("click", () => {
    if (queue.length === 0) return;
    const robot = queue.shift();
    const actualYear = robot.year;
    render(robot, actualYear !== requestedYear, actualYear);
  });

  // 共有されたリンク (?year=&id=) を開いた場合はその記録を直接表示する
  const params = new URLSearchParams(location.search);
  const paramYear = parseInt(params.get("year"), 10);
  const paramId = parseInt(params.get("id"), 10);
  if (!Number.isNaN(paramYear) && !Number.isNaN(paramId)) {
    yearInput.value = clampYear(paramYear);
    rangeInput.value = yearInput.value;
    pickAndRender(clampYear(paramYear), paramId);
  }
})();
