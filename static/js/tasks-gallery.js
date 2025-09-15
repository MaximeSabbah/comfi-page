/* ==========================================================
   Task Gallery — Search + (All | 10-per-page)
   Auto-play on view (muted, loop), pause off-screen.
   Uses one demo video + one poster for EVERY task.
   ========================================================== */
"use strict";


/* ---- Task list ---- */
const TASK_NAMES = [
  "bolting","bolting_sat","crouch","crouch_object","hitting","hitting_sat","jump","lifting",
  "lifting_fast","lower","overhead","robot_sanding","robot_welding",
  "sanding","sanding_sat","sit_to_stand","squat","static","upper","walk","walk_front",
  "welding","welding_sat"
];

/* ---- Labels ---- */
const LABEL_OVERRIDES = {
  sit_to_stand: "Sit-to-Stand",
  walk_front: "Walk (front)",
  bolting_sat: "Bolting (sat)",
  sanding_sat: "Sanding (sat)",
  welding_sat: "Welding (sat)",
  hitting_sat: "Hitting (sat)",
  robot_sanding: "Robot Sanding",
  robot_welding: "Robot Welding",
  lifting_fast: "Lifting (fast)",
  crouch_object: "Crouch (object)"
};

const humanize = n => LABEL_OVERRIDES[n] ?? n.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
const baseTag  = n => n.startsWith("robot_") ? "robot" : n.split("_")[0];

/* ---- Build task objects (per-task assets) ---- */
const TASKS = TASK_NAMES.map(name => ({
  id: name,
  title: humanize(name),
  src: `static/videos/${name}_preview.mp4`,
  poster: `static/posters/${name}_poster.jpg`,
  tags: [baseTag(name)]
}));

/* ---- State ---- */
const MODE_ALL   = "all";
const MODE_PAGED = "paged";
let mode = MODE_ALL;          // default: All tasks
let itemsPerPage = 10;        // fixed 10 per page
let currentPage = 1;
let filtered = [...TASKS];

let videoObserver = null;
const playingSet = new Set();
const MAX_PLAYING = 6;        // cap concurrent playbacks
const IO_ROOT_MARGIN = "200px 0px";

/* ---- Helpers ---- */
function paginate(arr, page, perPage) {
  const start = (page - 1) * perPage;
  return arr.slice(start, start + perPage);
}
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

/* ---- Card factory ---- */
function makeTaskCard(task) {
  const col   = el("div", "column is-full-mobile is-half-tablet is-one-third-desktop is-one-fifth-widescreen");
  const card  = el("div", "card task-card");

  // Media
  const figure = el("div", "card-image");
  const wrap   = el("div", "video-wrap");

  const video = document.createElement("video");
  video.setAttribute("playsinline", "");
  video.setAttribute("muted", "");
  video.setAttribute("loop", "");
  video.setAttribute("preload", "none");                 // attach src on view
  video.setAttribute("aria-label", `${task.title} preview`);
  if (task.poster) video.setAttribute("poster", task.poster);
  video.muted = true; video.playsInline = true; video.loop = true;

  // Lazy src; start when we can
  video.dataset.src = task.src;
  video.addEventListener("canplay", () => { safePlay(video); }, { once: true });

  // Optional hover/tap
  video.addEventListener("mouseenter", () => { if (video.readyState > 2) safePlay(video); });
  video.addEventListener("mouseleave", () => { safeStop(video); });
  video.addEventListener("click", () => {
    if (video.paused) safePlay(video); else safeStop(video);
  });

  const vlabel = el("span", "video-label", task.title);

  wrap.appendChild(video);
  wrap.appendChild(vlabel);
  figure.appendChild(wrap);
  card.appendChild(figure);

  // Minimal text
  const content = el("div", "card-content");
  const media   = el("div", "media");
  const mcont   = el("div", "media-content");
  mcont.appendChild(el("p", "title is-6", task.title));
  const tagsBox = el("div");
  (task.tags || []).forEach(t => tagsBox.appendChild(el("span", "tag is-light task-badge", t)));
  mcont.appendChild(tagsBox);
  media.appendChild(mcont);
  content.appendChild(media);
  card.appendChild(content);

  col.appendChild(card);
  return col;
}

/* ---- Renderers ---- */
function itemsToRender() {
  return mode === MODE_ALL ? filtered : paginate(filtered, currentPage, itemsPerPage);
}

function render() {
  const grid = document.getElementById("task-grid");
  if (!grid) return;
  grid.innerHTML = "";

  // stop any playing videos before re-render
  playingSet.forEach(v => { try { v.pause(); } catch {} });
  playingSet.clear();

  itemsToRender().forEach(task => grid.appendChild(makeTaskCard(task)));

  renderPagination();
  setupVideoObserver();
}

function renderPagination() {
  const pag = document.getElementById("task-pagination");
  if (!pag) return;

  if (mode === MODE_ALL) {
    pag.style.display = "none";
    return;
  }

  pag.style.display = "";
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  currentPage = Math.min(currentPage, totalPages);

  const prevBtn = document.getElementById("prev-page");
  const nextBtn = document.getElementById("next-page");
  const list = document.getElementById("pagination-list");
  list.innerHTML = "";

  prevBtn.disabled = (currentPage === 1);
  nextBtn.disabled = (currentPage === totalPages);

  prevBtn.onclick = () => { if (currentPage > 1) { currentPage--; render(); } };
  nextBtn.onclick = () => { if (currentPage < totalPages) { currentPage++; render(); } };

  // Show up to 7 page buttons
  const start = Math.max(1, currentPage - 3);
  const end = Math.min(totalPages, start + 6);
  for (let p = start; p <= end; p++) {
    const li = document.createElement("li");
    const a = el("a", "pagination-link" + (p === currentPage ? " is-current" : ""), String(p));
    a.setAttribute("aria-label", `Goto page ${p}`);
    a.onclick = () => { currentPage = p; render(); };
    li.appendChild(a);
    list.appendChild(li);
  }
}

/* ---- Autoplay + lazy-load for videos ---- */
function setupVideoObserver() {
  if (videoObserver) videoObserver.disconnect();

  videoObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const video = entry.target;
      if (entry.isIntersecting) {
        if (!video.dataset.loaded) {
          video.src = video.dataset.src;
          video.dataset.loaded = "1";
          video.load(); // triggers canplay -> safePlay
        } else {
          safePlay(video);
        }
      } else {
        safeStop(video);
      }
    });
  }, { root: null, rootMargin: IO_ROOT_MARGIN, threshold: 0.01 });

  document.querySelectorAll("#task-grid video").forEach(v => videoObserver.observe(v));
}

function safePlay(video) {
  if (playingSet.has(video)) return;
  if (playingSet.size >= MAX_PLAYING) {
    const first = playingSet.values().next().value;
    if (first) safeStop(first);
  }
  video.play().then(() => { playingSet.add(video); }).catch(() => {});
}
function safeStop(video) {
  try { video.pause(); video.currentTime = 0; } catch {}
  playingSet.delete(video);
}

/* ---- Wire up search + mode toggle + visibility ---- */
function applySearch(q) {
  const query = q.trim().toLowerCase();
  filtered = TASKS.filter(t =>
    t.title.toLowerCase().includes(query) ||
    (t.tags || []).some(tag => tag.toLowerCase().includes(query))
  );
  currentPage = 1;
  render();
}

function hookVisibility() {
  document.addEventListener("visibilitychange", () => {
    const vids = document.querySelectorAll("#task-grid video");
    if (document.hidden) {
      vids.forEach(v => { try { v.pause(); } catch {} });
      playingSet.clear();
    } else {
      vids.forEach(v => { if (v.muted) v.play().catch(() => {}); });
    }
  });
}

/* ---- Boot ---- */
document.addEventListener("DOMContentLoaded", () => {
  // View mode selector (All | Paginated 10-by-10)
  const viewSel = document.getElementById("view-mode");
  if (viewSel) {
    viewSel.value = MODE_ALL;
    viewSel.addEventListener("change", (e) => {
      mode = (e.target.value === "paged") ? MODE_PAGED : MODE_ALL;
      currentPage = 1;
      render();
    });
  }

  // Search
  const search = document.getElementById("task-search");
  if (search) {
    search.addEventListener("input", (e) => applySearch(e.target.value));
  }

  hookVisibility();
  render();
});
