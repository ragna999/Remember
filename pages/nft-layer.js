import React, { useState, useRef } from "react";
import { useRouter } from "next/router";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

export default function NFTLayer() {
  const router = useRouter();
  const [layers, setLayers] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(
    typeof window !== "undefined" &&
      !!localStorage.getItem("memories") &&
      !!localStorage.getItem("memories")
  );
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const [status, setStatus] = useState("Ready");
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewHistory, setPreviewHistory] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [generating, setGenerating] = useState(false);
  const [generateCount, setGenerateCount] = useState(10);
  const canvasRef = useRef(null);

  // NEW: UI-controlled metadata fields
  const [metaNameTemplate, setMetaNameTemplate] = useState("NFT #"); // template, use '#' as slot
  const [metaDescription, setMetaDescription] = useState("e.g generated memories by gimly");

  // Weighted pick by rarity
  function pickByRarity(traits) {
    const normalized = traits.map((t) => ({ ...t, rarity: Number(t.rarity) || 1 }));
    const total = normalized.reduce((sum, t) => sum + t.rarity, 0);
    if (total <= 0) return normalized[0];
    const rand = Math.random() * total;
    let cumulative = 0;
    for (const t of normalized) {
      cumulative += t.rarity;
      if (rand <= cumulative) return t;
    }
    return normalized[0];
  }

  // Draw helper
  const drawImageToCanvas = (ctx, src, width, height) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const wr = width / img.width;
        const hr = height / img.height;
        const scale = Math.max(wr, hr);
        const w = img.width * scale;
        const h = img.height * scale;
        const x = (width - w) / 2;
        const y = (height - h) / 2;
        try {
          ctx.drawImage(img, x, y, w, h);
        } catch (e) {
          // fallback contain
          const scale2 = Math.min(wr, hr);
          const w2 = img.width * scale2;
          const h2 = img.height * scale2;
          const x2 = (width - w2) / 2;
          const y2 = (height - h2) / 2;
          ctx.drawImage(img, x2, y2, w2, h2);
        }
        resolve();
      };
      img.onerror = () => resolve();
      img.src = src;
    });
  };

  // === Combine preview ===
  const handlePreviewCombine = async (direction = "next") => {
    if (!layers.length) return setStatus("⚠️ No layers to combine.");

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const selectedTraits = [];

    for (const layer of layers) {
      const traits = layer.traits || [];
      if (!traits.length) continue;
      const pick = pickByRarity(traits);
      if (!pick) continue;
      selectedTraits.push({ layer: layer.name, trait: pick.displayName });
      if (pick.url) await drawImageToCanvas(ctx, pick.url, canvas.width, canvas.height);
    }

    const url = canvas.toDataURL("image/png");
    const entry = { url, traits: selectedTraits };

    let newHistory = [...previewHistory];
    let newIndex = currentIndex;

    if (direction === "next") {
      newHistory.push(entry);
      newIndex = newHistory.length - 1;
    } else if (direction === "prev") {
      if (currentIndex > 0) {
        newIndex = currentIndex - 1;
      } else {
        // nothing to go back to
        setStatus("No previous preview.");
        return;
      }
    }

    if (direction === "prev") {
      setPreviewUrl(newHistory[newIndex].url);
      setCurrentIndex(newIndex);
      setStatus("✅ Preview moved to previous");
      return;
    }

    setPreviewHistory(newHistory);
    setCurrentIndex(newIndex);
    setPreviewUrl(entry.url);
    setStatus("✅ Preview updated");
  };

  // Utility: build name from template and index
  function buildNameFromTemplate(template, i) {
    if (!template || !template.trim()) return `NFT #${i}`;
    if (template.includes("#")) {
      return template.replace(/#/g, `${i}`);
    }
    // if no hash slot, append
    return `${template} #${i}`;
  }

  // === Generate ZIP ===
  const handleGenerateZip = async () => {
    if (!layers.length) return setStatus("⚠️ Add layers first!");
    setGenerating(true);
    setStatus("Generating ZIP...");

    const zip = new JSZip();
    const imagesFolder = zip.folder("images");
    const metaFolder = zip.folder("metadata");
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const count = parseInt(generateCount, 10) || 10;
    const metadataIndex = [];

    for (let i = 1; i <= count; i++) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const selectedTraits = [];

      for (const layer of layers) {
        const traits = layer.traits || [];
        if (!traits.length) continue;
        const pick = pickByRarity(traits);
        if (!pick) continue;
        selectedTraits.push({ layer: layer.name, trait: pick.displayName });
        if (pick.url) await drawImageToCanvas(ctx, pick.url, canvas.width, canvas.height);
      }

      const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
      imagesFolder.file(`${i}.png`, blob);

      // Use user-provided template and description
      const computedName = buildNameFromTemplate(metaNameTemplate, i);
      const computedDesc = metaDescription && metaDescription.trim() ? metaDescription : "Generated NFT";

      const metadata = {
        name: computedName,
        description: computedDesc,
        image: `images/${i}.png`,
        attributes: selectedTraits.map((t) => ({
          trait_type: t.layer,
          value: t.trait,
        })),
      };
      metaFolder.file(`${i}.json`, JSON.stringify(metadata, null, 2));
      metadataIndex.push(metadata);
      setStatus(`Rendered ${i}/${count}`);
      // small yield to keep UI responsive
      await new Promise((r) => setTimeout(r, 20));
    }

    zip.file("metadata_index.json", JSON.stringify(metadataIndex, null, 2));
    const blobZip = await zip.generateAsync({ type: "blob" });
    saveAs(blobZip, "memories.zip");
    setStatus("✅ Export complete!");
    setGenerating(false);
  };

  // Add layer helper
  const addLayer = () => {
    setLayers((prev) => [
      ...prev,
      { id: Date.now(), name: `Layer ${prev.length + 1}`, traits: [], collapsed: false },
    ]);
  };

  // Remove single trait
  const removeTrait = (layerIdx, traitIdx) => {
    const updated = [...layers];
    updated[layerIdx].traits.splice(traitIdx, 1);
    setLayers(updated);
  };

  // Remove layer
  const removeLayer = (layerIdx) => {
    const updated = [...layers];
    updated.splice(layerIdx, 1);
    setLayers(updated);
  };  
  
  return (
    <>
      <style>{`
      body {
        font-family: Tahoma, Verdana, sans-serif;
        background-image: url("/assets/background.png");
        background-repeat: no-repeat;
        background-position: center;
        background-size: cover;       /* 🟢 skala ikut layar */
        background-attachment: fixed;
      }
      .windows-layout {
        display: flex;
        gap: 20px;
        padding: 20px;
      }
      .xp-window {
        background: #ece9d8;
        border: 2px solid #999;
        border-radius: 6px;
        box-shadow: inset 1px 1px #fff, inset -1px -1px #555;
        flex: 1;
        display: flex;
        flex-direction: column;
      }
      .xp-titlebar {
        background: linear-gradient(to bottom, #0050ef, #003399);
        color: white;
        font-weight: bold;
        padding: 6px 10px;
        border-bottom: 1px solid #002266;
      }
      .xp-content {
        padding: 12px;
        overflow-y: auto;
      }
      .btn {
        background: linear-gradient(to bottom, #e8f0ff, #b8cfff);
        border: 1px solid #5b85d9;
        padding: 5px 8px;
        font-weight: bold;
        color: #002b88;
        cursor: pointer;
        border-radius: 3px;
      }
      .btn:hover { background: #d0e0ff; }
      .layer-card {
        border: 1px solid #aaa;
        border-radius: 4px;
        padding: 6px;
        background: #fff;
        margin-top: 8px;
      }
      .trait-list {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        margin-top: 6px;
      }
      .trait-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        border: 1px solid #999;
        padding: 6px;
        border-radius: 3px;
        background: #fdfdfd;
        width: 96px;
      }
      .trait-item img {
        width: 64px;
        height: 64px;
        border: 1px solid #999;
        object-fit: cover;
      }
      input[type="text"], input[type="range"], input[type="number"] {
        width: 100%;
        box-sizing: border-box;
        margin-top: 6px;
        padding: 4px;
        border: 1px solid #999;
        border-radius: 3px;
      }
      `}</style>
<Navbar/>

      {/* WINDOWS */}
      <div className="windows-layout" style={{ marginTop: 60 }}>
        {/* LEFT PANEL */}
        <div className="xp-window">
          <div className="xp-titlebar">Layer Setup</div>
          <div className="xp-content">
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn" onClick={addLayer}>
                + Add Layer
              </button>
            </div>

            {layers.map((layer, i) => (
              <div key={layer.id} className="layer-card" style={{ marginTop: 12 }}>
                {/* Header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    userSelect: "none",
                    background: "#d8d8d0",
                    borderRadius: 4,
                    padding: "6px 8px",
                    fontWeight: 600,
                  }}
                  onClick={() => {
                    const updated = [...layers];
                    updated[i].collapsed = !updated[i].collapsed;
                    setLayers(updated);
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14 }}>{layer.collapsed ? "▶" : "▼"}</span>
                    <input
                      type="text"
                      value={layer.name}
                      onChange={(e) => {
                        const updated = [...layers];
                        updated[i].name = e.target.value;
                        setLayers(updated);
                      }}
                      style={{
                        border: "none",
                        background: "transparent",
                        fontWeight: 700,
                        width: 160,
                        outline: "none",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeLayer(i);
                      }}
                      style={{ padding: "4px 8px" }}
                    >
                      ❌
                    </button>
                  </div>
                </div>

                {/* Body */}
                {!layer.collapsed && (
                  <div style={{ marginTop: 8 }}>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => {
                        const files = Array.from(e.target.files).map((f, idx) => ({
                          id: Date.now() + idx + Math.random(),
                          name: f.name,
                          displayName: f.name.replace(/\.[^/.]+$/, ""),
                          rarity: 1,
                          url: URL.createObjectURL(f),
                          originalFile: f,
                        }));
                        const updated = [...layers];
                        updated[i].traits = [...(updated[i].traits || []), ...files];
                        setLayers(updated);
                      }}
                    />

                    <div className="trait-list" style={{ marginTop: 8 }}>
                      {(layer.traits || []).map((t, j) => (
                        <div key={t.id || j} className="trait-item">
                          <img src={t.url} alt={t.name} />
                          <input
                            type="text"
                            value={t.displayName}
                            onChange={(e) => {
                              const updated = [...layers];
                              updated[i].traits[j].displayName = e.target.value;
                              setLayers(updated);
                            }}
                            placeholder="Name"
                          />
                          <label style={{ fontSize: 12, marginTop: 4 }}>
                            Rarity: {t.rarity}%
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={t.rarity}
                            onChange={(e) => {
                              const updated = [...layers];
                              updated[i].traits[j].rarity = parseInt(e.target.value, 10);
                              setLayers(updated);
                            }}
                          />
                          <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
                            <button
                              className="btn"
                              onClick={() => {
                                const updated = [...layers];
                                const copy = { ...updated[i].traits[j], id: Date.now() + Math.random() };
                                updated[i].traits.splice(j + 1, 0, copy);
                                setLayers(updated);
                              }}
                            >
                              ⎘
                            </button>
                            <button
                              className="btn"
                              onClick={() => removeTrait(i, j)}
                              style={{ background: "#ffd6d6", borderColor: "#d66" }}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="xp-window">
          <div className="xp-titlebar">Preview & Export</div>
          <div className="xp-content">
            {/* hidden canvas used for composition */}
            <canvas
              ref={canvasRef}
              width={1024}
              height={1024}
              style={{
                display: "none",
              }}
            />

            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Preview result"
                style={{
                  width: "100%",
                  borderRadius: 4,
                  border: "1px solid #aaa",
                  background: "#fff",
                }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: 400,
                  background: "#ddd",
                  border: "1px solid #aaa",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  color: "#555",
                }}
              >
                No preview yet
              </div>
            )}

            <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
              <button
                className="btn"
                onClick={() => {
                  handlePreviewCombine("next");
                }}
                style={{ marginLeft: 8 }}
              >
                Randomize
              </button>
            </div>

            {/* NEW: Metadata inputs */}
            <div style={{ marginTop: 12 }}>
              <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>Name template (use # for number slot)</label>
              <input
                type="text"
                value={metaNameTemplate}
                onChange={(e) => setMetaNameTemplate(e.target.value)}
                placeholder="e.g. CoolCollection #"
              />
              <div style={{ marginTop: 8 }}>
                <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>Description</label>
                <input
                  type="text"
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  placeholder="Short description for all items"
                />
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <label>quantity:</label>
              <input
                type="number"
                min="1"
                max="500"
                value={generateCount}
                onChange={(e) => setGenerateCount(e.target.value)}
              />
            </div>

            <div style={{ marginTop: 10 }}>
              <button
                className="btn"
                onClick={handleGenerateZip}
                disabled={generating}
              >
                {generating ? "Generating..." : "Generate ZIP"}
              </button>
            </div>

            <div style={{ marginTop: 10 }}>
              <strong>Status:</strong> {status}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
