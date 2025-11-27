import React, { useState, useEffect, useRef } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { useRouter } from "next/router";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

export default function EditPage() {
  const router = useRouter();
  const [files, setFiles] = useState([]);
  const [brightness, setBrightness] = useState(1);
  const [contrast, setContrast] = useState(1);
  const [saturation, setSaturation] = useState(1);
  const [hue, setHue] = useState(0);

  const [exportFormat, setExportFormat] = useState("png"); // png | jpg
  const [jpgQuality, setJpgQuality] = useState(0.9);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const dropRef = useRef(null);

  // === drag & drop ===
  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    const onDragOver = (e) => {
      e.preventDefault();
      el.classList.add("drag-over");
    };
    const onDragLeave = () => el.classList.remove("drag-over");
    const onDrop = (e) => {
      e.preventDefault();
      el.classList.remove("drag-over");
      if (e.dataTransfer?.files?.length)
        handleFiles(Array.from(e.dataTransfer.files));
    };
    el.addEventListener("dragover", onDragOver);
    el.addEventListener("dragleave", onDragLeave);
    el.addEventListener("drop", onDrop);
    return () => {
      el.removeEventListener("dragover", onDragOver);
      el.removeEventListener("dragleave", onDragLeave);
      el.removeEventListener("drop", onDrop);
    };
  }, []);

  function handleFiles(selectedFiles) {
    const arr = Array.from(selectedFiles)
      .filter((f) => f.type?.startsWith("image/"))
      .map((f) => ({
        id: Math.random().toString(36).slice(2),
        file: f,
        name: f.name,
        url: URL.createObjectURL(f),
        originalUrl: URL.createObjectURL(f), // keep original for reset
        rotate: 0, // degrees
        scale: 1,
      }));
    setFiles((prev) => [...prev, ...arr]);
  }

  // Helper: build canvas from image + current global sliders + per-file rotate/scale
  async function renderToCanvas(imgSrc, fileObj, opts = {}) {
    const img = await loadImage(imgSrc);
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");

    const deg = (fileObj?.rotate || 0) + (opts.rotate || 0);
    const rad = (deg * Math.PI) / 180;
    const scale = fileObj?.scale || 1;

    ctx.save();
    ctx.filter = `brightness(${opts.brightness ?? brightness}) contrast(${
      opts.contrast ?? contrast
    }) saturate(${opts.saturation ?? saturation}) hue-rotate(${
      opts.hue ?? hue
    }deg)`;

    if (deg !== 0 || scale !== 1) {
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(rad);
      ctx.scale(scale, scale);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
    } else {
      ctx.drawImage(img, 0, 0);
    }
    ctx.restore();

    return canvas;
  }

  // === Batch Save (zip) ===
  async function handleSaveAll() {
    const zip = new JSZip();
    const folder = zip.folder("edited_images");

    const toExport = files.filter(
      (f) => selectedIds.size === 0 || selectedIds.has(f.id)
    );

    for (const f of toExport) {
      const canvas = await renderToCanvas(f.url, f, {
        brightness,
        contrast,
        saturation,
        hue,
      });

      if (exportFormat === "png") {
        const blob = await new Promise((res) =>
          canvas.toBlob(res, "image/png")
        );
        folder.file(`${stripExt(f.name)}.png`, blob);
      } else {
        const blob = await new Promise((res) =>
          canvas.toBlob(res, "image/jpeg", jpgQuality)
        );
        folder.file(`${stripExt(f.name)}.jpg`, blob);
      }
    }

    const blobZip = await zip.generateAsync({ type: "blob" });
    saveAs(blobZip, "memories.zip");
  }

  function stripExt(name) {
    return name.replace(/\.[^/.]+$/, "");
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  // === per-file actions ===
  async function downloadSingle(f) {
    const canvas = await renderToCanvas(f.url, f, {
      brightness,
      contrast,
      saturation,
      hue,
    });
    if (exportFormat === "png") {
      canvas.toBlob(
        (blob) => saveAs(blob, `${stripExt(f.name)}.png`),
        "image/png"
      );
    } else {
      canvas.toBlob(
        (blob) => saveAs(blob, `${stripExt(f.name)}.jpg`),
        "image/jpeg",
        jpgQuality
      );
    }
  }

  function rotateFile(fId, dir = 90) {
    setFiles((prev) =>
      prev.map((p) =>
        p.id === fId ? { ...p, rotate: (p.rotate + dir) % 360 } : p
      )
    );
  }

  function removeFile(fId) {
    setFiles((prev) => {
      const next = prev.filter((p) => p.id !== fId);
      setSelectedIds((s) => {
        const copy = new Set(s);
        copy.delete(fId);
        return copy;
      });
      return next;
    });
  }

  function resetFile(fId) {
    setFiles((prev) =>
      prev.map((p) =>
        p.id === fId
          ? { ...p, url: p.originalUrl, rotate: 0, scale: 1 }
          : p
      )
    );
  }

  function toggleSelect(fId) {
    setSelectedIds((s) => {
      const copy = new Set(s);
      if (copy.has(fId)) copy.delete(fId);
      else copy.add(fId);
      return copy;
    });
  }

  function removeSelected() {
    setFiles((prev) => prev.filter((p) => !selectedIds.has(p.id)));
    setSelectedIds(new Set());
  }

  async function downloadSelected() {
    if (selectedIds.size === 1) {
      const id = [...selectedIds][0];
      const f = files.find((x) => x.id === id);
      if (f) await downloadSingle(f);
      return;
    }
    const zip = new JSZip();
    const folder = zip.folder("edited_images");
    const toExport = files.filter((f) => selectedIds.has(f.id));
    for (const f of toExport) {
      const canvas = await renderToCanvas(f.url, f, {
        brightness,
        contrast,
        saturation,
        hue,
      });
      if (exportFormat === "png") {
        const blob = await new Promise((res) =>
          canvas.toBlob(res, "image/png")
        );
        folder.file(`${stripExt(f.name)}.png`, blob);
      } else {
        const blob = await new Promise((res) =>
          canvas.toBlob(res, "image/jpeg", jpgQuality)
        );
        folder.file(`${stripExt(f.name)}.jpg`, blob);
      }
    }
    const blobZip = await zip.generateAsync({ type: "blob" });
    saveAs(blobZip, "sogni_selected_edit.zip");
  }

  // Presets
  function applyPreset(preset) {
    if (preset === "auto") {
      setBrightness(1.05);
      setContrast(1.08);
      setSaturation(1.12);
      setHue(0);
    } else if (preset === "bw") {
      setBrightness(1);
      setContrast(1.05);
      setSaturation(0);
      setHue(0);
    } else if (preset === "vintage") {
      setBrightness(0.98);
      setContrast(0.95);
      setSaturation(0.85);
      setHue(5);
    } else if (preset === "tang") {
      setBrightness(1.04);
      setContrast(1.06);
      setSaturation(1.35);
      setHue(18);
    }
  }

  function resetAllEdits() {
    setBrightness(1);
    setContrast(1);
    setSaturation(1);
    setHue(0);
    setExportFormat("png");
    setJpgQuality(0.9);
    setFiles((prev) =>
      prev.map((p) => ({
        ...p,
        rotate: 0,
        scale: 1,
        url: p.originalUrl,
      }))
    );
    setSelectedIds(new Set());
  }
  return (
    <>
      <style>{`
        /* Biar gak ada putih di belakang, tinggi full 100% */
        html, body {
          height: 100%;
          margin: 0;
        }

        body {
          font-family: Tahoma, Verdana, sans-serif;
          background-image: url("/assets/background.png");
          background-repeat: no-repeat;
          background-position: center;
          background-size: cover;       /* 🟢 skala ikut layar */
          background-attachment: fixed;

        }
        
        /* mirip layout di faq: di-center & ada jarak atas/bawah */
        .windows-layout {
          display: flex;
          gap: 20px;
          max-width: 1200px;
          margin: 100px auto 40px;
          padding: 0 20px;
         
          
          
        }
        
        
        /* base window */
        .xp-window {
          background: #ece9d8;
          border: 2px solid #999;
          border-radius: 6px;
          box-shadow: inset 1px 1px #fff, inset -1px -1px #555;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        
        /* kiri jangan terlalu kurus, punya minimal lebar */
.xp-window.xp-left {
  flex: 0 0 40%;
  max-width: 420px;
  min-width: 260px;   
}

/* kanan tetap lebih gede secara keseluruhan */
.xp-window.xp-right {
  
  flex: 0 1 60%;
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
          padding: 6px 10px;
          font-weight: bold;
          color: #002b88;
          cursor: pointer;
          border-radius: 3px;
        }
        
        /* biar tombol upload rapi di tengah, ga kejepit */
        .upload-zone .btn {
          margin-top: 12px;
          display: inline-block;
        }
        
        .btn:hover { background: #d0e0ff; }
        
        .upload-zone {
          border: 2px dashed #0078d7;
          border-radius: 6px;
          padding: 30px;
          text-align: center;
          margin-bottom: 16px;
          background: #f8f8f8;
          transition: background 0.2s ease;
        }
        
        .upload-zone.drag-over {
          background: #e0f0ff;
        }
        
        .preview-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 10px;
        }
        
        .preview-grid img {
          width: 100%;
          border-radius: 6px;
          border: 1px solid #777;
        }
        
        .slider-group { margin-bottom: 12px; }
        .mini-actions { display:flex; gap:6px; justify-content:center; margin-top:6px; }
        .small-btn { padding:4px 6px; font-size:12px; border-radius:6px; }
        .checkbox { transform:scale(1.05); margin-right:12px; margin-left:6px; }
        
        /* HP: layout tetap dua kolom tapi lebih rapat */
        @media (max-width: 768px) {
          .windows-layout {
            margin: 80px auto 20px;
            padding: 0 12px;
            gap: 12px;
          }
        }
        

        @media (max-width: 480px) {
          .windows-layout {
            gap: 8px;
          }
          .preview-grid {
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          }
          .btn {
            font-size: 12px;
            padding: 5px 8px;
          }
        }
      `}</style>

      <Navbar />

      <main className="edit-page">
        <div className="windows-layout">
          {/* Left Panel: Controls */}
          <div className="xp-window xp-left">
            <div className="xp-titlebar">🎛️ Adjustments</div>
            <div className="xp-content">
              <div ref={dropRef} className="upload-zone">
                <p>🖼️ Drop your images here or click below to upload</p>
                <input
                  id="file_input"
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: "none" }}
                  onChange={(e) => handleFiles(e.target.files)}
                />
                <label htmlFor="file_input" className="btn">
                  Choose Files
                </label>
              </div>

              {files.length > 0 && (
                <>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      marginBottom: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <button className="btn" onClick={() => applyPreset("auto")}>
                      Auto Enhance
                    </button>
                    <button className="btn" onClick={() => applyPreset("bw")}>
                      B/W
                    </button>
                    <button
                      className="btn"
                      onClick={() => applyPreset("vintage")}
                    >
                      Vintage
                    </button>
                    <button className="btn" onClick={() => applyPreset("tang")}>
                      Tang Gang
                    </button>

                    <button className="btn" onClick={resetAllEdits}>
                      Reset All
                    </button>
                  </div>

                  <div className="slider-group">
                    <label>Brightness: {Number(brightness).toFixed(2)}</label>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.01"
                      value={brightness}
                      onChange={(e) =>
                        setBrightness(Number(e.target.value))
                      }
                    />
                  </div>

                  <div className="slider-group">
                    <label>Hue: {hue}°</label>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      step="1"
                      value={hue}
                      onChange={(e) => setHue(Number(e.target.value))}
                    />
                  </div>

                  <div className="slider-group">
                    <label>Contrast: {Number(contrast).toFixed(2)}</label>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.01"
                      value={contrast}
                      onChange={(e) =>
                        setContrast(Number(e.target.value))
                      }
                    />
                  </div>

                  <div className="slider-group">
                    <label>Saturation: {Number(saturation).toFixed(2)}</label>
                    <input
                      type="range"
                      min="0"
                      max="3"
                      step="0.01"
                      value={saturation}
                      onChange={(e) =>
                        setSaturation(Number(e.target.value))
                      }
                    />
                  </div>

                  <div style={{ marginTop: 8, marginBottom: 12 }}>
                    <label style={{ marginRight: 8 }}>Export format:</label>
                    <select
                      value={exportFormat}
                      onChange={(e) => setExportFormat(e.target.value)}
                    >
                      <option value="png">PNG</option>
                      <option value="jpg">JPG</option>
                    </select>

                    {exportFormat === "jpg" && (
                      <span style={{ marginLeft: 12 }}>
                        Quality:
                        <input
                          type="range"
                          min="0.5"
                          max="1"
                          step="0.01"
                          value={jpgQuality}
                          onChange={(e) =>
                            setJpgQuality(Number(e.target.value))
                          }
                          style={{
                            verticalAlign: "middle",
                            marginLeft: 6,
                          }}
                        />
                        {Number(jpgQuality).toFixed(2)}
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      marginBottom: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <button className="btn" onClick={handleSaveAll}>
                      💾 Save All (.zip)
                    </button>
                    <button
                      className="btn"
                      onClick={downloadSelected}
                      disabled={selectedIds.size === 0}
                    >
                      ⬇️ Download Selected
                    </button>
                    <button
                      className="btn"
                      onClick={removeSelected}
                      disabled={selectedIds.size === 0}
                    >
                      🗑️ Remove Selected
                    </button>
                  </div>

                  <div
                    style={{
                      fontSize: 13,
                      color: "#444",
                      marginBottom: 8,
                    }}
                  >
                    Tip: click the checkbox for each image to select multiple
                    files.
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right Panel: Preview */}
          <div className="xp-window xp-right">
            <div className="xp-titlebar">🖼️ Preview</div>
            <div className="xp-content">
              {files.length === 0 ? (
                <p style={{ color: "#555" }}>No images uploaded yet.</p>
              ) : (
                <div className="preview-grid">
                  {files.map((f) => (
                    <div key={f.id} style={{ textAlign: "center" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <input
                          className="checkbox"
                          type="checkbox"
                          checked={selectedIds.has(f.id)}
                          onChange={() => toggleSelect(f.id)}
                          title="Select image"
                        />
                        <img
                          src={f.url}
                          alt={f.name}
                          style={{
                            filter: `brightness(${brightness}) contrast(${contrast}) saturate(${saturation}) hue-rotate(${hue}deg)`,
                            transform: `rotate(${f.rotate}deg) scale(${
                              f.scale || 1
                            })`,
                          }}
                        />
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          textAlign: "center",
                          marginTop: 6,
                          color: "#222",
                        }}
                      >
                        {f.name}
                      </div>

                      <div className="mini-actions">
                        <button
                          className="small-btn btn"
                          onClick={() => rotateFile(f.id, -90)}
                        >
                          ↺
                        </button>
                        <button
                          className="small-btn btn"
                          onClick={() => rotateFile(f.id, 90)}
                        >
                          ↻
                        </button>
                        <button
                          className="small-btn btn"
                          onClick={() => downloadSingle(f)}
                        >
                          ⤓
                        </button>
                        <button
                          className="small-btn btn"
                          onClick={() => removeFile(f.id)}
                          style={{
                            background: "#ffd6d6",
                            borderColor: "#d66",
                          }}
                        >
                          ✖
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer nempel di bawah, masih di atas wallpaper */}
        <Footer />
      </main>
    </>
  )};

