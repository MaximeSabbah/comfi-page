(() => {
  "use strict";
  const VERSION = "2.2";
  console.log(`✅ dataset-map.js v${VERSION}`);

  /* --- Data --- */
  const SUBJECT_IDS = ["1012","1118","1508","1602","1847","2112","2198","2307","3361","4162","4216","4279","4509","4612","4665","4687","4801","4827"];
  const DS_TASKS = [
    "bolting","bolting_sat","crouch","crouch_object","hitting","hitting_sat","jump","lifting",
    "lifting_fast","lower","overhead","robot_sanding","robot_welding",
    "sanding","sanding_sat","sit_to_stand","squat","static","upper","walk","walk_front",
    "welding","welding_sat"
  ];

  // Two-row layout → avoids crowding + crossing
  // row: 0 = top row (between root and bottom row), 1 = bottom row
  const MODS = [
    { id:"videos",     title:"Videos",     rate:"≈ 40 Hz per camera",
      desc:"RGB videos from multiple synchronized viewpoints.",
      row:0,
      paths:[
        "COMFI/<ID>/<task>/camera_0.mp4",
        "COMFI/<ID>/<task>/camera_2.mp4",
        "COMFI/<ID>/<task>/camera_4.mp4",
        "COMFI/<ID>/<task>/camera_6.mp4"
      ]},
    { id:"forces",     title:"Forces",     rate:"Raw 1000 Hz → aligned 40 Hz",
      desc:"Force signals only (no IMU). Raw high-rate data and time-aligned CSV.",
      row:0,
      paths:[
        "COMFI/<ID>/<task>/raw/{task}_devices.csv",
        "COMFI/<ID>/<task>/aligned/{task}_devices.csv"
      ]},
    { id:"cam_params", title:"Cam Params", rate:"",
      desc:"Per-subject camera intrinsics/extrinsics and calibration images.",
      row:0,
      paths:[
        "COMFI/<ID>/cam_params.yaml",
        "COMFI/<ID>/images/*.png"
      ]},
    { id:"mocap",      title:"Mocap",      rate:"C3D 100 Hz; aligned CSV 40 Hz",
      desc:"Optical motion capture: markers, model markers, joint centers & angles.",
      row:1,
      paths:[
        "COMFI/<ID>/<task>/{task}.c3d",
        "COMFI/<ID>/<task>/raw/*.csv",
        "COMFI/<ID>/<task>/aligned/joint_angles.csv",
        "COMFI/<ID>/<task>/aligned/joint_center.csv",
        "COMFI/<ID>/<task>/aligned/markers.csv",
        "COMFI/<ID>/<task>/aligned/markers_model.csv",
        "COMFI/<ID>/<ID>.vsk"
      ]},
    { id:"robot",      title:"Robot",      rate:"Raw ~200 Hz → aligned 40 Hz",
      desc:"Robot topics for sanding/welding tasks (ROS bag + aligned CSV).",
      row:1,
      paths:[
        "COMFI/<ID>/raw/robot_sanding.bag",
        "COMFI/<ID>/raw/robot_welding.bag",
        "COMFI/<ID>/aligned/robot_sanding.csv",
        "COMFI/<ID>/aligned/robot_welding.csv"
      ]},
    { id:"metadata",   title:"Metadata",   rate:"",
      desc:"Per-subject descriptors and scaled URDF.",
      row:1,
      paths:[
        "COMFI/<ID>/metadata/<ID>.yaml",
        "COMFI/<ID>/metadata/<ID>_scaled.urdf"
      ]}
  ];

  /* --- Utils --- */
  const $ = s => document.querySelector(s);
  function resolvePath(s, id, task){
    return s.replace(/<ID>/g,id).replace(/<id>/g,id).replace(/<task>/g,task).replace(/\{task\}/g,task);
  }
  async function copyText(text, btn){
    try { await navigator.clipboard.writeText(text); btn.textContent = "Copied!"; }
    catch { btn.textContent = "Copy failed"; }
    finally { setTimeout(()=>btn.textContent="Copy", 1100); }
  }

  /* --- Layout constants (tweak here) --- */
  const NODE_W = 180;
  const NODE_H = 56;
  const ROOT_Y = 100;
  const GAP_Y  = 120;     // vertical gap root→top row and between rows
  const MARGIN_X_MIN = 140; // side margins to avoid cropping
  const CANVAS_MIN_H = 560;

  /* --- Drawing --- */
  let svg, nodes = {}, pop;

  function buildSVG(){
    nodes = {};
    const wrap = $("#ds-svg-wrap"); if (!wrap) return;
    wrap.innerHTML = "";

    const W = Math.max(1200, wrap.clientWidth + 300); // virtual width; plenty of side room
    const H = Math.max(CANVAS_MIN_H, ROOT_Y + GAP_Y*2 + 200);

    svg = document.createElementNS("http://www.w3.org/2000/svg","svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("width","100%");
    svg.setAttribute("height","100%");
    svg.style.display = "block";

    const rootX = W/2;
    addNode({id:"root", title:"COMFI"}, rootX, ROOT_Y, true);

    // Split by rows and space evenly per row
    const top = MODS.filter(m=>m.row===0);
    const bot = MODS.filter(m=>m.row===1);

    placeRow(top, rootX, ROOT_Y + GAP_Y, W);
    placeRow(bot, rootX, ROOT_Y + GAP_Y*2, W);

    // Connectors as gentle cubic curves landing on top edge of child
    MODS.forEach(m=>{
      const ch = nodes[m.id];
      addCurve(rootX, ROOT_Y + NODE_H/2, ch.cx, ch.cy - NODE_H/2);
    });

    wrap.appendChild(svg);
  }

  function placeRow(arr, rootX, y, W){
    const marginX = Math.max(MARGIN_X_MIN, W*0.08);
    const span = (W - 2*marginX) / (arr.length - 1);
    arr.forEach((m, i) => {
      const cx = (arr.length===1) ? rootX : marginX + i*span;
      addNode(m, cx, y, false);
    });
  }

  function addNode(m, cx, cy, isRoot){
    const g = document.createElementNS(svg.namespaceURI, "g");
    g.classList.add("ds-node");
    g.dataset.id = m.id;

    const rect = document.createElementNS(svg.namespaceURI, "rect");
    rect.setAttribute("x", cx - NODE_W/2);
    rect.setAttribute("y", cy - NODE_H/2);
    rect.setAttribute("width", NODE_W);
    rect.setAttribute("height", NODE_H);
    g.appendChild(rect);

    const text = document.createElementNS(svg.namespaceURI, "text");
    text.setAttribute("x", cx);
    text.setAttribute("y", cy + 5);
    text.setAttribute("text-anchor","middle");
    text.textContent = m.title || "COMFI";
    g.appendChild(text);

    svg.appendChild(g);

    if (!isRoot){
      g.addEventListener("click", () => {
        activate(m.id);
        showPopover(m, cx, cy);
      });
    }
    nodes[m.id] = { g, rect, cx, cy, row: m.row };
  }

  function addCurve(x1,y1,x2,y2){
    // cubic Bezier: start vertical drop, then fan to child top
    const dy = Math.abs(y2 - y1);
    const c1x = x1,           c1y = y1 + Math.min(60, dy*0.4);
    const c2x = x2,           c2y = y2 - Math.min(60, dy*0.4);
    const path = document.createElementNS(svg.namespaceURI, "path");
    path.setAttribute("d", `M ${x1} ${y1} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x2} ${y2}`);
    path.setAttribute("class","ds-connector");
    svg.appendChild(path);
  }

  function activate(id){
    Object.values(nodes).forEach(n => n.g.classList.toggle("active", n.g.dataset.id===id));
  }

  /* --- Popover positioning (never hides other nodes) --- */
  function showPopover(mod, cx, cy){
    const wrap = $("#ds-svg-wrap");
    if (pop) pop.remove();
    pop = document.createElement("div");
    pop.className = "ds-pop";
    pop.dataset.arrow = (mod.row===0 ? "down" : "up"); // arrow direction

    const header = document.createElement("div");
    header.className = "ds-pop-header";
    header.textContent = mod.title;
    const rate = document.createElement("span"); rate.className = "ds-rate"; rate.textContent = mod.rate || "";
    header.appendChild(rate);

    const body = document.createElement("div"); body.className="ds-pop-body";
    const desc = document.createElement("div"); desc.className="ds-desc"; desc.textContent = mod.desc || "";
    body.appendChild(desc);

    const subj = $("#ds-subject").value || "<ID>";
    const task = $("#ds-task").value || "<task>";
    mod.paths.forEach(p=>{
      const resolved = resolvePath(p, subj, task);
      const row = document.createElement("div"); row.className="ds-path-row";
      const code = document.createElement("code"); code.className="ds-path"; code.textContent=resolved;
      const btn = document.createElement("button"); btn.className="ds-copy"; btn.textContent="Copy";
      btn.onclick = ()=>copyText(resolved, btn);
      row.appendChild(code); row.appendChild(btn); body.appendChild(row);
    });

    pop.appendChild(header); pop.appendChild(body);
    wrap.appendChild(pop);

    positionPopover(pop, nodes[mod.id]);
    window.addEventListener("resize", ()=>positionPopover(pop, nodes[mod.id]));
    wrap.addEventListener("scroll", ()=>positionPopover(pop, nodes[mod.id]), { passive:true });
  }

  function positionPopover(pop, node){
    const wrap = $("#ds-svg-wrap");
    const nbox = node.g.getBoundingClientRect();
    const wbox = wrap.getBoundingClientRect();

    const popW = pop.offsetWidth;
    const gap = 14;

    // Preferred y: between rows for top row; below bottom row for bottom row
    let top;
    if (node.row === 0){
      // place midway between top & bottom rows
      top = nbox.bottom - wbox.top + gap;
      pop.dataset.arrow = "down";
    } else {
      // place below the bottom row (so it never hides that row)
      top = nbox.bottom - wbox.top + gap + 80; // push it farther down
      pop.dataset.arrow = "down";
    }

    // Preferred x: center under node, clamped to container
    let left = nbox.left - wbox.left + (nbox.width/2) - (popW/2);
    left = Math.max(12, Math.min(wrap.clientWidth - popW - 12, left));

    pop.style.left = `${left}px`;
    pop.style.top  = `${top}px`;
  }

  /* --- Controls + init --- */
  document.addEventListener("DOMContentLoaded", ()=>{
    const subjSel = $("#ds-subject");
    const taskSel = $("#ds-task");
    SUBJECT_IDS.forEach(s=>{ const o=document.createElement("option"); o.value=s; o.textContent=s; subjSel.appendChild(o); });
    subjSel.value = SUBJECT_IDS.includes("1847") ? "1847" : SUBJECT_IDS[0];

    DS_TASKS.forEach(t=>{ const o=document.createElement("option"); o.value=t; o.textContent=t; taskSel.appendChild(o); });
    taskSel.value = "bolting";

    subjSel.addEventListener("change", ()=>{ if(pop){ const active = Object.keys(nodes).find(id=>nodes[id].g.classList.contains("active")); if(active){ showPopover(MODS.find(m=>m.id===active), nodes[active].cx, nodes[active].cy); } }});
    taskSel.addEventListener("change", ()=>{ if(pop){ const active = Object.keys(nodes).find(id=>nodes[id].g.classList.contains("active")); if(active){ showPopover(MODS.find(m=>m.id===active), nodes[active].cx, nodes[active].cy); } }});

    buildSVG();

    // Open first modality by default
    const first = MODS[0];
    activate(first.id);
    showPopover(first, nodes[first.id].cx, nodes[first.id].cy);
  });
})();
