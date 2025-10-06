import React, { useCallback, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  MarkerType,
  useNodesState,
  useEdgesState,
} from "reactflow";
import "reactflow/dist/style.css";

// FIX: remove `file-saver` (CDN ESM doesn't expose named `saveAs` as expected)
// Use browser-native download helpers instead.
import { toPng, toSvg } from "html-to-image";

// ---------- download helpers (no external deps) ----------
function downloadDataUrl(dataUrl, filename, { previewOnly = false } = {}) {
  if (previewOnly) return { href: dataUrl, filename };
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  return { href: dataUrl, filename };
}

function downloadBlob(blob, filename, { previewOnly = false } = {}) {
  const url = URL.createObjectURL(blob);
  if (!previewOnly) {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  // small delay to allow any pending navigation to start
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return { href: url, filename };
}
// --------------------------------------------------------

// Simple, readable node styles
const stepStyle = {
  borderRadius: 16,
  padding: 12,
  border: "1px solid #e5e7eb",
  background: "#ffffff",
  width: 360,
  boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
};

const decisionStyle = {
  ...stepStyle,
  width: 380,
  background: "#fff7ed", // subtle amber for decisions
  border: "1px solid #fed7aa",
};

const title = (t) => (
  <div style={{ fontWeight: 700, marginBottom: 4 }}>{t}</div>
);
const bullets = (items) => (
  <ul style={{ margin: 0, paddingLeft: 18 }}>
    {items.map((it, i) => (
      <li key={i} style={{ fontSize: 12, lineHeight: 1.3 }}>{it}</li>
    ))}
  </ul>
);

const initialNodes = [
  {
    id: "s1",
    position: { x: 160, y: 0 },
    data: {
      label: (
        <div style={stepStyle}>
          {title("Step 1 — Intake & triage")}
          {bullets([
            "Define questions, constraints, risk; register object IDs",
            "Record provenance, condition, prior treatments; sampling limits",
          ])}
        </div>
      ),
    },
    type: "default",
  },
  {
    id: "d1",
    position: { x: 160, y: 140 },
    data: {
      label: (
        <div style={decisionStyle}>
          {title("Decision — Need material IDs (not just mapping)?")}
          {bullets(["If yes, pre-plan XRF/FTIR confirmation."])}
        </div>
      ),
    },
    type: "default",
  },
  {
    id: "s2",
    position: { x: 160, y: 280 },
    data: {
      label: (
        <div style={stepStyle}>
          {title("Step 2 — Visual & historical survey")}
          {bullets([
            "Macro/micro exam; note stratigraphy indicators",
            "Extract candidate pigments from timeline/literature (working theory)",
          ])}
        </div>
      ),
    },
    type: "default",
  },
  {
    id: "s3",
    position: { x: 160, y: 420 },
    data: {
      label: (
        <div style={stepStyle}>
          {title("Step 3 — Acquisition plan")}
          {bullets([
            "Imaging: three registered monochrome IR bands (LWP/BP/SWP)",
            "XRF: define non-contact spots; repeats + standards",
            "FTIR: reflection first; reserve micro-ATR for stable points",
            "Microscopy/microsampling: only if non-contact insufficient; sampling dossier",
          ])}
        </div>
      ),
    },
    type: "default",
  },
  {
    id: "d2",
    position: { x: 160, y: 620 },
    data: {
      label: (
        <div style={decisionStyle}>
          {title("Decision — Pilot shows mis-registration or illumination falloff?")}
          {bullets(["If yes, re-capture before analysis (app will not register bands)."])}
        </div>
      ),
    },
    type: "default",
  },
  {
    id: "s4",
    position: { x: 160, y: 780 },
    data: {
      label: (
        <div style={stepStyle}>
          {title("Step 4 — Data capture")}
          {bullets([
            "Acquire three IR bands; embed IDs/band names/coords; log T/RH/light",
            "XRF ROIs with calibration + QC standard",
            "FTIR background + sample; document mode, resolution, scans, corrections",
          ])}
        </div>
      ),
    },
    type: "default",
  },
  {
    id: "s5",
    position: { x: 160, y: 960 },
    data: {
      label: (
        <div style={stepStyle}>
          {title("Step 5 — Pre-processing (app)")}
          {bullets([
            "Load TIFFs; verify identical dimensions",
            "Optional: dark-frame, flat-field; pre-equalize means",
            "Stretch + gamma; gray-world or white-patch balance",
            "Optional: decorrelation stretch / saturation boost",
          ])}
        </div>
      ),
    },
    type: "default",
  },
  {
    id: "d3",
    position: { x: 160, y: 1160 },
    data: {
      label: (
        <div style={decisionStyle}>
          {title("Decision — Channel shape mismatch or ghosting visible?")}
          {bullets(["If yes, stop and re-capture."])}
        </div>
      ),
    },
    type: "default",
  },
  {
    id: "s6",
    position: { x: 160, y: 1320 },
    data: {
      label: (
        <div style={stepStyle}>
          {title("Step 6 — Multivariate exploration (in app)")}
          {bullets([
            "PCA helper: choose PC→RGB mapping; scaling",
            "Segment with PC1 masks; lasso clusters; review band signatures",
            "Ratio composite: R/G, B/R, (SWP−BP)/(SWP+BP); tune",
            "Save ROI overlays and ROI CSV (targets for XRF/FTIR/microscopy)",
          ])}
        </div>
      ),
    },
    type: "default",
  },
  {
    id: "s7",
    position: { x: -220, y: 1520 },
    data: {
      label: (
        <div style={stepStyle}>
          {title("Step 7 — Identification & interpretation")}
          {bullets([
            "XRF: acquire per ROI; interpret elemental patterns; map back to classes",
            "If ambiguous (e.g., Cu blues), escalate to FTIR/microsampling",
            "FTIR: reflection first; if weak/derivative issues → micro-ATR",
            "Microsampling + stereo/PLM; chain-of-custody; correlate modalities",
          ])}
        </div>
      ),
    },
    type: "default",
  },
  {
    id: "d4",
    position: { x: 540, y: 1520 },
    data: {
      label: (
        <div style={decisionStyle}>
          {title("Decision — Modalities disagree?")}
          {bullets(["Document alternatives; plan follow-ups (Raman, GC-MS, etc.)"])}
        </div>
      ),
    },
    type: "default",
  },
  {
    id: "s8",
    position: { x: 160, y: 1760 },
    data: {
      label: (
        <div style={stepStyle}>
          {title("Step 8 — Synthesis, reporting, preservation")}
          {bullets([
            "Compile report: app PNGs, ROI CSV, Markdown, spectra/files/params, logs, uncertainties",
            "Recommend preventive measures; list further analyses",
            "Archive raw data + metadata for repeatability",
          ])}
        </div>
      ),
    },
    type: "default",
  },
];

const initialEdges = [
  { id: "e1", source: "s1", target: "d1", markerEnd: { type: MarkerType.ArrowClosed } },
  { id: "e2", source: "d1", target: "s2", markerEnd: { type: MarkerType.ArrowClosed } },
  { id: "e3", source: "s2", target: "s3", markerEnd: { type: MarkerType.ArrowClosed } },
  { id: "e4", source: "s3", target: "d2", markerEnd: { type: MarkerType.ArrowClosed } },
  { id: "e5", source: "d2", target: "s4", markerEnd: { type: MarkerType.ArrowClosed } },
  { id: "e6", source: "s4", target: "s5", markerEnd: { type: MarkerType.ArrowClosed } },
  { id: "e7", source: "s5", target: "d3", markerEnd: { type: MarkerType.ArrowClosed } },
  { id: "e8", source: "d3", target: "s6", markerEnd: { type: MarkerType.ArrowClosed } },
  // Branch: identification & interpretation and disagreement check in parallel lane
  { id: "e9", source: "s6", target: "s7", markerEnd: { type: MarkerType.ArrowClosed } },
  { id: "e10", source: "s6", target: "d4", markerEnd: { type: MarkerType.ArrowClosed } },
  // Rejoin to Step 8
  { id: "e11", source: "s7", target: "s8", markerEnd: { type: MarkerType.ArrowClosed } },
  { id: "e12", source: "d4", target: "s8", markerEnd: { type: MarkerType.ArrowClosed } },
];

export default function WorkflowFlowchart() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [testResults, setTestResults] = useState([]);
  const onInit = useCallback((instance) => instance.fitView({ padding: 0.2 }), []);

  // capture ref for export
  const containerRef = useRef(null);

  // export handlers
  async function exportPNG() {
    if (!containerRef.current) return;
    const dataUrl = await toPng(containerRef.current, { pixelRatio: 2, cacheBust: true });
    downloadDataUrl(dataUrl, "ir-workflow.png");
  }

  async function exportSVG() {
    if (!containerRef.current) return;
    const dataUrl = await toSvg(containerRef.current, { cacheBust: true }); // data:image/svg+xml;base64,...
    // convert data URL → Blob (works cross-browser)
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    downloadBlob(blob, "ir-workflow.svg");
  }

  // --------- lightweight self-tests (no downloads triggered) ---------
  async function runSelfTests() {
    const results = [];
    try {
      // T1: html-to-image PNG generation on a tiny temp element
      const temp = document.createElement("div");
      temp.textContent = "png-test";
      temp.style.width = "120px";
      temp.style.height = "60px";
      temp.style.background = "#eee";
      (containerRef.current || document.body).appendChild(temp);
      const pngUrl = await toPng(temp, { cacheBust: true });
      const pngOk = typeof pngUrl === "string" && pngUrl.startsWith("data:image/png");
      results.push({ name: "T1: toPng returns data URL", pass: pngOk });
      temp.remove();

      // T2: toSvg on a simple element should yield a data URL
      const temp2 = document.createElement("div");
      temp2.textContent = "svg-test";
      temp2.style.width = "80px";
      temp2.style.height = "40px";
      (containerRef.current || document.body).appendChild(temp2);
      const svgUrl = await toSvg(temp2, { cacheBust: true });
      const svgOk = typeof svgUrl === "string" && svgUrl.startsWith("data:image/svg+xml");
      results.push({ name: "T2: toSvg returns data URL", pass: svgOk });
      temp2.remove();

      // T3: download helpers (preview mode) should not throw
      const r1 = downloadDataUrl("data:text/plain;base64,SGVsbG8=", "test.txt", { previewOnly: true });
      const r2 = downloadBlob(new Blob(["hello"], { type: "text/plain" }), "test.txt", { previewOnly: true });
      results.push({ name: "T3: download helpers (dry-run)", pass: !!r1 && !!r2 });

      setTestResults(results);
    } catch (err) {
      results.push({ name: "Unexpected error in tests", pass: false, error: String(err) });
      setTestResults(results);
    }
  }
  // -------------------------------------------------------------------

  return (
    <div className="w-full h-[86vh] bg-white">
      <div className="p-4 flex items-center justify-between gap-3">
        <div className="text-xl font-semibold">IR Imaging & Spectroscopy — Visual Workflow</div>
        <div className="flex items-center gap-2">
          <button onClick={exportPNG} className="px-3 py-1 rounded-2xl border">Export PNG</button>
          <button onClick={exportSVG} className="px-3 py-1 rounded-2xl border">Export SVG</button>
          <button onClick={runSelfTests} className="px-3 py-1 rounded-2xl border">Run self‑tests</button>
        </div>
      </div>

      {/* Wrap the diagram area in a ref so html-to-image can snapshot it */}
      <div ref={containerRef} className="w-full h-[75vh] bg-white">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onInit={onInit}
          fitView
        >
          <Background />
          <MiniMap pannable zoomable />
          <Controls />
        </ReactFlow>
      </div>

      <div className="p-4 text-sm text-gray-700">
        Assumptions: snapshot should include the diagram, minimap, and controls exactly as visible. SVG is preferred for print; PNG (2× pixel ratio) is for slides/email.
      </div>

      {/* simple test report */}
      {testResults.length > 0 && (
        <div className="px-4 pb-4">
          <div className="text-sm font-semibold mb-2">Self‑test results</div>
          <ul className="text-sm list-disc ml-5">
            {testResults.map((t, i) => (
              <li key={i} className={t.pass ? "text-green-700" : "text-red-700"}>
                {t.name}: {t.pass ? "PASS" : `FAIL${t.error ? ` — ${t.error}` : ""}`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
