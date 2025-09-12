/* ================================================
   Task Gallery — single demo clip + single poster
   File: static/js/tasks-gallery.js
   ================================================ */
"use strict";

/* ---------- 0) CONFIG ---------- */
const DEMO_SRC = "static/videos/demo.mp4";        // same video for all tasks
const GENERIC_POSTER = "static/posters/demo.jpg"; // same poster for all tasks

// Autopreview when visible (muted), and pause/reset when off-screen
const AUTOPREVIEW_ENABLED = true;
const MAX_PLAYING = 4;              // cap concurrent playbacks
const IO_ROOT_MARGIN = "200px 0px"; // pre-load slightly before visible

// Default page size (25 = 5×5 on widescreen)
const DEFAULT_ITEMS_PER_PAGE = 25;

/* ---------- 1) Your tasks ---------- */
const TASK_NAMES = [
  "bolting","bolting_sat","crouch","crouch_object","hitting","hitting_sat","jump","lifting",
  "lifting_fast","lower","overhead","overhead_front","robot_sanding","robot_welding",
  "sanding","sanding_sat","sit_to_stand","squat","static","upper","walk","walk_front",
  "welding","welding_sat"
];

/* ---------- 2) Label helpers ---------- */
const LABEL_OVERRIDES = {
  sit_to_stand: "Sit-to-Stand",
  walk_front: "Walk (front)",
  overhead_front: "Overhead (front)",
  bolting_sat: "Bolting (sat)",
  sanding_sat: "Sanding (sat)",
  welding_sat: "Welding (sat)",
  robot_sanding: "Robot Sanding",
  robot_welding: "Robot Welding"
};
function humanize(name) {
  if (LABEL_OVERRIDES[name]) return LABEL_OVERRIDES[name];
  return name.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}
function baseTag(name) {
  if (name.startsWith("robot_")) return "robot";
  return name.split("_")[0];
}

/* ---------- 3) Build task objects (all use same src/poster) ---------- */
const TASKS = TASK_NAMES.map(name => ({
  id: name,
  title: humanize(name),
  desc: "", // optional per-task text
  src: DEMO_SRC,
  poster: GENERIC_POSTER,
  tags: [baseTag(name)]
}));

/* ---------- 4) State ---------- */
let currentPage = 1;
let itemsPerPage = DEFAULT_ITEMS_PER_PAGE;
let filtered = [...TASKS];
let videoObserver = null;
const playingSet = new Set();

/* ---------- 5) Utilities ---------- */
function paginate(arr, page, perPage) {
  const start = (page - 1) * perPage;
  return arr.slice(start, start + perPage);
}
function createEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text != null) el.textContent = text;
  return el;
}

/* ---------- 6) Make one card ---------- */
function makeTaskColumn(task) {
  const col = createEl(
    "div",
    "column is-full-mobile is-half-tablet is-one-third-desktop is-one-fifth-widescreen"
  );

  const card = createEl("div", "card task-card");

  // Media
  const figure = createEl("div", "card-image");
  const wrap = createEl("div", "video-wrap");

  const video = document.createElement("video");
  // Attributes
  video.setAttribute("playsinline", "");
  video.setAttribute("muted", "");
  video.setAttribute("loop", "");
  video.setAttribute("preload", "none");
  video.setAttribute("aria-label", `${task.title} preview`);
  if (task.poster) video.setAttribute("poster", task.poster);
  // Properties (iOS/Safari)
  video.muted = true;
  video.playsInline = true;

  // Lazy-load source on intersection
  video.dataset.src = task.src;

  // Hover / tap controls
  video.addEventListener("mouseenter", () => { if (video.readyState > 2) safePlay(video); });
  video.addEventListener("mouseleave", () => { safeStop(video); });
  video.addEventListener("click", () => {
    if (video.paused) safePlay(video); else safeStop(video);
  });

  // On-video label
  const vlabel = createEl("span", "video-label", task.title);

  wrap.appendChild(video);
  wrap.appendChild(vlabel);
  figure.appendChild(wrap);
  card.appendChild(figure);

  // Content under the video
  const content = createEl("div", "card-content");
  const media = createEl("div", "media");
  const mediaContent = createEl("div", "media-content");

  const title = createEl("p", "title is-6", task.title);
  const subtitle = createEl("p", "content is-size-7", task.desc);

  const tagsContainer = createEl("div", null);
  (task.tags || []).forEach(t => {
    const tag = createEl("span", "tag is-light task-badge", t);
    tagsContainer.appendChild(tag);
  });

  mediaContent.appendChild(title);
  if (task.desc) mediaContent.appendChild(subtitle);
  mediaContent.appendChild(tagsContainer);
  media.appendChild(mediaContent);
  content.appendChild(media);
  card.appendChild(content);

  col.appendChild(card);
  return col;
}

/* ---------- 7) Renderers ---------- */
function render() {
  const grid = document.getElementById("task-grid");
  if (!grid) return;
  grid.innerHTML = "";

  // stop any playing videos before re-render
  playingSet.forEach(v => { try { v.pause(); } catch {} });
  playingSet.clear();

  const pageItems = paginate(filtered, currentPage, itemsPerPage);
  pageItems.forEach(task => grid.appendChild(makeTaskColumn(task)));

  renderPagination();
  setupIntersectionObservers();
}

function renderPagination() {
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const prevBtn = document.getElementById("prev-page");
  const nextBtn = document.getElementById("next-page");
  const list = document.getElementById("pagination-list");
  if (!prevBtn || !nextBtn || !list) return;

  list.innerHTML = "";
  prevBtn.disabled = (currentPage === 1);
  nextBtn.disabled = (currentPage === totalPages);

  prevBtn.onclick = () => { if (currentPage > 1) { currentPage--; render(); } };
  nextBtn.onclick = () => { if (currentPage < totalPages) { currentPage++; render(); } };

  const start = Math.max(1, currentPage - 3);
  const end = Math.min(totalPages, start + 6);
  for (let p = start; p <= end; p++) {
    const li = document.createElement("li");
    const a = createEl("a", "pagination-link" + (p === currentPage ? " is-current" : ""), String(p));
    a.setAttribute("aria-label", `Goto page ${p}`);
    a.onclick = () => { currentPage = p; render(); };
    li.appendChild(a);
    list.appendChild(li);
  }
}

/* ---------- 8) Autoplay & lazy-load ---------- */
function safePlay(video) {
  if (playingSet.has(video)) return;
  if (playingSet.size >= MAX_PLAYING) {
    const first = playingSet.values().next().value;
    if (first) safeStop(first);
  }
  video.play().then(() => {
    playingSet.add(video);
  }).catch(() => {
    // If autoplay is blocked, user interaction (hover/click) still works.
  });
}
function safeStop(video) {
  try {
    video.pause();
    video.currentTime = 0;
  } catch {}
  playingSet.delete(video);
}

function setupIntersectionObservers() {
  if (videoObserver) videoObserver.disconnect();

  videoObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const video = entry.target;

      if (entry.isIntersecting) {
        // Lazy-attach src once
        if (!video.dataset.loaded) {
          video.src = video.dataset.src;
          video.dataset.loaded = "1";

          if (AUTOPREVIEW_ENABLED) {
            const tryPlay = () => { safePlay(video); };
            video.addEventListener("canplay", tryPlay, { once: true });
            video.load(); // fetch metadata -> canplay
          }
        } else if (AUTOPREVIEW_ENABLED) {
          safePlay(video);
        }
      } else {
        // Off-screen: stop
        safeStop(video);
      }
    });
  }, { root: null, rootMargin: IO_ROOT_MARGIN, threshold: 0.01 });

  document.querySelectorAll("#task-grid video").forEach(v => videoObserver.observe(v));
}

/* ---------- 9) Wire up controls & boot ---------- */
document.addEventListener("DOMContentLoaded", () => {
  // Items per page
  const pps = document.getElementById("per-page-select");
  if (pps) {
    pps.value = String(DEFAULT_ITEMS_PER_PAGE);
    pps.addEventListener("change", (e) => {
      itemsPerPage = parseInt(e.target.value, 10) || DEFAULT_ITEMS_PER_PAGE;
      currentPage = 1;
      render();
    });
  }

  // Search
  const search = document.getElementById("task-search");
  if (search) {
    search.addEventListener("input", (e) => {
      const q = e.target.value.trim().toLowerCase();
      filtered = TASKS.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.desc || "").toLowerCase().includes(q) ||
        (t.tags || []).some(tag => tag.toLowerCase().includes(q))
      );
      currentPage = 1;
      render();
    });
  }

  render();
});
