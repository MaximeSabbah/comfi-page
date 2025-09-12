// ===== 1) Task names (your list) =====
const TASK_NAMES = [
  "bolting","bolting_sat","crouch","crouch_object","hitting","hitting_sat","jump","lifting",
  "lifting_fast","lower","overhead","overhead_front","robot_sanding","robot_welding",
  "sanding","sanding_sat","sit_to_stand","squat","static","upper","walk","walk_front",
  "welding","welding_sat"
];

// ===== 2) Label helpers =====
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

// ===== 3) Build task objects =====
// For testing, point all to the same short clip.
// Later: set src: `static/videos/${name}.mp4` once you add per-task files.
const DEMO_SRC = "static/videos/demo.mp4";
const TASKS = TASK_NAMES.map(name => ({
  id: name,
  title: humanize(name),
  desc: "",
  src: DEMO_SRC,
  poster: "",           // or `static/posters/${name}.jpg`
  tags: [baseTag(name)]
}));

// ===== 4) State & config =====
const DEFAULT_ITEMS_PER_PAGE = 25; // 5×5 panel
let currentPage = 1;
let itemsPerPage = DEFAULT_ITEMS_PER_PAGE;
let filtered = [...TASKS];
let videoObserver = null;

// ===== 5) Helpers =====
function paginate(arr, page, perPage) {
  const start = (page - 1) * perPage;
  return arr.slice(start, start + perPage);
}

// ===== 6) DOM factories =====
function makeTaskColumn(task) {
  const col = document.createElement("div");
  col.className = "column is-full-mobile is-half-tablet is-one-third-desktop is-one-fifth-widescreen";

  const card = document.createElement("div");
  card.className = "card task-card";

  // Media
  const figure = document.createElement("div");
  figure.className = "card-image";
  const wrap = document.createElement("div");
  wrap.className = "video-wrap";

  const video = document.createElement("video");
  video.setAttribute("playsinline", "");
  video.setAttribute("muted", "");
  video.setAttribute("loop", "");
  video.setAttribute("preload", "none");
  video.setAttribute("aria-label", `${task.title} preview`);
  if (task.poster) video.setAttribute("poster", task.poster);
  video.dataset.src = task.src; // lazy-load

  // Hover / tap to play
  video.addEventListener("mouseenter", () => { if (video.readyState > 2) video.play(); });
  video.addEventListener("mouseleave", () => { video.pause(); video.currentTime = 0; });
  video.addEventListener("click", () => {
    if (video.paused) video.play();
    else { video.pause(); video.currentTime = 0; }
  });

  // On-video label
  const vlabel = document.createElement("span");
  vlabel.className = "video-label";
  vlabel.textContent = task.title;

  wrap.appendChild(video);
  wrap.appendChild(vlabel);
  figure.appendChild(wrap);
  card.appendChild(figure);

  // Content
  const content = document.createElement("div");
  content.className = "card-content";
  const media = document.createElement("div");
  media.className = "media";
  const mediaContent = document.createElement("div");
  mediaContent.className = "media-content";

  const title = document.createElement("p");
  title.className = "title is-6";
  title.textContent = task.title;

  const subtitle = document.createElement("p");
  subtitle.className = "content is-size-7";
  subtitle.textContent = task.desc;

  const tagsContainer = document.createElement("div");
  (task.tags || []).forEach(t => {
    const tag = document.createElement("span");
    tag.className = "tag is-light task-badge";
    tag.textContent = t;
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

// ===== 7) Renderers =====
function render() {
  const grid = document.getElementById("task-grid");
  if (!grid) return; // safety
  grid.innerHTML = "";

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

  // Up to 7 page buttons
  const start = Math.max(1, currentPage - 3);
  const end = Math.min(totalPages, start + 6);
  for (let p = start; p <= end; p++) {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.className = "pagination-link" + (p === currentPage ? " is-current" : "");
    a.setAttribute("aria-label", `Goto page ${p}`);
    a.textContent = p;
    a.onclick = () => { currentPage = p; render(); };
    li.appendChild(a);
    list.appendChild(li);
  }
}

// ===== 8) Lazy-load & pause off-screen =====
function setupIntersectionObservers() {
  if (videoObserver) videoObserver.disconnect();
  videoObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const video = entry.target;
      if (entry.isIntersecting) {
        if (!video.dataset.loaded) {
          video.src = video.dataset.src;
          video.dataset.loaded = "1";
        }
      } else {
        video.pause();
        video.currentTime = 0;
      }
    });
  }, { root: null, rootMargin: "200px 0px", threshold: 0.01 });

  document.querySelectorAll("#task-grid video").forEach(v => videoObserver.observe(v));
}

// ===== 9) Wire up controls & boot =====
document.addEventListener("DOMContentLoaded", () => {
  const pps = document.getElementById("per-page-select");
  if (pps) {
    pps.value = String(DEFAULT_ITEMS_PER_PAGE);
    pps.addEventListener("change", (e) => {
      itemsPerPage = parseInt(e.target.value, 10) || DEFAULT_ITEMS_PER_PAGE;
      currentPage = 1;
      render();
    });
  }

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
