(() => {
  "use strict";
  const VERSION = "2.6";
  console.log(`✅ dataset-map.js v${VERSION}`);

  /* --- Data --- */
  const SUBJECT_IDS = ["1012","1118","1508","1602","1847","2112","2198","2307","3361","4162","4216","4279","4509","4612","4665","4687","4801","4827"];
  const DS_TASKS = [
    "bolting","bolting_sat","crouch","crouch_object","hitting","hitting_sat","jump","lifting",
    "lifting_fast","lower","overhead","robot_sanding","robot_welding",
    "sanding","sanding_sat","sit_to_stand","squat","static","upper","walk","walk_front",
    "welding","welding_sat"
  ];

  /* Three rows (top / middle / bottom) */
  const MODS = [
    { id:"videos",     title:"Videos",     row:0,
      info:{ rate:"≈ 40 Hz per camera", groups:[
        {title:"Files", paths:[
          "COMFI/<ID>/<task>/camera_0.mp4",
          "COMFI/<ID>/<task>/camera_2.mp4",
          "COMFI/<ID>/<task>/camera_4.mp4",
          "COMFI/<ID>/<task>/camera_6.mp4"
        ]}
      ], desc:"RGB videos from multiple synchronized viewpoints."}
    },
    { id:"cam_params", title:"Cam Params", row:0,
      info:{ rate:"", groups:[
        {title:"Files", paths:[
          "COMFI/<ID>/cam_params.yaml",
          "COMFI/<ID>/images/*.png"
        ]}
      ], desc:"Per-subject camera intrinsics/extrinsics and calibration images."}
    },

    { id:"mocap",      title:"Mocap",      row:1,
      info:{ rate:"C3D 100 Hz; aligned CSV 40 Hz", groups:[
        {title:"Raw", note:"C3D + raw CSV", paths:[
          "COMFI/<ID>/<task>/{task}.c3d",
          "COMFI/<ID>/<task>/raw/*.csv"
        ]},
        {title:"Aligned", note:"Common 40 Hz timeline", paths:[
          "COMFI/<ID>/<task>/aligned/joint_angles.csv",
          "COMFI/<ID>/<task>/aligned/joint_center.csv",
          "COMFI/<ID>/<task>/aligned/markers.csv",
          "COMFI/<ID>/<task>/aligned/markers_model.csv"
        ]},
        {title:"Subject calibration", paths:[
          "COMFI/<ID>/<ID>.vsk"
        ]}
      ], desc:"Optical motion capture: markers, model markers, joint centers & angles."}
    },
    { id:"metadata",   title:"Metadata",   row:1,
      info:{ rate:"", groups:[
        {title:"Files", paths:[
          "COMFI/<ID>/metadata/<ID>.yaml",
          "COMFI/<ID>/metadata/<ID>_scaled.urdf"
        ]}
      ], desc:"Per-subject descriptors and scaled URDF."}
    },

    { id:"forces",     title:"Forces",     row:2,
      info:{ rate:"Raw 1000 Hz → aligned 40 Hz", groups:[
        {title:"Raw", note:"1000 Hz", paths:[
          "COMFI/<ID>/<task>/raw/{task}_devices.csv"
        ]},
        {title:"Aligned", note:"40 Hz", paths:[
          "COMFI/<ID>/<task>/aligned/{task}_devices.csv"
        ]}
      ], desc:"Force signals only (no IMU). Raw high-rate data and time-aligned CSV."}
    },
    { id:"robot",      title:"Robot",      row:2,
      info:{ rate:"Raw ~200 Hz → aligned 40 Hz", groups:[
        {title:"Raw", note:"ROS bag", paths:[
          "COMFI/<ID>/raw/robot_sanding.bag",
          "COMFI/<ID>/raw/robot_welding.bag"
        ]},
        {title:"Aligned", note:"40 Hz CSV", paths:[
          "COMFI/<ID>/aligned/robot_sanding.csv",
          "COMFI/<ID>/aligned/robot_welding.csv"
        ]}
      ], desc:"Robot topics for sanding/welding tasks (ROS bag + aligned CSV)."}
    }
  ];

  /* --- Utils --- */
  const $ = s => document.querySelector(s);
  const resolvePath = (s, id, task) =>
    s.replace(/<ID>/g,id).replace(/<id>/g,id).replace(/<task>/g,task).replace(/\{task\}/g,task);
  const copyText = async (text, btn) => {
    try { await navigator.clipboard.writeText(text); btn.textContent = "Copied!"; }
    catch { btn.textContent = "Copy failed"; }
    finally { setTimeout(()=>btn.textContent="Copy", 1100); }
  };

  /* --- Tweakable layout constants --- */
  const NODE_W = 180;
  const NODE_H = 56;
  const ROOT_Y = 100;
  const GAP_Y  = 120;          // gap between rows
  const MARGIN_X_MIN = 180;    // generous side margins
  const CANVAS_MIN_H = 660;    // taller than before
  const ROOT_PAD = 16;         // spacing along COMFI bottom for connector starts

  /* --- State --- */
  let svg, nodes={}, pop=null, activeId=null, hintEl=null;

  /* --- Build --- */
  function buildSVG(){
    nodes = {};
    const wrap = $("#ds-svg-wrap"); if (!wrap) return;
    wrap.innerHTML = "";

    // Hint (shown initially)
    hintEl = document.createElement("div");
    hintEl.className = "ds-hint";
    hintEl.textContent = "Tip: click a block to see paths";
    wrap.appendChild(hintEl);

    const W = Math.max(1400, wrap.clientWidth + 400); // very wide virtual canvas
    const H = Math.max(CANVAS_MIN_H, ROOT_Y + GAP_Y*3 + 240);

    svg = document.createElementNS("http://www.w3.org/2000/svg","svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("width","100%");
    svg.setAttribute("height","100%");
    svg.style.display = "block";

    const rootX = W/2;
    addNode({id:"root", title:"COMFI"}, rootX, ROOT_Y, true);

    // rows
    placeRow(MODS.filter(m=>m.row===0), rootX, ROOT_Y + GAP_Y, W);
    placeRow(MODS.filter(m=>m.row===1), rootX, ROOT_Y + GAP_Y*2, W);
    placeRow(MODS.filter(m=>m.row===2), rootX, ROOT_Y + GAP_Y*3, W);

    // fan-out connectors with distinct start points on COMFI bottom
    const kids = MODS.map(m=>nodes[m.id]).sort((a,b)=>a.cx - b.cx);
    const startLeft  = rootX - NODE_W/2 + ROOT_PAD;
    const startRight = rootX + NODE_W/2 - ROOT_PAD;
    const step = (kids.length>1) ? (startRight - startLeft) / (kids.length - 1) : 0;

    kids.forEach((ch, i) => {
      const sx = (kids.length === 1) ? rootX : startLeft + i*step;
      addCurve(sx, ROOT_Y + NODE_H/2, ch.cx, ch.cy - NODE_H/2, ch.row);
    });

    wrap.appendChild(svg);
  }

  function placeRow(arr, rootX, y, W){
    const marginX = Math.max(MARGIN_X_MIN, W*0.08);
    const span = (W - 2*marginX) / (arr.length - 1 || 1);
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

    const txt = document.createElementNS(svg.namespaceURI, "text");
    txt.setAttribute("x", cx); txt.setAttribute("y", cy + 5);
    txt.setAttribute("text-anchor","middle");
    txt.textContent = m.title || "COMFI";
    g.appendChild(txt);

    svg.appendChild(g);

    if (isRoot){
      g.addEventListener("click", clearActive);               // clicking COMFI = close
    } else {
      g.addEventListener("click", () => toggleMod(m));        // toggle on/off
    }

    nodes[m.id] = { g, cx, cy, row:m.row };
  }

  function addCurve(x1,y1,x2,y2,row){
    // row-specific curvature so paths travel in separate vertical "channels"
    const dy = y2 - y1;
    const bend = [50, 90, 130][row] || 80; // top/mid/bottom separation
    const dx = x2 - x1;

    const c1x = x1 + dx * 0.20;
    const c1y = y1 + Math.sign(dy) * bend * 0.7;
    const c2x = x2 - dx * 0.20;
    const c2y = y2 - Math.sign(dy) * bend * 0.7;

    const p = document.createElementNS(svg.namespaceURI, "path");
    p.setAttribute("d", `M ${x1} ${y1} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x2} ${y2}`);
    p.setAttribute("class","ds-connector");
    svg.appendChild(p);
  }

  /* --- Popover / selection --- */
  function toggleMod(mod){
    // toggle behavior
    if (activeId === mod.id){
      clearActive();
      return;
    }
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

    const header = document.createElement("div");
    header.className = "ds-pop-header";
    header.textContent = mod.title;
    if (mod.info.rate){
      const rate = document.createElement("span");
      rate.className = "ds-rate"; rate.textContent = mod.info.rate;
      header.appendChild(rate);
    }

    const body = document.createElement("div"); body.className = "ds-pop-body";
    if (mod.info.desc){
      const desc = document.createElement("div");
      desc.className="ds-desc"; desc.textContent = mod.info.desc;
      body.appendChild(desc);
    }

    const subj = $("#ds-subject").value || "<ID>";
    const task = $("#ds-task").value || "<task>";
    (mod.info.groups || []).forEach(gr => {
      const h = document.createElement("div");
      h.className = "ds-subhead";
      h.textContent = gr.title || "";
      if (gr.note){
        const n = document.createElement("span"); n.className="ds-subnote"; n.textContent = `(${gr.note})`;
        h.appendChild(n);
      }
      body.appendChild(h);

      (gr.paths || []).forEach(pth => {
        const resolved = resolvePath(pth, subj, task);
        const row = document.createElement("div"); row.className="ds-path-row";
        const code = document.createElement("code"); code.className="ds-path"; code.textContent = resolved;
        const btn = document.createElement("button"); btn.className="ds-copy"; btn.textContent="Copy";
        btn.onclick = ()=>copyText(resolved, btn);
        row.appendChild(code); row.appendChild(btn); body.appendChild(row);
      });
    });

    pop.appendChild(header); pop.appendChild(body); wrap.appendChild(pop);
    positionPopover(pop, node);

    window.addEventListener("resize", relayout, { passive:true });
    wrap.addEventListener("scroll", relayout, { passive:true });
    function relayout(){ if(pop && activeId===mod.id) positionPopover(pop, nodes[mod.id]); }
  }

  // Row 0 (top) -> open BELOW; Row 1 & 2 -> open ABOVE (so it doesn’t cover lower rows)
  function positionPopover(pop, node){
    const wrap = $("#ds-svg-wrap");
    const nbox = node.g.getBoundingClientRect();
    const wbox = wrap.getBoundingClientRect();
    const gap = 12;

    let left = nbox.left - wbox.left + nbox.width/2 - pop.offsetWidth/2;
    left = Math.max(12, Math.min(wrap.clientWidth - pop.offsetWidth - 12, left));

    let top;
    if (node.row === 0){
      pop.dataset.arrow = "down";
      top = nbox.bottom - wbox.top + gap;
    } else {
      pop.dataset.arrow = "up";
      top = nbox.top - wbox.top - pop.offsetHeight - gap;
    }

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

    subjSel.addEventListener("change", ()=>{ if (activeId && pop) showPopover(MODS.find(m=>m.id===activeId), nodes[activeId]); });
    taskSel.addEventListener("change", ()=>{ if (activeId && pop) showPopover(MODS.find(m=>m.id===activeId), nodes[activeId]); });

    buildSVG();        // start: no popover, hint visible
  });
})();
