(() => {
  "use strict";
  const VERSION = "3.7";
  console.log(`✅ dataset-map.js v${VERSION}`);

  /* ---------- Data ---------- */
  const SUBJECT_IDS = ["1012","1118","1508","1602","1847","2112","2198","2307","3361","4162","4216","4279","4509","4612","4665","4687","4801","4827"];
  const DS_TASKS = [
    "Screwing","ScrewingSat","Crouching","Picking","Hammering","HammeringSat","Jumping","Lifting",
    "QuickLifting","Lower","SideOverhead","RobotPolishing","RobotWelding",
    "Polishing","PolishingSat","SitToStand","Squatting","Static","Upper","CircularWalking","StraightWalking",
    "Welding","WeldingSat"
  ];

  /* ---------- Per-subject extrinsics splits ---------- */
  /* Update these arrays as you learn the exact mapping. */
  const CALIB_SPLITS = {
    "4162": {
      // Tasks that use the *second* extrinsics (Calib 2)
      calib2: ["Screwing","ScrewingSat","Hammering","HammeringSat","SideOverhead","RobotPolishing","RobotWelding","Polishing","PolishingSat","Welding","WeldingSat"],
      // If you leave calib1 empty, we’ll auto-fill it as “all other tasks”
      calib1: ["Static","Upper","Lower","Squatting","Jumping","SitToStand","CircularWalking","StraightWalking","Crouching","Picking","Lifting","QuickLifting"]
    }
  };


  // Columns: left, left-closer, left-center, right-center, right-closer, right
  // Rows: 0 (top), 1 (middle), 2 (bottom)
  const CATALOG = [
    { id:"videos",     title:"videos",     col:"right",         row:0,
      info:{ rate:"≈ 40 Hz", desc:"RGB videos + associated timestamps.",
        groups:[{id:"files", title:"Files", paths:[
          "COMFI/videos/<ID>/<task>/camera_0.mp4",
          "COMFI/videos/<ID>/<task>/camera_2.mp4",
          "COMFI/videos/<ID>/<task>/camera_4.mp4",
          "COMFI/videos/<ID>/<task>/camera_6.mp4",
          "COMFI/videos/<ID>/<task>/camera_0_timestamps.csv",
          "COMFI/videos/<ID>/<task>/camera_2_timestamps.csv",
          "COMFI/videos/<ID>/<task>/camera_4_timestamps.csv",
          "COMFI/videos/<ID>/<task>/camera_6_timestamps.csv"
        ]}] } },

    { id:"cam_params", title:"cam params", col:"left",        row:0,
      info:{ rate:"", desc:"Per-participant camera intrinsics/extrinsics and calibration images.",
        groups:[
          {id:"intrinsics", title:"Intrinsics", note:"YAML containing camera intrinsics (K and D) + chessboard images", paths:[
            "COMFI/cam_params/<ID>/intrinsics/camera_0_intrinsics.yaml",
            "COMFI/cam_params/<ID>/intrinsics/camera_2_intrinsics.yaml",
            "COMFI/cam_params/<ID>/intrinsics/camera_4_intrinsics.yaml",
            "COMFI/cam_params/<ID>/intrinsics/camera_6_intrinsics.yaml",
            "COMFI/cam_params/<ID>/intrinsics/images/*.jpg"
          ]},
          {id:"extrinsics", title:"Extrinsics", note:"YAML containing camera extrinsics (R and T in world) + YAML containing cam to cam poses + Aruco images", paths:[
            "COMFI/cam_params/<ID>/extrinsics/cam_to_cam/camera_0_to_camera_2.yaml",
            "COMFI/cam_params/<ID>/extrinsics/cam_to_cam/camera_2_to_camera_4.yaml",
            "COMFI/cam_params/<ID>/extrinsics/cam_to_cam/camera_4_to_camera_6.yaml",
            "COMFI/cam_params/<ID>/extrinsics/cam_to_world/camera_0/camera_0_extrinsics.yaml",
            "COMFI/cam_params/<ID>/extrinsics/cam_to_world/camera_0/images/*.jpg",
            "COMFI/cam_params/<ID>/extrinsics/cam_to_world/camera_2/camera_2_extrinsics.yaml",
            "COMFI/cam_params/<ID>/extrinsics/cam_to_world/camera_2/images/*.jpg",
            "COMFI/cam_params/<ID>/extrinsics/cam_to_world/camera_4/camera_4_extrinsics.yaml",
            "COMFI/cam_params/<ID>/extrinsics/cam_to_world/camera_4/images/*.jpg",
            "COMFI/cam_params/<ID>/extrinsics/cam_to_world/camera_6/camera_6_extrinsics.yaml",
            "COMFI/cam_params/<ID>/extrinsics/cam_to_world/camera_6/images/*.jpg"
          ]}
        ] } },

    { id:"mocap",      title:"mocap",      col:"left-center",  row:2,
      info:{ rate:"raw 100 Hz; aligned 40 Hz",
        desc:"Optical motion capture: 3D marker positions, 3D estimated marker positions, joint center positions & joint angles.",
        groups:[
          {id:"raw", title:"Raw", note:"100 Hz (C3D + CSV + VSK)", paths:[
            "COMFI/mocap/raw/<ID>/{ID}.vsk",
            "COMFI/mocap/raw/<ID>/<task>/{task}.c3d",
            "COMFI/mocap/raw/<ID>/<task>/joint_angles.csv",
            "COMFI/mocap/raw/<ID>/<task>/joint_center.csv",
            "COMFI/mocap/raw/<ID>/<task>/markers_trajectories.csv",
            "COMFI/mocap/raw/<ID>/<task>/markers_model_trajectories.csv"
          ]},
          {id:"aligned", title:"Aligned", note:"Synchronized with cam 40 Hz", paths:[
            "COMFI/mocap/aligned/<ID>/<task>/joint_angles.csv",
            "COMFI/mocap/aligned/<ID>/<task>/joint_center.csv",
            "COMFI/mocap/aligned/<ID>/<task>/markers_trajectories.csv",
            "COMFI/mocap/aligned/<ID>/<task>/markers_model_trajectories.csv"
          ]}
        ] } },

    { id:"metadata",   title:"metadata",   col:"right-center", row:2,
      info:{ rate:"", desc:"Per-participant descriptors and scaled URDF.",
        groups:[{id:"files", title:"Files", paths:[
          "COMFI/metadata/<ID>/<ID>.yaml",
          "COMFI/metadata/<ID>/urdf/<ID>_scaled.urdf"
        ]}] } },

    { id:"forces",     title:"forces",     col:"left-closer",  row:1,
      info:{ rate:"Raw 1000 Hz; aligned 40 Hz", desc:"6D ground reaction forces and moments coming from laboratory grade force plates.",
        groups:[
          {id:"raw", title:"Raw", note:"1000 Hz", paths:[
            "COMFI/forces/raw/<ID>/<task>/{task}_devices.csv"
          ]},
          {id:"aligned", title:"Aligned", note:"40 Hz", paths:[
            "COMFI/forces/aligned/<ID>/<task>/{task}_devices.csv"
          ]}
        ] } },

    { id:"robot",      title:"robot",      col:"right-closer", row:1,
      info:{ rate:"Raw ~200 Hz; aligned 40 Hz",
        desc:"Robot telemetry for the collaborative tasks (raw ROS bags and aligned with cams CSV).",
        groups:[
          {id:"raw", title:"Raw", note:"200 Hz ROS bag", paths:[
            "COMFI/robot/raw/<ID>/{task}.bag"
          ]},
          {id:"aligned", title:"Aligned", note:"40 Hz CSV", paths:[
            "COMFI/robot/aligned/<ID>/{task}.csv"
          ]}
        ] } }
  ];

  /* ---------- Utils ---------- */
  const $ = s => document.querySelector(s);
  const resolvePath = (s, id, task) => s.replace(/<ID>/g,id).replace(/<id>/g,id).replace(/<task>/g,task).replace(/\{task\}/g,task);
  const copyText = async (text, btn) => {
    try { await navigator.clipboard.writeText(text); btn.textContent = "Copied!"; }
    catch { btn.textContent = "Copy failed"; }
    finally { setTimeout(()=>btn.textContent="Copy", 1100); }
  };

  /* ---------- Layout knobs ---------- */
  const NODE_W = 180, NODE_H = 56;
  const ROOT_Y = 100;
  const ROW_GAP = 150;          // vertical distance between rows
  const CANVAS_MIN_H = 720;
  const EDGE_START_PAD = 2;     // how close arrow starts are to COMFI corners
  const CENTER_START_PAD = 18;  // min distance from COMFI center for inner starts
  const SIDE_PULL = 140;        // horizontal pull to the side before going down
  const ROW_PULLS = [60, 100, 140]; // vertical easing per row

  // Column X coordinates (relative to canvas width)
  // Nicely fanned around the center, “circular” feel.
  function columnX(W, col){
    const cx = W/2;
    const far   = 360;   // distance from center for 'left'/'right'
    const closer= 260;   // for 'left-closer'/'right-closer'
    const center= 200;   // for 'left-center'/'right-center'
    switch(col){
      case "left":         return cx - far;
      case "left-closer":  return cx - closer;
      case "left-center":  return cx - center;
      case "right-center": return cx + center;
      case "right-closer": return cx + closer;
      case "right":        return cx + far;
      default:             return cx;
    }
  }

  /* ---------- State ---------- */
  let svg, nodes={}, pop=null, activeId=null, hintEl=null;

  /* ---------- Build diagram ---------- */
  function buildSVG(){
    nodes = {};
    const wrap = $("#ds-svg-wrap"); if (!wrap) return;
    wrap.innerHTML = "";

    // Hint
    hintEl = document.createElement("div");
    hintEl.className = "ds-hint";
    hintEl.textContent = "Tip: click a block to see paths";
    wrap.appendChild(hintEl);

    const W = Math.max(1400, wrap.clientWidth + 420);
    const H = Math.max(CANVAS_MIN_H, ROOT_Y + ROW_GAP*3 + 240);

    svg = document.createElementNS("http://www.w3.org/2000/svg","svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("width","100%");
    svg.setAttribute("height","100%");
    svg.style.display = "block";

    const rootX = W/2;
    addNode({id:"root", title:"COMFI"}, rootX, ROOT_Y, true);

    // Visible modalities depend on task
    const task = $("#ds-task").value;
    const showRobot  = (task === "RobotPolishing" || task === "RobotWelding");
    const hideForces = (task === "SideOverhead" || task === "CircularWalking" || task === "StraightWalking");

    const mods = CATALOG.filter(m =>
      (m.id !== "robot"  || showRobot) &&
      (m.id !== "forces" || !hideForces)
    );

    // Place nodes
    mods.forEach(m=>{
      const y = ROOT_Y + ROW_GAP * (m.row + 1);
      const x = columnX(W, m.col);
      addNode(m, x, y, false);
    });

    // Fan-out starts along COMFI bottom: left group from left corner → center; right group from right corner → center
    const leftGroup  = mods.filter(m => m.col.startsWith("left")).sort((a,b)=>a.row - b.row);
    const rightGroup = mods.filter(m => m.col.startsWith("right")).sort((a,b)=>a.row - b.row);

    const leftStarts  = startXsLeft (rootX, leftGroup.length);
    const rightStarts = startXsRight(rootX, rightGroup.length);

    leftGroup.forEach((m, i)  => addCurveSide(leftStarts[i],  ROOT_Y + NODE_H/2, nodes[m.id], "left"));
    rightGroup.forEach((m, i) => addCurveSide(rightStarts[i], ROOT_Y + NODE_H/2, nodes[m.id], "right"));

    wrap.appendChild(svg);
  }

  // Start points along COMFI bottom edge (left side → from corner toward center)
  function startXsLeft(rootX, count){
    const leftEdge   = rootX - NODE_W/2 + EDGE_START_PAD;
    const centerEdge = rootX - CENTER_START_PAD;
    if (count <= 1) return [ (leftEdge + centerEdge)/2 ];
    const step = (centerEdge - leftEdge) / (count - 1);
    return Array.from({length:count}, (_,i)=> leftEdge + i*step);
  }
  // Right side → from right corner toward center
  function startXsRight(rootX, count){
    const rightEdge  = rootX + NODE_W/2 - EDGE_START_PAD;
    const centerEdge = rootX + CENTER_START_PAD;
    if (count <= 1) return [ (rightEdge + centerEdge)/2 ];
    const step = (rightEdge - centerEdge) / (count - 1);
    return Array.from({length:count}, (_,i)=> rightEdge - i*step);
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

    const txt = document.createElementNS(svg.namespaceURI, "text");
    txt.setAttribute("x", cx); txt.setAttribute("y", cy + 5);
    txt.setAttribute("text-anchor", "middle");
    txt.textContent = m.title || "COMFI";
    g.appendChild(txt);

    svg.appendChild(g);

    if (isRoot) g.addEventListener("click", clearActive);
    else        g.addEventListener("click", () => toggleMod(m));

    nodes[m.id] = { g, cx, cy, col:m.col, row:m.row, info:m.info };
  }

  // Side curve that first pulls outward horizontally, then down to the child top
  function addCurveSide(sx, sy, child, side){
    const ex = child.cx;
    const ey = child.cy - NODE_H/2;

    const c1x = side === "left" ? sx - SIDE_PULL : sx + SIDE_PULL;
    const c1y = sy + 28;

    const c2x = side === "left" ? ex + 60 : ex - 60;
    const c2y = ey - Math.min(70, ROW_PULLS[child.row] || 90);

    const p = document.createElementNS(svg.namespaceURI, "path");
    p.setAttribute("d", `M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${ex} ${ey}`);
    p.setAttribute("class", "ds-connector");
    svg.appendChild(p);
  }

  /* ---------- Popover (toggle, compact Raw|Aligned switch) ---------- */
  function toggleMod(mod){
    if (activeId === mod.id) { clearActive(); return; }
    activeId = mod.id;
    hintEl && (hintEl.style.display = "none");
    Object.values(nodes).forEach(n => n.g.classList.toggle("active", n.g.dataset.id===activeId));
    showPopover(mod, nodes[mod.id]);
  }

  function clearActive(){
    activeId = null;
    if (pop) { pop.remove(); pop = null; }
    Object.values(nodes).forEach(n => n.g.classList.remove("active"));
    hintEl && (hintEl.style.display = "");
  }

function showPopover(mod, node){
  const wrap = $("#ds-svg-wrap");
  if (pop) { pop.remove(); pop = null; }
  pop = document.createElement("div");
  pop.className = "ds-pop";

  // Header
  const header = document.createElement("div");
  header.className = "ds-pop-header";
  header.textContent = mod.title;
  if (node.info?.rate){
    const rate = document.createElement("span");
    rate.className = "ds-rate";
    rate.textContent = node.info.rate;
    header.appendChild(rate);
  }
  pop.appendChild(header);

  // Body
  const body = document.createElement("div"); body.className = "ds-pop-body";
  if (node.info?.desc){
    const desc = document.createElement("div");
    desc.className="ds-desc";
    desc.textContent = node.info.desc;
    body.appendChild(desc);
  }

  const subj  = $("#ds-subject").value || "<ID>";
  const task  = $("#ds-task").value || "<task>";
  const groups = node.info?.groups || [];

  const byId = id => groups.find(g => g.id === id);
  const files   = byId("files");
  const raw     = byId("raw");
  const aligned = byId("aligned");
  const intr    = byId("intrinsics");
  const extr    = byId("extrinsics");

  // Decide tabs: raw/aligned OR intrinsics/extrinsics
  let tabDefs = null;
  if (raw && aligned)        tabDefs = [raw, aligned];
  else if (intr && extr)     tabDefs = [intr, extr];

  let currentTab = tabDefs ? tabDefs[0].id : (files ? "files" : null);

  if (tabDefs){
    const seg = document.createElement("div"); seg.className = "ds-seg";
    tabDefs.forEach(td => {
      const b = document.createElement("button");
      b.textContent = td.title || td.id;
      if (currentTab === td.id) b.classList.add("is-active");
      b.onclick = () => {
        currentTab = td.id;
        [...seg.children].forEach(x=>x.classList.remove("is-active"));
        b.classList.add("is-active");
        render();
      };
      seg.appendChild(b);
    });
    body.appendChild(seg);
  }

  const list = document.createElement("div"); body.appendChild(list);

  function render(){
    list.innerHTML = "";

    // ---- Special case: Cam Params → Extrinsics with split calibrations ----
    const split = (typeof CALIB_SPLITS !== "undefined") ? CALIB_SPLITS[subj] : null;
    if (mod.id === "cam_params" && currentTab === "extrinsics" && extr && split){
      // Determine which calib applies to the current task
      const calib2Set = new Set(split.calib2 || []);
      const useCalib2 = calib2Set.has(task);
      const calibLabel = useCalib2 ? "Calib 2" : "Calib 1";
      const suffix = useCalib2 ? "2" : "1";

      // Short red warning (no long lists)
      const warn = document.createElement("div");
      warn.className = "ds-warning";
      warn.innerHTML = `Caution: participant <strong>${subj}</strong> has two extrinsics calibrations. `
        + `The current task <strong>${task}</strong> uses <strong>${calibLabel}</strong>.`;
      list.appendChild(warn);

      // Helper: rewrite /extrinsics/ → /extrinsics_1/ or /extrinsics_2/
      const mapPaths = (paths) =>
      (paths || []).map(p =>
        // insert calib_${suffix} immediately after .../cam_to_world/camera_XX/
        p.replace(/(\/extrinsics\/cam_to_world\/camera_[^/]+\/)/, `$1calib_${suffix}/`)
      );



      // Single section for the applicable calibration
      const h = document.createElement("div");
      h.className = "ds-subhead";
      h.textContent = `Extrinsics – ${calibLabel}`;
      list.appendChild(h);

      mapPaths(extr.paths).forEach(pth => {
        const resolved = resolvePath(
          pth.replace(/\{ID\}/g, subj).replace(/\{task\}/g, task),
          subj, task
        );
        const row = document.createElement("div"); row.className="ds-path-row";
        const code = document.createElement("code"); code.className="ds-path"; code.textContent = resolved;
        const btn  = document.createElement("button"); btn.className="ds-copy"; btn.textContent="Copy";
        btn.onclick = ()=>copyText(resolved, btn);
        row.appendChild(code); row.appendChild(btn); list.appendChild(row);
      });

      return; // done with special case
    }
    // ---- End special case ----

    // Default rendering
    let toShow;
    if (files && !tabDefs) {
      toShow = [files];
    } else if (tabDefs) {
      toShow = tabDefs.filter(g => g.id === currentTab);
    } else {
      toShow = groups;
    }

    toShow.filter(Boolean).forEach(gr=>{
      if (gr.title){
        const h = document.createElement("div");
        h.className = "ds-subhead";
        h.textContent = gr.title;
        if (gr.note){
          const n = document.createElement("span");
          n.className = "ds-subnote";
          n.textContent = `(${gr.note})`;
          h.appendChild(n);
        }
        list.appendChild(h);
      }
      (gr.paths || []).forEach(pth=>{
        const resolved = resolvePath(
          pth.replace(/\{ID\}/g, subj).replace(/\{task\}/g, task),
          subj, task
        );
        const row  = document.createElement("div"); row.className = "ds-path-row";
        const code = document.createElement("code"); code.className = "ds-path"; code.textContent = resolved;
        const btn  = document.createElement("button"); btn.className = "ds-copy"; btn.textContent = "Copy";
        btn.onclick = () => copyText(resolved, btn);
        row.appendChild(code); row.appendChild(btn); list.appendChild(row);
      });
    });
  }
  render();

  pop.appendChild(body); wrap.appendChild(pop);
  positionPopover(pop, node);

  window.addEventListener("resize", relayout, { passive:true });
  wrap.addEventListener("scroll", relayout, { passive:true });
  function relayout(){ if(pop && activeId===mod.id) positionPopover(pop, nodes[mod.id]); }
  }


  // Top row → open below; middle/bottom → open above
  function positionPopover(pop, node){
    const wrap = $("#ds-svg-wrap");
    const nbox = node.g.getBoundingClientRect();
    const wbox = wrap.getBoundingClientRect();
    const gap = 12;

    let left = nbox.left - wbox.left + nbox.width/2 - pop.offsetWidth/2;
    left = Math.max(12, Math.min(wrap.clientWidth - pop.offsetWidth - 12, left));

    let top;
    if (node.row === 0){          // below top row
      pop.dataset.arrow = "down";
      top = nbox.bottom - wbox.top + gap;
    } else {                      // above other rows
      pop.dataset.arrow = "up";
      top = nbox.top - wbox.top - pop.offsetHeight - gap;
    }

    pop.style.left = `${left}px`;
    pop.style.top  = `${top}px`;
  }

  /* ---------- Controls + init ---------- */
  document.addEventListener("DOMContentLoaded", ()=>{
    const subjSel = $("#ds-subject"), taskSel = $("#ds-task");
    SUBJECT_IDS.forEach(s=>{ const o=document.createElement("option"); o.value=s; o.textContent=s; subjSel.appendChild(o); });
    subjSel.value = SUBJECT_IDS.includes("1847") ? "1847" : SUBJECT_IDS[0];

    DS_TASKS.forEach(t=>{ const o=document.createElement("option"); o.value=t; o.textContent=t; taskSel.appendChild(o); });
    taskSel.value = "Screwing";

    subjSel.addEventListener("change", ()=>{ if (activeId && pop) showPopover(CATALOG.find(m=>m.id===activeId), nodes[activeId]); });
    taskSel.addEventListener("change", ()=>{ clearActive(); buildSVG(); }); // rebuild for conditional nodes

    buildSVG(); // full overview (no popover)
  });
})();
