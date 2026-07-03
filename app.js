/* Bloom ID — PNW Wildflower Quiz — app logic */
(function () {
  "use strict";

  const screens = {
    start: document.getElementById("screen-start"),
    quiz: document.getElementById("screen-quiz"),
    result: document.getElementById("screen-result"),
    guide: document.getElementById("screen-guide"),
  };

  function showScreen(name) {
    Object.entries(screens).forEach(([key, el]) => {
      el.hidden = key !== name;
    });
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }

  // ---------------- utilities ----------------
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function pickDistractors(answer, count) {
    const pool = FLOWERS.filter((f) => f.id !== answer.id);
    const sameFamily = shuffle(pool.filter((f) => f.family === answer.family));
    const sameColor = shuffle(pool.filter((f) => f.family !== answer.family && f.color === answer.color));
    const rest = shuffle(pool.filter((f) => f.family !== answer.family && f.color !== answer.color));
    const chosen = [];
    for (const f of [...sameFamily, ...sameColor, ...rest]) {
      if (chosen.length >= count) break;
      if (!chosen.find((c) => c.id === f.id)) chosen.push(f);
    }
    return chosen;
  }

  // ---------------- round state ----------------
  let roundLength = 20;
  let roundFlowers = [];
  let qIndex = 0;
  let score = 0;
  let streak = 0;
  let bestStreak = 0;
  let answered = false;
  let missed = [];
  let results = []; // {flower, wasCorrect}

  function startRound(length) {
    roundLength = length;
    roundFlowers = shuffle(FLOWERS).slice(0, Math.min(length, FLOWERS.length));
    qIndex = 0;
    score = 0;
    streak = 0;
    bestStreak = 0;
    missed = [];
    results = [];
    showScreen("quiz");
    renderQuestion();
  }

  function currentFlower() {
    return roundFlowers[qIndex];
  }

  function renderQuestion() {
    answered = false;
    screens.quiz.classList.remove("is-answered");
    const flower = currentFlower();
    const total = roundFlowers.length;

    document.getElementById("quiz-counter").textContent = `Specimen ${String(qIndex + 1).padStart(2, "0")} / ${total}`;
    document.getElementById("specimen-number").textContent = String(qIndex + 1).padStart(2, "0");
    document.getElementById("progress-fill").style.width = `${(qIndex / total) * 100}%`;
    document.getElementById("quiz-score").textContent = score;

    const streakBadge = document.getElementById("streak-badge");
    if (streak >= 2) {
      streakBadge.hidden = false;
      document.getElementById("streak-count").textContent = streak;
    } else {
      streakBadge.hidden = true;
    }

    const photo = document.getElementById("quiz-photo");
    photo.src = flower.image;
    photo.alt = "Photograph of a wildflower to identify";
    // restart the reveal animation
    photo.classList.remove("specimen-photo");
    void photo.offsetWidth;
    photo.classList.add("specimen-photo");

    const options = shuffle([flower, ...pickDistractors(flower, 3)]);
    const grid = document.getElementById("answer-grid");
    grid.innerHTML = "";
    options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.className = "answer-btn";
      btn.type = "button";
      btn.dataset.id = opt.id;
      btn.innerHTML = `<span>${opt.common}</span><span class="mark"></span>`;
      btn.addEventListener("click", () => selectAnswer(opt, btn));
      grid.appendChild(btn);
    });

    document.getElementById("reveal-panel").hidden = true;
  }

  function selectAnswer(chosen, btnEl) {
    if (answered) return;
    answered = true;
    const flower = currentFlower();
    const isCorrect = chosen.id === flower.id;

    if (isCorrect) {
      score++;
      streak++;
      bestStreak = Math.max(bestStreak, streak);
    } else {
      streak = 0;
      missed.push(flower);
    }
    results.push({ flower, wasCorrect: isCorrect });

    const buttons = Array.from(document.querySelectorAll(".answer-btn"));
    buttons.forEach((b) => {
      b.disabled = true;
      if (b.dataset.id === flower.id) {
        b.classList.add("is-correct");
        b.querySelector(".mark").textContent = "✓";
      } else if (b === btnEl) {
        b.classList.add("is-wrong");
        b.querySelector(".mark").textContent = "✕";
      } else {
        b.classList.add("is-faded");
      }
    });

    const reveal = document.getElementById("reveal-panel");
    const eyebrow = document.getElementById("reveal-eyebrow");
    eyebrow.textContent = isCorrect ? "Correct" : "Not quite";
    eyebrow.className = "reveal-eyebrow " + (isCorrect ? "is-correct" : "is-wrong");
    document.getElementById("reveal-name").textContent = flower.common;
    document.getElementById("reveal-sci").textContent = flower.scientific;
    reveal.hidden = false;
    screens.quiz.classList.add("is-answered");

    document.getElementById("quiz-score").textContent = score;
    if (streak >= 2) {
      document.getElementById("streak-badge").hidden = false;
      document.getElementById("streak-count").textContent = streak;
    }

    if (isCorrect && (streak === 5 || streak === 10 || streak === 20)) {
      burstPetals();
    }
  }

  document.getElementById("btn-next").addEventListener("click", () => {
    qIndex++;
    if (qIndex >= roundFlowers.length) {
      finishRound();
    } else {
      renderQuestion();
    }
  });

  // keyboard support: 1-4 to answer, enter to advance
  document.addEventListener("keydown", (e) => {
    if (screens.quiz.hidden) return;
    if (!answered && ["1", "2", "3", "4"].includes(e.key)) {
      const idx = Number(e.key) - 1;
      const buttons = document.querySelectorAll(".answer-btn");
      if (buttons[idx]) buttons[idx].click();
    } else if (answered && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      document.getElementById("btn-next").click();
    }
  });

  // ---------------- results ----------------
  const RANKS = [
    { min: 0, title: "Trail Newcomer" },
    { min: 0.4, title: "Sprout Spotter" },
    { min: 0.6, title: "Trailblazer" },
    { min: 0.8, title: "Wildflower Whisperer" },
    { min: 0.95, title: "PNW Botany Legend" },
  ];

  function rankFor(pct) {
    let r = RANKS[0];
    for (const rank of RANKS) if (pct >= rank.min) r = rank;
    return r.title;
  }

  function finishRound() {
    const total = roundFlowers.length;
    const pct = total ? score / total : 0;

    document.getElementById("result-rank").textContent = rankFor(pct);
    document.getElementById("result-score-num").textContent = score;
    document.getElementById("result-score-den").textContent = `/${total}`;
    document.getElementById("result-line").textContent =
      missed.length === 0
        ? `A clean sweep — every one of the ${total} wildflowers, correctly named.`
        : `You identified ${score} of ${total} wildflowers correctly. Best streak: ${bestStreak}.`;

    const recap = document.getElementById("result-recap");
    if (missed.length > 0) {
      const uniqueMissed = Array.from(new Map(missed.map((f) => [f.id, f])).values());
      recap.innerHTML = `<p class="result-recap-title">Worth a second look</p><div class="recap-grid"></div>`;
      const grid = recap.querySelector(".recap-grid");
      uniqueMissed.forEach((f) => {
        const item = document.createElement("div");
        item.className = "recap-item was-wrong";
        item.innerHTML = `<img src="${f.image}" alt=""><div class="recap-item-body"><div class="recap-item-name">${f.common}</div><div class="recap-item-sci">${f.scientific}</div></div>`;
        grid.appendChild(item);
      });
    } else {
      recap.innerHTML = "";
    }

    showScreen("result");
    if (pct >= 0.8) burstPetals();
  }

  document.getElementById("btn-again").addEventListener("click", () => startRound(roundLength));
  document.getElementById("btn-change-length").addEventListener("click", () => showScreen("start"));

  // ---------------- start screen ----------------
  const roundChips = document.querySelectorAll(".round-chip");
  roundChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      roundChips.forEach((c) => c.classList.remove("is-selected"));
      chip.classList.add("is-selected");
      roundLength = Number(chip.dataset.rounds);
    });
  });
  document.getElementById("btn-start").addEventListener("click", () => startRound(roundLength));
  document.getElementById("logo-home").addEventListener("click", () => showScreen("start"));

  // ---------------- field guide ----------------
  let guideFilter = "all";
  let guideQuery = "";

  function buildGuideFilters() {
    const colors = Array.from(new Set(FLOWERS.map((f) => f.color))).sort();
    const wrap = document.getElementById("guide-filters");
    const allChip = document.createElement("button");
    allChip.className = "filter-chip is-active";
    allChip.type = "button";
    allChip.textContent = "All";
    allChip.dataset.color = "all";
    wrap.appendChild(allChip);
    colors.forEach((c) => {
      const chip = document.createElement("button");
      chip.className = "filter-chip";
      chip.type = "button";
      chip.textContent = c;
      chip.dataset.color = c;
      wrap.appendChild(chip);
    });
    wrap.addEventListener("click", (e) => {
      const chip = e.target.closest(".filter-chip");
      if (!chip) return;
      wrap.querySelectorAll(".filter-chip").forEach((c) => c.classList.remove("is-active"));
      chip.classList.add("is-active");
      guideFilter = chip.dataset.color;
      renderGuide();
    });
  }

  function renderGuide() {
    const grid = document.getElementById("guide-grid");
    const q = guideQuery.trim().toLowerCase();
    const items = FLOWERS.filter((f) => {
      const matchesColor = guideFilter === "all" || f.color === guideFilter;
      const matchesQuery = !q || f.common.toLowerCase().includes(q) || f.scientific.toLowerCase().includes(q);
      return matchesColor && matchesQuery;
    }).sort((a, b) => a.common.localeCompare(b.common));

    grid.innerHTML = "";
    if (items.length === 0) {
      grid.innerHTML = `<p class="guide-empty">No wildflowers match your search.</p>`;
      return;
    }
    items.forEach((f) => {
      const card = document.createElement("div");
      card.className = "guide-card";
      card.innerHTML = `<img src="${f.image}" alt="${f.common}" loading="lazy"><div class="guide-card-body"><div class="guide-card-name">${f.common}</div><div class="guide-card-sci">${f.scientific}</div></div>`;
      grid.appendChild(card);
    });
  }

  document.getElementById("guide-search").addEventListener("input", (e) => {
    guideQuery = e.target.value;
    renderGuide();
  });

  function openGuide() {
    showScreen("guide");
  }
  document.getElementById("nav-guide").addEventListener("click", openGuide);
  document.getElementById("btn-open-guide").addEventListener("click", openGuide);

  // ---------------- credits modal ----------------
  const modal = document.getElementById("credits-modal");
  function openCredits() {
    modal.hidden = false;
    fetch("images/credits.json")
      .then((r) => r.json())
      .then((data) => {
        const list = document.getElementById("credits-list");
        list.innerHTML = data
          .slice()
          .sort((a, b) => a.common.localeCompare(b.common))
          .map(
            (c) => `<div class="credit-row">
              <span class="credit-name">${c.common}</span>
              <span class="credit-meta">${c.artist ? c.artist + " · " : ""}${c.license || "Wikimedia Commons"}${c.source_page ? ` · <a href="${c.source_page}" target="_blank" rel="noopener">source</a>` : ""}</span>
            </div>`
          )
          .join("");
      })
      .catch(() => {
        document.getElementById("credits-list").innerHTML = "<p>Credits could not be loaded.</p>";
      });
  }
  document.getElementById("nav-credits").addEventListener("click", openCredits);
  document.getElementById("credits-close").addEventListener("click", () => (modal.hidden = true));
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.hidden = true;
  });

  // ---------------- petal confetti ----------------
  const canvas = document.getElementById("petal-canvas");
  const ctx = canvas.getContext("2d");
  let petals = [];
  let petalAnimId = null;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  function burstPetals() {
    if (prefersReducedMotion) return;
    const colors = ["#E0355C", "#C98A2B", "#2F5C42", "#F8F8EE"];
    for (let i = 0; i < 60; i++) {
      petals.push({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * canvas.height * 0.3,
        r: 4 + Math.random() * 5,
        vy: 2 + Math.random() * 2.5,
        vx: -1 + Math.random() * 2,
        rot: Math.random() * Math.PI * 2,
        vr: -0.1 + Math.random() * 0.2,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 0,
      });
    }
    canvas.style.display = "block";
    if (!petalAnimId) petalAnimId = requestAnimationFrame(tickPetals);
  }

  function tickPetals() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    petals.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life++;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.r, p.r * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    petals = petals.filter((p) => p.y < canvas.height + 30 && p.life < 400);
    if (petals.length > 0) {
      petalAnimId = requestAnimationFrame(tickPetals);
    } else {
      petalAnimId = null;
      canvas.style.display = "none";
    }
  }

  // ---------------- init ----------------
  buildGuideFilters();
  renderGuide();
})();
