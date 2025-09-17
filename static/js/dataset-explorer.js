"use strict";

/* Source-of-truth (from your PDF) */
const DSX = [
  {
    name: "videos",
    kind: "modality",
    rate: "≈ 40 Hz (per camera)",
    desc: "RGB videos from multiple viewpoints.",
    children: [
      {
        name: "COMFI/<ID>/<task>/camera_{0,2,4,6}.mp4",
        kind: "files",
        desc: "Per-subject, per-task multi-view videos (e.g., camera_0.mp4, camera_2.mp4, camera_4.mp4, camera_6.mp4).",
      },
    ],
  },
  {
    name: "mocap",
    kind: "modality",
    rate: "C3D 100 Hz; aligned CSV 40 Hz",
    desc: "Optical motion capture: markers, joint angles, centers.",
    children: [
      { name: "COMFI/<ID>/<task>/{task}.c3d", kind: "file", desc: "Raw C3D file (100 Hz)." },
      { name: "COMFI/<ID>/<task>/raw/*.csv", kind: "folder", desc: "Raw CSVs (markers, model markers, joint centers/angles)." },
      { name: "COMFI/<ID>/<task>/aligned/joint_angles.csv", kind: "file", desc: "Aligned to common timeline (40 Hz)." },
      { name: "COMFI/<ID>/<task>/aligned/joint_center.csv", kind: "file", desc: "Aligned to common timeline (40 Hz)." },
      { name: "COMFI/<ID>/<task>/aligned/markers.csv", kind: "file", desc: "Aligned to common timeline (40 Hz)." },
      { name: "COMFI/<ID>/<task>/aligned/markers_model.csv", kind: "file", desc: "Aligned to common timeline (40 Hz)." },
      { name: "COMFI/<ID>/{ID}.vsk", kind: "file", desc: "Subject skeleton calibration." },
    ],
  },
  {
    name: "forces",
    kind: "modality",
    rate: "raw 1000 Hz → aligned 40 Hz",
    desc: "Wearable and environment force/IMU signals.",
    children: [
      { name: "COMFI/<ID>/<task>/raw/{task}_devices.csv", kind: "file", desc: "Raw sensors at 1000 Hz." },
      { name: "COMFI/<ID>/<task>/aligned/{task}_devices.csv", kind: "file", desc: "Aligned to common 40 Hz timeline." },
    ],
  },
  {
    name: "robot",
    kind: "modality",
    rate: "raw ~200 Hz → aligned 40 Hz",
    desc: "Robot topics for sanding/welding tasks.",
    children: [
      { name: "COMFI/<ID>/raw/robot_sanding.bag", kind: "file", desc: "ROS bag (raw)." },
      { name: "COMFI/<ID>/raw/robot_welding.bag", kind: "file", desc: "ROS bag (raw)." },
      { name: "COMFI/<ID>/aligned/robot_sanding.csv", kind: "file", desc: "Aligned CSV (40 Hz)." },
      { name: "COMFI/<ID>/aligned/robot_welding.csv", kind: "file", desc: "Aligned CSV (40 Hz)." },
    ],
  },
  {
    name: "cam_params",
    kind: "support",
    desc: "Per-subject camera calibration.",
    children: [
      { name: "COMFI/<ID>/cam_params.yaml", kind: "file", desc: "Intrinsic/extrinsic parameters." },
      { name: "COMFI/<ID>/images/*.png", kind: "folder", desc: "Calibration images." },
    ],
  },
  {
    name: "metadata",
    kind: "support",
    desc: "Per-subject descriptors and subject URDF.",
    children: [
      { name: "COMFI/<ID>/metadata/{ID}.yaml", kind: "file", desc: "Subject metadata." },
      { name: "COMFI/<ID>/metadata/{ID}_scaled.urdf", kind: "file", desc: "Scaled URDF for the subject." },
    ],
  },
];

/* Render */
(function () {
  const $tree = document.getElementById("dsx-tree");
  const $id = document.getElementById("dsx-id");
  const $task = document.getElementById("dsx-task");

  function resolvePath(tmpl) {
    return tmpl
      .replaceAll("<ID>", $id.value.trim() || "<ID>")
      .replaceAll("<task>", $task.value.trim() || "<task>");
  }

  function nodeRow(title, opts = {}) {
    const row = document.createElement("div");
    row.className = "dsx-row";
    const t = document.createElement("span");
    t.textContent = title;
    t.className = "dsx-toggle";
    row.appendChild(t);

    if (opts.kind) {
      const k = document.createElement("span");
      k.textContent = opts.kind;
      k.className = "dsx-kind";
      row.appendChild(k);
    }
    if (opts.rate) {
      const r = document.createElement("span");
      r.textContent = opts.rate;
      r.className = "dsx-rate";
      row.appendChild(r);
    }
    if (opts.desc) {
      const d = document.createElement("span");
      d.textContent = opts.desc;
      d.className = "dsx-desc";
      row.appendChild(d);
    }
    return row;
  }

  function leaf(path, desc = "") {
    const wrap = document.createElement("div");
    wrap.className = "dsx-leaf";
    const row = document.createElement("div");
    row.className = "dsx-row";
    const code = document.createElement("code");
    code.className = "dsx-path";
    code.textContent = resolvePath(path);
    row.appendChild(code);
    if (desc) {
      const d = document.createElement("span");
      d.textContent = " – " + desc;
      d.className = "dsx-desc";
      row.appendChild(d);
    }
    const btn = document.createElement("button");
    btn.className = "dsx-btn dsx-copy";
    btn.textContent = "Copy";
    btn.onclick = async () => {
      try { await navigator.clipboard.writeText(code.textContent); btn.textContent = "Copied!"; }
      catch { btn.textContent = "Copy failed"; }
      finally { setTimeout(() => (btn.textContent = "Copy"), 1200); }
    };
    row.appendChild(btn);
    wrap.appendChild(row);
    return wrap;
  }

  function buildNode(node) {
    const container = document.createElement("div");
    container.className = "dsx-node";

    const row = nodeRow(node.name, { kind: node.kind, rate: node.rate, desc: node.desc });
    container.appendChild(row);

    if (node.children && node.children.length) {
      const kids = document.createElement("div");
      kids.className = "dsx-children";
      kids.style.display = "none";
      node.children.forEach(child => {
        if (child.children) {
          kids.appendChild(buildNode(child));
        } else {
          kids.appendChild(leaf(child.name, child.desc || ""));
        }
      });
      container.appendChild(kids);
      row.querySelector(".dsx-toggle").onclick = () => {
        kids.style.display = (kids.style.display === "none") ? "" : "none";
      };
    }
    return container;
  }

  function render() {
    $tree.innerHTML = "";
    DSX.forEach(node => $tree.appendChild(buildNode(node)));
  }

  $id.addEventListener("input", render);
  $task.addEventListener("change", render);
  render();
})();
