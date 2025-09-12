/* ================================================
   Task Gallery — ALL VISIBLE, AUTO-PLAY, LOOP
   Uses one demo video + one poster for every task
   ================================================ */
"use strict";

/* ---- Config (your files) ---- */
const DEMO_SRC = "static/videos/demo.mp4";        // same clip for all tasks
const GENERIC_POSTER = "static/posters/demo.jpg"; // same poster for all tasks

/* ---- Task list ---- */
const TASK_NAMES = [
  "bolting","bolting_sat","crouch","crouch_object","hitting","hitting_sat","jump","lifting",
  "lifting_fast","lower","overhead","overhead_front","robot_sanding","robot_welding",
  "sanding","sanding_sat","sit_to_stand","squat","static","upper","walk","walk_front",
  "welding","welding_sat"
];

/* ---- Labels ---- */
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
const humanize = n => LABEL_OVERRIDES[n] ?? n.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
const baseTag  = n => n.startsWith("robot_") ? "robot" : n.split("_")[0];

/* ---- Build task objects ---- */
const TASKS = TASK_NAMES.map(name => ({
  id: name,
  title: humanize(name),
  src: DEMO_SRC,
  poster: GENERIC_POSTER,
  tags: [baseTag(name)]
}));

/* ---- Dom helpers ---- */
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

/* ---- Make one card (auto-play video) ---- */
function makeTaskCard(task) {
  const col   = el("div", "column is-full-mobile is-half-tablet is-one-third-desktop is-one-fifth-widescreen");
  const card  = el("div", "card task-card");

  // Media
  const figure = el("div", "card-image");
  const wrap   = el("div", "video-wrap");

  const video = document.createElement("video");
  // Attributes for frictionless autoplay on all browsers
  video.setAttribute("playsinline", "");
  video.setAttribute("muted", "");
  video.setAttribute("loop", "");
  video.setAttribute("autoplay", "");   // also set the property below
  video.setAttribute("preload", "auto");
  video.setAttribute("aria-label", `${task.title} preview`);
  if (task.poster) video.setAttribute("poster", task.poster);

  // Properties (Safari/iOS are picky)
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.autoplay = true;

  // Source now (no lazy-load since we want instant autoplay)
  video.src = task.src;

  // Start playing as soon as the browser can
  video.addEventListener("canplay", () => {
    video.play().catch(() => {/* if blocked, user hover/click will start it */});
  }, { once: true });

  // Hover/tap keep working
  video.addEventListener("mouseenter", () => { if (video.readyState > 2) video.play().catch(() => {}); });
  video.addEventListener("mouseleave", () => { video.pause(); video.currentTime = 0; });
  video.addEventListener("click", () => {
    if (video.paused) video.play().catch(() => {}); else { video.pause(); video.currentTime = 0; }
  });

  // Overlay label
  const vlabel = el("span", "video-label", task.title);

  wrap.appendChild(video);
  wrap.appendChild(vlabel);
  figure.appendChild(wrap);
  card.appendChild(figure);

  // Text under the video
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

/* ---- Render everything (no pagination) ---- */
function renderAll() {
  const grid = document.getElementById("task-grid");
  if (!grid) return;
  grid.innerHTML = "";
  TASKS.forEach(task => grid.appendChild(makeTaskCard(task)));
}

/* ---- Optional: filter box support (if present) ---- */
function hookSearch() {
  const search = document.getElementById("task-search");
  if (!search) return;
  search.addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    const cards = Array.from(document.querySelectorAll("#task-grid .card"));
    cards.forEach(card => {
      const title = card.querySelector(".title")?.textContent.toLowerCase() ?? "";
      const tags  = Array.from(card.querySelectorAll(".tag")).map(t => t.textContent.toLowerCase()).join(" ");
      const show  = title.includes(q) || tags.includes(q);
      card.parentElement.style.display = show ? "" : "none"; // hide column
    });
  });
}

/* ---- Pause when tab hidden; resume when visible ---- */
function hookVisibility() {
  document.addEventListener("visibilitychange", () => {
    const vids = document.querySelectorAll("#task-grid video");
    if (document.hidden) {
      vids.forEach(v => { try { v.pause(); } catch {} });
    } else {
      vids.forEach(v => { if (v.muted) v.play().catch(() => {}); });
    }
  });
}

/* ---- Boot ---- */
document.addEventListener("DOMContentLoaded", () => {
  renderAll();
  hookSearch();
  hookVisibility();
});
