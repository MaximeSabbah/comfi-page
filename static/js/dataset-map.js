(() => {
  "use strict";
  const VERSION = "2.0";
  console.log(`✅ dataset-map.js v${VERSION}`);

  /* Data */
  const SUBJECT_IDS = ["1012","1118","1508","1602","1847","2112","2198","2307","3361","4162","4216","4279","4509","4612","4665","4687","4801","4827"];
  const DS_TASKS = [
    "bolting","bolting_sat","crouch","crouch_object","hitting","hitting_sat","jump","lifting",
    "lifting_fast","lower","overhead","robot_sanding","robot_welding",
    "sanding","sanding_sat","sit_to_stand","squat","static","upper","walk","walk_front",
    "welding","welding_sat"
  ];

  /* Modalities (colors chosen; tweak to match your PDF) */
  const COLORS = {
    videos:     "#4F46E5", // indigo
    mocap:      "#059669", // emerald
    forces:     "#F59E0B", // amber
    robot:      "#EF4444", // red
    cam_params: "#06B6D4", // cyan
    metadata:   "#8B5CF6"  // violet
  };

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
    { id:"forces", title:"Forces", rate:"Raw 1000 Hz → aligned 40 Hz",
      desc:"Force signals only (no IMU). Raw high-rate data and time-aligned CSV.",
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
      desc:"Per-subject camera intrinsics/extrinsics and calibration images.",
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

  /* Utils */
  const $ = sel => document.querySelector(sel);
  function resolvePath(s, id, task){
    return s.replace(/<ID>/g,id).replace(/<id>/g,id).replace(/<task>/g,task).replace(/\{task\}/g,task);
  }
  async function copyText(text, btn){
    try { await navigator.clipboard.writeText(text); btn.textContent = "Copied!"; }
    catch { btn.textContent = "Copy failed"; }
    finally { setTimeout(()=>btn.textContent="Copy", 1100); }
  }
  function lighten(hex, amt=0.82){ // quick tint for fill
    // hex -> rgb -> mix with white
    const c = hex.replace("#",""); const r=parseInt(c.substr(0,2),16), g=parseInt(c.substr(2,2),16), b=parseInt(c.substr(4,2),16);
    const mix = (v)=>Math.round(255 - (255 - v)*amt);
    return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
  }

  /* Layout + drawing */
  let activeId = "videos";
  let nodesCache = {}; // id -> {g, rect, cx, cy}
  let svgEl = null;

  function buildSVG(){
    nodesCache = {};
    const wrap = $("#ds-svg-wrap"); if (!wrap) return;
    wrap.innerHTML = "";

    const W = wrap.clientWidth < 700 ? 900 : 1200;  // virtual width; scales to 100%
    const H = 520;
    const rootY = 80, rootW = 140, rootH = 44;
    const topY = 240, botY = 340;
    const marginX = 80;

    const svgNS = "http://www.w3.org/2000/svg";
    svgEl = document.createElementNS(svgNS, "svg");
    svgEl.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svgEl.setAttribute("width", "100%");
    svgEl.setAttribute("height", "100%");
    svgEl.style.display = "block";

    // Root
    const rootX = W/2;
    addNode({id:"root", title:"COMFI"}, rootX, rootY, 140, rootH, "#64748B"); // slate
    // Modalities across two staggered rows
    const n = MODS.length; // 6
    const span = (W - 2*marginX) / (n - 1);
    MODS.forEach((m, i) => {
      const cx = marginX + i*span;
      const cy = (i % 2 === 0) ? topY : botY;
      addConnector(rootX, rootY + rootH/2, cx, cy - 28);
      addNode(m, cx, cy, 170, 56, COLORS[m.id]);
    });

    wrap.appendChild(svgEl);
    activateNode(activeId);
  }

  function addNode(modOrRoot, cx, cy, w, h, color){
    const svgNS = svgEl.namespaceURI;
    const g = document.createElementNS(svgNS, "g");
    g.classList.add("ds-node");
    g.dataset.id = modOrRoot.id;

    const rect = document.createElementNS(svgNS, "rect");
    rect.setAttribute("x", cx - w/2);
    rect.setAttribute("y", cy - h/2);
    rect.setAttribute("width", w);
    rect.setAttribute("height", h);
    rect.setAttribute("rx", 10);
    rect.setAttribute("ry", 10);
    rect.style.stroke = "#d9d9e3";
    rect.style.fill = "#fff";

    const text = document.createElementNS(svgNS, "text");
    text.setAttribute("x", cx);
    text.setAttribute("y", cy + 5);
    text.setAttribute("text-anchor", "middle");
    text.textContent = modOrRoot.title || "COMFI";

    g.appendChild(rect); g.appendChild(text); svgEl.appendChild(g);

    g.addEventListener("mouseenter", ()=>highlight(g, color));
    g.addEventListener("mouseleave", ()=>dehighlight(g));
    g.addEventListener("click", ()=>{ activeId = modOrRoot.id; activateNode(activeId); showPopover(modOrRoot.id, color, cx, cy); });

    nodesCache[modOrRoot.id] = { g, rect, cx, cy, color };
  }

  function addConnector(x1,y1,x2,y2){
    const l = document.createElementNS(svgEl.namespaceURI, "line");
    l.setAttribute("x1", x1); l.setAttribute("y1", y1);
    l.setAttribute("x2", x2); l.setAttribute("y2", y2);
    l.setAttribute("class","ds-connector");
    svgEl.appendChild(l);
  }

  function highlight(g, color){
    if (!g || g.dataset.id==="root") return;
    const rect = g.querySelector("rect");
    rect.style.stroke = color;
    rect.style.fill = lighten(color, 0.9);
  }
  function dehighlight(g){
    if (!g || g.dataset.id==="root" || g.dataset.id===activeId) return;
    const rect = g.querySelector("rect");
    rect.style.stroke = "#d9d9e3";
    rect.style.fill = "#fff";
  }

  function activateNode(id){
    Object.values(nodesCache).forEach(n=>{
      const isActive = n.g.dataset.id === id;
      n.g.classList.toggle("active", isActive);
      const rect = n.rect;
      if (isActive && n.g.dataset.id!=="root"){
        rect.style.stroke = n.color;
        rect.style.fill = lighten(n.color, 0.85);
      } else if (n.g.dataset.id!=="root"){
        rect.style.stroke = "#d9d9e3";
        rect.style.fill = "#fff";
      }
    });
  }

  /* Popover */
  let popEl = null;
  function showPopover(id, color, cx, cy){
    const wrap = $("#ds-svg-wrap"); if (!wrap) return;
    if (popEl) { popEl.remove(); popEl = null; }

    if (id==="root") return;

    const mod = MODS.find(m=>m.id===id);
    const subj = $("#ds-subject").value || "<ID>";
    const task = $("#ds-task").value || "<task>";

    popEl = document.createElement("div");
    popEl.className = "ds-pop";
    popEl.style.borderColor = lighten(color, 0.65);

    const header = document.createElement("div");
    header.className = "ds-pop-header";
    header.style.background = color;
    header.style.borderBottom = `1px solid ${lighten(color, 0.65)}`;
    header.textContent = mod.title;
    const rate = document.createElement("span");
    rate.className = "ds-rate"; rate.textContent = mod.rate || "";
    header.appendChild(rate);

    const body = document.createElement("div");
    body.className = "ds-pop-body";
    const desc = document.createElement("div");
    desc.className = "ds-desc"; desc.textContent = mod.desc || "";
    body.appendChild(desc);

    mod.paths.forEach(p=>{
      const resolved = resolvePath(p, subj, task);
      const row = document.createElement("div"); row.className="ds-path-row";
      const code = document.createElement("code"); code.className="ds-path"; code.textContent = resolved;
      const btn = document.createElement("button"); btn.className="ds-copy"; btn.textContent="Copy";
      btn.onclick = ()=>copyText(resolved, btn);
      row.appendChild(code); row.appendChild(btn); body.appendChild(row);
    });

    popEl.appendChild(header); popEl.appendChild(body);
    wrap.appendChild(popEl);

    // Position under the clicked node (convert SVG coords -> pixels)
    positionPopoverUnderNode(popEl, nodesCache[id].g);
    window.addEventListener("resize", onResizeRelayout);
    wrap.addEventListener("scroll", onResizeRelayout, { passive:true });

    function onResizeRelayout(){ if(popEl) positionPopoverUnderNode(popEl, nodesCache[id].g); }
  }

  function positionPopoverUnderNode(pop, g){
    const wrap = $("#ds-svg-wrap");
    const nodeBox = g.getBoundingClientRect();
    const wrapBox = wrap.getBoundingClientRect();

    const desiredLeft = nodeBox.left - wrapBox.left + nodeBox.width/2 - pop.offsetWidth/2;
    const desiredTop  = nodeBox.bottom - wrapBox.top + 12;

    const minLeft = 8;
    const maxLeft = wrap.clientWidth - pop.offsetWidth - 8;
    const left = Math.max(minLeft, Math.min(maxLeft, desiredLeft));
    const top  = Math.max(8, desiredTop);

    pop.style.left = `${left}px`;
    pop.style.top  = `${top}px`;
    pop.style.setProperty("border-color", nodesCache[g.dataset.id].color);
  }

  /* Controls + init */
  document.addEventListener("DOMContentLoaded", ()=>{
    const subjSel = $("#ds-subject");
    const taskSel = $("#ds-task");
    SUBJECT_IDS.forEach(s => {
      const o=document.createElement("option"); o.value=s; o.textContent=s; subjSel.appendChild(o);
    });
    subjSel.value = SUBJECT_IDS.includes("1847") ? "1847" : SUBJECT_IDS[0];

    DS_TASKS.forEach(t=>{
      const o=document.createElement("option"); o.value=t; o.textContent=t; taskSel.appendChild(o);
    });
    taskSel.value = "bolting";

    subjSel.addEventListener("change", ()=>{ if(popEl) showPopover(activeId, nodesCache[activeId].color, 0,0); });
    taskSel.addEventListener("change", ()=>{ if(popEl) showPopover(activeId, nodesCache[activeId].color, 0,0); });

    buildSVG();
    // Open default popover
    const def = MODS[0];
    showPopover(def.id, COLORS[def.id], nodesCache[def.id].cx, nodesCache[def.id].cy);
  });
})();
