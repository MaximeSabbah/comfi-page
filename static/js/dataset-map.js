(() => {
  "use strict";
  const VERSION = "3.0";
  console.log(`✅ dataset-map.js v${VERSION}`);

  /* ---------- Data ---------- */
  const SUBJECT_IDS = ["1012","1118","1508","1602","1847","2112","2198","2307","3361","4162","4216","4279","4509","4612","4665","4687","4801","4827"];
  const DS_TASKS = [
    "bolting","bolting_sat","crouch","crouch_object","hitting","hitting_sat","jump","lifting",
    "lifting_fast","lower","overhead","robot_sanding","robot_welding",
    "sanding","sanding_sat","sit_to_stand","squat","static","upper","walk","walk_front",
    "welding","welding_sat"
  ];

  // “Catalog” of modalities. Placement is column+row so we can keep it aesthetic.
  // col: "left" | "right" ; row: 0 (top) | 1 (middle) | 2 (bottom)
  const CATALOG = [
    { id:"videos",     title:"Videos",     col:"left",  row:0,
      info:{ rate:"≈ 40 Hz per camera", desc:"RGB videos from multiple synchronized viewpoints.",
        groups:[{id:"files", title:"Files", paths:[
          "COMFI/<ID>/<task>/camera_0.mp4",
          "COMFI/<ID>/<task>/camera_2.mp4",
          "COMFI/<ID>/<task>/camera_4.mp4",
          "COMFI/<ID>/<task>/camera_6.mp4"
        ]}] } },

    { id:"mocap",      title:"Mocap",      col:"left",  row:1,
      info:{ rate:"C3D 100 Hz; aligned CSV 40 Hz",
        desc:"Optical motion capture: markers, model markers, joint centers & angles.",
        groups:[
          {id:"raw", title:"Raw", note:"100 Hz (C3D + CSV)", paths:[
            "COMFI/<ID>/<task>/{task}.c3d",
            "COMFI/<ID>/<task>/raw/joint_angles.csv",
            "COMFI/<ID>/<task>/raw/joint_center.csv",
            "COMFI/<ID>/<task>/raw/markers.csv",
            "COMFI/<ID>/<task>/raw/markers_model.csv"
          ]},
          {id:"aligned", title:"Aligned", note:"Common 40 Hz timeline", paths:[
            "COMFI/<ID>/<task>/aligned/joint_angles.csv",
            "COMFI/<ID>/<task>/aligned/joint_center.csv",
            "COMFI/<ID>/<task>/aligned/markers.csv",
            "COMFI/<ID>/<task>/aligned/markers_model.csv"
          ]}
        ] } },

    { id:"forces",     title:"Forces",     col:"left",  row:2,
      info:{ rate:"Raw 1000 Hz → aligned 40 Hz",
        desc:"Force signals only (no IMU).",
        groups:[
          {id:"raw", title:"Raw", note:"1000 Hz", paths:[
            "COMFI/<ID>/<task>/raw/{task}_devices.csv"
          ]},
          {id:"aligned", title:"Aligned", note:"40 Hz", paths:[
            "COMFI/<ID>/<task>/aligned/{task}_devices.csv"
          ]}
        ] } },

    { id:"cam_params", title:"Cam Params", col:"right", row:0,
      info:{ rate:"", desc:"Per-subject camera intrinsics/extrinsics and calibration images.",
        groups:[{id:"files", title:"Files", paths:[
          "COMFI/<ID>/cam_params.yaml",
          "COMFI/<ID>/images/*.png"
        ]}] } },

    { id:"metadata",   title:"Metadata",   col:"right", row:1,
      info:{ rate:"", desc:"Per-subject descriptors and scaled URDF.",
        groups:[{id:"files", title:"Files", paths:[
          "COMFI/<ID>/metadata/<ID>.yaml",
          "COMFI/<ID>/metadata/<ID>_scaled.urdf"
        ]}] } },

    { id:"robot",      title:"Robot",      col:"right", row:2,
      info:{ rate:"Raw ~200 Hz → aligned 40 Hz",
        desc:"Robot topics for sanding/welding tasks (ROS bag + aligned CSV).",
        groups:[
          {id:"raw", title:"Raw", note:"ROS bag", paths:[
            "COMFI/<ID>/raw/robot_sanding.bag",
            "COMFI/<ID>/raw/robot_welding.bag"
          ]},
          {id:"aligned", title:"Aligned", note:"40 Hz CSV", paths:[
            "COMFI/<ID>/aligned/robot_sanding.csv",
            "COMFI/<ID>/aligned/robot_welding.csv"
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

  /* ---------- Layout knobs (easy to tweak) ---------- */
  const NODE_W = 180, NODE_H = 56;
  const ROOT_Y = 100;
  const ROW_GAP = 160;               // vertical gap between rows
  const COL_X_PAD = 220;             // horizontal distance from edges
  const CANVAS_MIN_H = 720;          // tall canvas to breathe
  const FAN_STEP = 26;               // spacing between root fan-out starts (per side)

  /* ---------- State ---------- */
  let svg, nodes={}, pop=null, activeId=null, hintEl=null;

  /* ---------- Build diagram ---------- */
  function buildSVG() {
    nodes = {};
    const wrap = $("#ds-svg-wrap"); if (!wrap) return;
    wrap.innerHTML = "";

    // Hint (start)
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

    const topY    = ROOT_Y + ROW_GAP;
    const middleY = ROOT_Y + ROW_GAP*2;
    const bottomY = ROOT_Y + ROW_GAP*3;

    // Which modalities to show depends on the task
    const task = $("#ds-task").value;
    const showRobot  = (task === "robot_sanding" || task === "robot_welding");
    const hideForces = (task === "overhead" || task === "walk" || task === "walk_front");

    const mods = CATALOG.filter(m =>
      (m.id !== "robot"  || showRobot) &&
      (m.id !== "forces" || !hideForces)
    );

    // Place nodes evenly by column & row
    const leftX  = COL_X_PAD;
    const rightX = W - COL_X_PAD;

    const rowY = [topY, middleY, bottomY];
    mods.forEach(m => {
      const cx = (m.col === "left") ? leftX : rightX;
      const cy = rowY[m.row];
      addNode(m, cx, cy, false);
    });

    // Fan-out connectors from COMFI: handle left and right sides independently
    fanOutConnectors(rootX, ROOT_Y + NODE_H/2, mods.filter(m=>m.col==="left").map(m=>nodes[m.id]), "left");
    fanOutConnectors(rootX, ROOT_Y + NODE_H/2, mods.filter(m=>m.col==="right").map(m=>nodes[m.id]), "right");

    wrap.appendChild(svg);
  }

  function addNode(m, cx, cy, isRoot){
    const g = document.createElementNS(svg.namespaceURI, "g");
    g.classList.add("ds-node"); g.dataset.id = m.id;

    const rect = document.createElementNS(svg.namespaceURI, "rect");
    rect.setAttribute("x", cx - NODE_W/2);
    rect.setAttribute("y", cy - NODE_H/2);
    rect.setAttribute("width", NODE_W);
    rect.setAttribute("height", NODE_H);
    g.appendChild(rect);

    const txt = document.createElementNS(svg.namespaceURI, "text");
    txt.setAttribute("x", cx); txt.setAttribute("y", cy + 5);
    txt.setAttribute("text-anchor","middle");
    txt.textContent = m.title || "COMFI";
    g.appendChild(txt);

    svg.appendChild(g);

    if (isRoot) {
      g.addEventListener("click", clearActive);                 // click COMFI = overview
    } else {
      g.addEventListener("click", () => toggleMod(m));          // toggle popover
    }

    nodes[m.id] = { g, cx, cy, col:m.col, row:m.row, info:m.info };
  }

  // Route side curves so they never cross each other or run through boxes
  function fanOutConnectors(rootX, rootY, children, side){
    if (!children.length) return;
    // Order by row top→bottom to keep lines in their own vertical “lanes”
    children.sort((a,b)=>a.row - b.row);

    // Fan-out start points from COMFI center towards each side
    const starts = children.map((_,i) =>
      side === "left" ? (rootX - 2 - i*FAN_STEP) : (rootX + 2 + i*FAN_STEP)
    );

    children.forEach((ch, i) => {
      const sx = starts[i], sy = rootY;
      const ex = ch.cx,    ey = ch.cy - NODE_H/2;
      addSideCurve(sx, sy, ex, ey, side, ch.row);
    });
  }

  function addSideCurve(x1,y1,x2,y2,side,row){
    // Pull the curve outward to the side first, then down to the child top.
    const sideBend = 140;               // horizontal pull
    const vertBend = [60, 100, 140][row] || 100;  // row-specific vertical easing

    const c1x = side === "left" ? x1 - sideBend : x1 + sideBend;
    const c1y = y1 + 28;
    const c2x = side === "left" ? x2 + 60 : x2 - 60;
    const c2y = y2 - Math.min(70, vertBend);

    const p = document.createElementNS(svg.namespaceURI, "path");
    p.setAttribute("d", `M ${x1} ${y1} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x2} ${y2}`);
    p.setAttribute("class","ds-connector");
    svg.appendChild(p);
  }

  /* ---------- Popover ---------- */
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
      const rate = document.createElement("span"); rate.className="ds-rate"; rate.textContent = node.info.rate;
      header.appendChild(rate);
    }
    pop.appendChild(header);

    // Body
    const body = document.createElement("div"); body.className="ds-pop-body";
    if (node.info?.desc){
      const desc = document.createElement("div"); desc.className="ds-desc"; desc.textContent = node.info.desc;
      body.appendChild(desc);
    }

    const subj = $("#ds-subject").value || "<ID>";
    const task = $("#ds-task").value || "<task>";

    const groups = node.info?.groups || [];

    // If there are raw/aligned groups, show a tiny segmented switch (only one list at a time)
    const raw = groups.find(g=>g.id==="raw");
    const aligned = groups.find(g=>g.id==="aligned");
    const filesOnly = groups.length===1 && groups[0].id==="files";

    let currentTab = raw ? "raw" : (aligned ? "aligned" : "files");

    if (!filesOnly && (raw || aligned)){
      const seg = document.createElement("div"); seg.className="ds-seg";
      const makeBtn = (id,label) => {
        const b = document.createElement("button");
        b.textContent = label; if (currentTab===id) b.classList.add("is-active");
        b.onclick = ()=>{ currentTab=id; [...seg.children].forEach(x=>x.classList.remove("is-active")); b.classList.add("is-active"); renderList(); };
        return b;
      };
      if (raw) seg.appendChild(makeBtn("raw","Raw"));
      if (aligned) seg.appendChild(makeBtn("aligned","Aligned"));
      body.appendChild(seg);
    }

    const listBox = document.createElement("div"); body.appendChild(listBox);

    function renderList(){
      listBox.innerHTML = "";
      const toShow = filesOnly ? groups : groups.filter(g=>g.id===currentTab);
      toShow.forEach(gr => {
        if (gr.title){
          const h=document.createElement("div"); h.className="ds-subhead"; h.textContent=gr.title;
          if (gr.note){ const n=document.createElement("span"); n.className="ds-subnote"; n.textContent=`(${gr.note})`; h.appendChild(n); }
          listBox.appendChild(h);
        }
        (gr.paths||[]).forEach(pth => {
          const resolved = resolvePath(pth, subj, task);
          const row = document.createElement("div"); row.className="ds-path-row";
          const code = document.createElement("code"); code.className="ds-path"; code.textContent = resolved;
          const btn = document.createElement("button"); btn.className="ds-copy"; btn.textContent="Copy";
          btn.onclick = ()=>copyText(resolved, btn);
          row.appendChild(code); row.appendChild(btn); listBox.appendChild(row);
        });
      });
    }
    renderList();

    pop.appendChild(body);
    wrap.appendChild(pop);

    positionPopover(pop, node);
    window.addEventListener("resize", relayout, { passive:true });
    wrap.addEventListener("scroll", relayout, { passive:true });
    function relayout(){ if(pop && activeId===mod.id) positionPopover(pop, nodes[mod.id]); }
  }

  // Top row: open below; middle/bottom rows: open above (so they don’t cover lower nodes)
  function positionPopover(pop, node){
    const wrap = $("#ds-svg-wrap");
    const nbox = node.g.getBoundingClientRect();
    const wbox = wrap.getBoundingClientRect();
    const gap = 12;

    let left = nbox.left - wbox.left + nbox.width/2 - pop.offsetWidth/2;
    left = Math.max(12, Math.min(wrap.clientWidth - pop.offsetWidth - 12, left));

    let top;
    if (node.row === 0){                                       // top → below
      pop.dataset.arrow = "down";
      top = nbox.bottom - wbox.top + gap;
    } else {                                                   // middle/bottom → above
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
    taskSel.value = "bolting";

    subjSel.addEventListener("change", ()=>{ if (activeId && pop) showPopover(nodes[activeId], nodes[activeId]); });
    taskSel.addEventListener("change", ()=>{ clearActive(); buildSVG(); });  // rebuild to show/hide Forces/Robot

    buildSVG();   // start with full overview; no popover
  });
})();
