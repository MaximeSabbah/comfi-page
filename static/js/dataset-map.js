(() => {
  "use strict";
  const VERSION = "1.2";
  console.log(`✅ dataset-map.js v${VERSION} running`);

  /* ---------- Data ---------- */
  const SUBJECT_IDS = ["1012","1118","1508","1602","1847","2112","2198","2307","3361","4162","4216","4279","4509","4612","4665","4687","4801","4827"];
  const DS_TASKS = [
    "bolting","bolting_sat","crouch","crouch_object","hitting","hitting_sat","jump","lifting",
    "lifting_fast","lower","overhead","robot_sanding","robot_welding",
    "sanding","sanding_sat","sit_to_stand","squat","static","upper","walk","walk_front",
    "welding","welding_sat"
  ];

  const MODS = [
    { id:"videos", title:"Videos", rate:"≈ 40 Hz per camera",
      desc:"RGB videos from multiple synchronized viewpoints.",
      paths:[
        "COMFI/<ID>/<task>/camera_0.mp4",
        "COMFI/<ID>/<task>/camera_2.mp4",
        "COMFI/<ID>/<task>/camera_4.mp4",
        "COMFI/<ID>/<task>/camera_6.mp4"
      ]},
    { id:"mocap", title:"Mocap", rate:"C3D 100 Hz; aligned CSV 40 Hz",
      desc:"Optical motion capture: markers, model markers, joint centers & angles.",
      paths:[
        "COMFI/<ID>/<task>/{task}.c3d",
        "COMFI/<ID>/<task>/raw/*.csv",
        "COMFI/<ID>/<task>/aligned/joint_angles.csv",
        "COMFI/<ID>/<task>/aligned/joint_center.csv",
        "COMFI/<ID>/<task>/aligned/markers.csv",
        "COMFI/<ID>/<task>/aligned/markers_model.csv",
        "COMFI/<ID>/<ID>.vsk"
      ]},
    { id:"forces", title:"Forces & IMU", rate:"Raw 1000 Hz → aligned 40 Hz",
      desc:"Wearable/environment force-IMU signals; raw & time-aligned streams.",
      paths:[
        "COMFI/<ID>/<task>/raw/{task}_devices.csv",
        "COMFI/<ID>/<task>/aligned/{task}_devices.csv"
      ]},
    { id:"robot", title:"Robot", rate:"Raw ~200 Hz → aligned 40 Hz",
      desc:"Robot topics for sanding/welding tasks (ROS bag + aligned CSV).",
      paths:[
        "COMFI/<ID>/raw/robot_sanding.bag",
        "COMFI/<ID>/raw/robot_welding.bag",
        "COMFI/<ID>/aligned/robot_sanding.csv",
        "COMFI/<ID>/aligned/robot_welding.csv"
      ]},
    { id:"cam_params", title:"Cam Params", rate:"",
      desc:"Per-subject camera intrinsic & extrinsic parameters + calibration images.",
      paths:[
        "COMFI/<ID>/cam_params.yaml",
        "COMFI/<ID>/images/*.png"
      ]},
    { id:"metadata", title:"Metadata", rate:"",
      desc:"Per-subject descriptors and scaled URDF.",
      paths:[
        "COMFI/<ID>/metadata/<ID>.yaml",
        "COMFI/<ID>/metadata/<ID>_scaled.urdf"
      ]}
  ];

  /* ---------- Utils ---------- */
  const $ = sel => document.querySelector(sel);
  function resolvePath(s, id, task){
    return s
      .replace(/<ID>/g, id)
      .replace(/<id>/g, id)
      .replace(/<task>/g, task)
      .replace(/\{task\}/g, task);
  }
  async function copyText(text, btn){
    try { await navigator.clipboard.writeText(text); btn.textContent = "Copied!"; }
    catch { btn.textContent = "Copy failed"; }
    finally { setTimeout(() => (btn.textContent = "Copy"), 1100); }
  }

  /* ---------- SVG diagram ---------- */
  function buildSVG(activeId){
    const wrap = $("#ds-svg-wrap");
    if (!wrap) { console.warn("#ds-svg-wrap not found"); return; }
    wrap.innerHTML = "";

    const W = 1100, H = 420;
    const rootX = W/2, rootY = 60, rootW = 140, rootH = 44;

    const rowY = 220, boxW = 170, boxH = 56;
    const cols = MODS.length, margin = 30;
    const totalWidth = cols*boxW + (cols-1)*margin;
    const startX = (W - totalWidth)/2 + boxW/2;

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.style.display = "block";

    nodeBox(svg, rootX, rootY, rootW, rootH, "COMFI", "root", activeId === "root");
    MODS.forEach((m, i) => {
      const cx = startX + i*(boxW + margin);
      line(svg, rootX, rootY + rootH/2, cx, rowY - boxH/2);
    });

    MODS.forEach((m, i) => {
      const cx = startX + i*(boxW + margin);
      const g = nodeBox(svg, cx, rowY, boxW, boxH, m.title, m.id, activeId === m.id);
      g.addEventListener("mouseenter", () => highlightNode(svg, m.id));
      g.addEventListener("mouseleave", () => highlightNode(svg, null));
      g.addEventListener("click", () => setActiveMod(m.id));
    });

    wrap.appendChild(svg);
    highlightNode(svg, activeId || "videos");
  }

  function nodeBox(svg, cx, cy, w, h, label, id, active){
    const svgNS = svg.namespaceURI;
    const g = document.createElementNS(svgNS, "g");
    g.classList.add("ds-node");
    g.dataset.id = id;

    const rect = document.createElementNS(svgNS, "rect");
    rect.setAttribute("x", cx - w/2);
    rect.setAttribute("y", cy - h/2);
    rect.setAttribute("width", w);
    rect.setAttribute("height", h);
    rect.setAttribute("rx", 10);
    rect.setAttribute("ry", 10);
    g.appendChild(rect);

    const text = document.createElementNS(svgNS, "text");
    text.setAttribute("x", cx);
    text.setAttribute("y", cy + 5);
    text.setAttribute("text-anchor", "middle");
    text.textContent = label;
    g.appendChild(text);

    if (active) g.classList.add("active");
    svg.appendChild(g);
    return g;
  }

  function line(svg, x1, y1, x2, y2){
    const l = document.createElementNS(svg.namespaceURI, "line");
    l.setAttribute("x1", x1);
    l.setAttribute("y1", y1);
    l.setAttribute("x2", x2);
    l.setAttribute("y2", y2);
    l.setAttribute("class", "ds-connector");
    svg.appendChild(l);
  }

  function highlightNode(svg, id){
    svg.querySelectorAll(".ds-node").forEach(n => n.classList.toggle("active", n.dataset.id === id));
  }

  /* ---------- Details panel ---------- */
  function renderDetails(modId){
    const subjSel = $("#ds-subject"), taskSel = $("#ds-task");
    if (!subjSel || !taskSel) return;
    const subj = subjSel.value || "<ID>";
    const task = taskSel.value || "<task>";

    const mod = MODS.find(m => m.id === modId) || MODS[0];
    const title = $("#ds-details-title");
    const rate = $("#ds-details-rate");
    const desc = $("#ds-details-desc");
    const box = $("#ds-details-paths");
    if (!title || !rate || !desc || !box) return;

    title.textContent = mod.title;
    rate.textContent = mod.rate || "";
    desc.textContent = mod.desc || "";
    box.innerHTML = "";

    mod.paths.forEach(p => {
      const resolved = resolvePath(p, subj, task);
      const row = document.createElement("div");
      row.className = "ds-path-row";
      const code = document.createElement("code");
      code.className = "ds-path";
      code.textContent = resolved;
      const btn = document.createElement("button");
      btn.className = "ds-copy";
      btn.textContent = "Copy";
      btn.onclick = () => copyText(resolved, btn);
      row.appendChild(code); row.appendChild(btn);
      box.appendChild(row);
    });
  }

  /* ---------- Wiring ---------- */
  let activeMod = "videos";
  function setActiveMod(id){
    activeMod = id;
    buildSVG(activeMod);
    renderDetails(activeMod);
  }

  document.addEventListener("DOMContentLoaded", () => {
    const subjSel = $("#ds-subject");
    const taskSel = $("#ds-task");
    if (!subjSel || !taskSel) { console.warn("Dataset map controls not found."); return; }

    SUBJECT_IDS.forEach(s => {
      const o = document.createElement("option"); o.value = s; o.textContent = s; subjSel.appendChild(o);
    });
    subjSel.value = SUBJECT_IDS.includes("1847") ? "1847" : SUBJECT_IDS[0];

    DS_TASKS.forEach(t => {
      const o = document.createElement("option"); o.value = t; o.textContent = t; taskSel.appendChild(o);
    });
    taskSel.value = "bolting";

    subjSel.addEventListener("change", () => renderDetails(activeMod));
    taskSel.addEventListener("change", () => renderDetails(activeMod));

    buildSVG(activeMod);
    renderDetails(activeMod);
  });
})();
