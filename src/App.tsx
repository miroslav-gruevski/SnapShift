import { useState, useEffect, useCallback, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { motion, AnimatePresence } from "framer-motion";

import { DropZone } from "./components/DropZone";
import { FormatSelector } from "./components/FormatSelector";
import { JobList } from "./components/JobList";
import { convertFiles, cancelConversion, revealOutput } from "./lib/converter";
import type {
  OutputFormat,
  Job,
  ConversionProgress,
  BatchResult,
} from "./lib/types";
import {
  FORMAT_LABELS,
  getAvailableFormats,
  isMacOS,
} from "./lib/types";

let jobIdCounter = 0;
function nextJobId() {
  jobIdCounter += 1;
  return `job-${jobIdCounter}`;
}

function useWebviewWindow() {
  const [win, setWin] = useState<Awaited<
    typeof import("@tauri-apps/api/webviewWindow")
  > | null>(null);
  useEffect(() => {
    import("@tauri-apps/api/webviewWindow")
      .then((mod) => setWin(mod))
      .catch((err) => console.error("load webview module failed:", err));
  }, []);
  return win;
}

function hideWindow() {
  import("@tauri-apps/api/window")
    .then((mod) => mod.getCurrentWindow().hide())
    .catch((err) => console.error("hide window failed:", err));
}

function resizeWindow(w: number, h: number) {
  import("@tauri-apps/api/window")
    .then((mod) => {
      mod.getCurrentWindow().setSize(new mod.LogicalSize(w, h));
    })
    .catch((err) => console.error("resize window failed:", err));
}

const FORMAT_STORAGE_KEY = "snapshift-format";
const LEGACY_FORMAT_STORAGE_KEY = "miro-converter-format";

function readSavedFormat(): OutputFormat | null {
  try {
    const saved =
      localStorage.getItem(FORMAT_STORAGE_KEY) ??
      localStorage.getItem(LEGACY_FORMAT_STORAGE_KEY);
    if (saved && saved in FORMAT_LABELS) {
      const f = saved as OutputFormat;
      if (f === "heic" && !isMacOS()) return "jpeg";
      return f;
    }
  } catch (err) {
    console.error("read format preference failed:", err);
  }
  return null;
}

function App() {
  const [format, setFormat] = useState<OutputFormat>(
    () => readSavedFormat() ?? "jpeg"
  );
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [outputDir, setOutputDir] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const convertingRef = useRef(false);
  const resizeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const webviewMod = useWebviewWindow();

  // Persist format selection
  useEffect(() => {
    try {
      localStorage.setItem(FORMAT_STORAGE_KEY, format);
    } catch (err) {
      console.error("save format preference failed:", err);
    }
  }, [format]);

  // Clear warning when format changes
  useEffect(() => { setWarning(null); }, [format]);

  useEffect(() => {
    if (!webviewMod) return;
    let unlisten: (() => void) | undefined;
    try {
      webviewMod
        .getCurrentWebviewWindow()
        .onDragDropEvent((event) => {
          if (event.payload.type === "enter" || event.payload.type === "over")
            setIsDragging(true);
          else if (event.payload.type === "leave") setIsDragging(false);
          else if (event.payload.type === "drop") {
            setIsDragging(false);
            if (event.payload.paths.length > 0 && !convertingRef.current)
              startConversion(event.payload.paths);
          }
        })
        .then((fn) => {
          unlisten = fn;
        });
    } catch (err) {
      console.error("drag-drop setup failed:", err);
    }
    return () => unlisten?.();
  }, [webviewMod]);

  useEffect(() => {
    const p = listen<ConversionProgress>("conversion-progress", (e) => {
      const { file, status, error: err } = e.payload;
      setJobs((prev) => {
        const idx = prev.findIndex((j) => j.fileName === file);
        if (idx >= 0) {
          const u = [...prev];
          u[idx] = {
            ...u[idx],
            status: status as Job["status"],
            error: err ?? undefined,
          };
          return u;
        }
        const entry: Job = {
          id: nextJobId(),
          fileName: file,
          status: status as Job["status"],
          error: err ?? undefined,
        };
        return [...prev, entry];
      });
    });
    const c = listen<BatchResult>("conversion-complete", (e) => {
      const dir = e.payload.output_dir;
      setOutputDir(dir || null);
      convertingRef.current = false;
    });
    return () => {
      p.then((fn) => fn());
      c.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") hideWindow();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // Debounced bi-directional resize
  useEffect(() => {
    if (resizeTimer.current) clearTimeout(resizeTimer.current);
    resizeTimer.current = setTimeout(() => {
      const defaultW = 340;
      const defaultH = 460;
      const baseH = 280;
      const perFile = 72;

      if (jobs.length === 0) {
        resizeWindow(defaultW, defaultH);
        return;
      }

      const longestName = Math.max(...jobs.map((j) => j.fileName.length), 0);
      const neededW = Math.min(Math.max(defaultW, longestName * 7.5 + 140), 500);
      const neededH = baseH + jobs.length * perFile;
      const maxH = window.screen.availHeight * 0.8;

      resizeWindow(Math.round(neededW), Math.min(neededH, maxH));
    }, 200);
    return () => {
      if (resizeTimer.current) clearTimeout(resizeTimer.current);
    };
  }, [jobs.length]);

  const startConversion = useCallback(
    async (paths: string[]) => {
      convertingRef.current = true;
      setJobs([]);
      setOutputDir(null);
      setWarning(null);
      setError(null);
      try {
        const result = await convertFiles(paths, format, 100);
        if (result.total_files === 0) {
          setWarning(
            `Files are already ${FORMAT_LABELS[format]}. Switch to a different format.`
          );
          convertingRef.current = false;
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Conversion failed unexpectedly"
        );
        convertingRef.current = false;
      }
    },
    [format]
  );

  const handleCancel = useCallback(async () => {
    try {
      await cancelConversion();
      convertingRef.current = false;
    } catch (err) {
      console.error("cancel conversion failed:", err);
    }
  }, []);

  const browseFiles = useCallback(async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        multiple: true,
        filters: [
          {
            name: "Images",
            extensions: [
              "heic","heif","avif","jpg","jpeg","png","webp","tiff","tif","bmp","gif",
            ],
          },
        ],
      });
      if (selected && !convertingRef.current) {
        const paths = Array.isArray(selected) ? selected : [selected];
        startConversion(paths);
      }
    } catch (err) {
      console.error("browse files failed:", err);
    }
  }, [startConversion]);

  const handleReset = useCallback(() => {
    convertingRef.current = false;
    setJobs([]);
    setOutputDir(null);
    setWarning(null);
    setError(null);
  }, []);

  const allDone =
    jobs.length > 0 &&
    jobs.every((j) => j.status === "done" || j.status === "error");
  const doneCount = jobs.filter((j) => j.status === "done").length;
  const errorCount = jobs.filter((j) => j.status === "error").length;
  const isConverting =
    jobs.length > 0 && jobs.some((j) => j.status === "processing" || j.status === "queued");
  const totalFiles = jobs.length;

  const otherFormats = getAvailableFormats()
    .map((f) => f.value)
    .filter((f) => f !== format);

  return (
    <div data-tauri-drag-region className="h-full relative">
      {/* Drag handle layer behind all content */}
      <div
        data-tauri-drag-region
        style={{ position: 'absolute', inset: 0, zIndex: 0 }}
      />
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="h-full flex flex-col overflow-hidden relative"
      style={{ zIndex: 1 }}
    >
      {/* Header */}
      <div data-tauri-drag-region style={{ padding: "24px 28px 18px" }}>
        <div
          data-tauri-drag-region
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <div
            data-tauri-drag-region
            style={{ display: "flex", alignItems: "center", gap: 14 }}
          >
            <motion.div
              animate={{
                boxShadow: [
                  "0 2px 12px rgba(125,44,227,0.25), 0 1px 6px rgba(4,191,203,0.15)",
                  "0 4px 20px rgba(125,44,227,0.4), 0 2px 10px rgba(4,191,203,0.25)",
                  "0 2px 12px rgba(125,44,227,0.25), 0 1px 6px rgba(4,191,203,0.15)",
                ],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              style={{
                width: 44,
                height: 44,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 12,
              }}
            >
              <img
                src="/miro's_app_logo.svg"
                alt="Logo"
                style={{ width: 44, height: 44, borderRadius: 12 }}
                draggable={false}
              />
            </motion.div>
            <div data-tauri-drag-region>
              <h1
                data-tauri-drag-region
                style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.2 }}
              >
                SnapShift
              </h1>
              <p
                data-tauri-drag-region
                style={{
                  fontSize: 13,
                  marginTop: 3,
                  opacity: 0.4,
                  lineHeight: 1.3,
                }}
              >
                Convert to {FORMAT_LABELS[format]}
              </p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.15, backgroundColor: "rgba(255,255,255,0.14)" }}
            whileTap={{ scale: 0.85 }}
            onClick={hideWindow}
            className="glass-btn"
            tabIndex={0}
            aria-label="Close window"
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              cursor: "pointer",
              color: "inherit",
              marginTop: 2,
              opacity: 0.5,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M2 2L10 10M10 2L2 10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </motion.button>
        </div>
      </div>

      {/* Format selector */}
      <div style={{ padding: "0 28px 16px" }}>
        <FormatSelector value={format} onChange={setFormat} />
      </div>

      {/* Warning banner */}
      <AnimatePresence>
        {warning && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ padding: "0 28px", overflow: "hidden" }}
          >
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                marginBottom: 12,
                background: "rgba(251,191,36,0.1)",
                border: "1px solid rgba(251,191,36,0.15)",
                fontSize: 12,
              }}
            >
              <p style={{ opacity: 0.85, marginBottom: 8 }}>{warning}</p>
              <div style={{ display: "flex", gap: 6 }}>
                  {otherFormats.map((f) => (
                  <motion.button
                    key={f}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setFormat(f)}
                    tabIndex={0}
                    aria-label={`Switch to ${FORMAT_LABELS[f]}`}
                    style={{
                      padding: "4px 12px",
                      borderRadius: 8,
                      fontSize: 11,
                      fontWeight: 600,
                      border: "none",
                      cursor: "pointer",
                      background: "rgba(255,255,255,0.1)",
                      color: "inherit",
                    }}
                  >
                    {FORMAT_LABELS[f]}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ padding: "0 28px", overflow: "hidden" }}
          >
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                marginBottom: 12,
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.15)",
                fontSize: 12,
                opacity: 0.85,
              }}
              role="alert"
              aria-live="assertive"
            >
              {error}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div
        data-tauri-drag-region
        style={{ padding: "0 28px 12px", flex: 1, minHeight: 0 }}
      >
        {jobs.length === 0 ? (
          <DropZone isDragging={isDragging} onBrowse={browseFiles} />
        ) : (
          <JobList jobs={jobs} targetFormat={format} />
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: "10px 28px 24px" }} aria-live="polite">
        <AnimatePresence mode="wait">
          {allDone && outputDir ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                style={{ fontSize: 12, textAlign: "center" }}
              >
                {doneCount} file{doneCount !== 1 ? "s" : ""} converted
                {errorCount > 0 && `, ${errorCount} failed`}
              </motion.p>
              <div style={{ display: "flex", gap: 10 }}>
                <motion.button
                  whileHover={{
                    scale: 1.02,
                    boxShadow: "0 4px 24px rgba(125,44,227,0.4), 0 2px 10px rgba(4,191,203,0.2)",
                  }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => revealOutput(outputDir)}
                  tabIndex={0}
                  aria-label="Open output folder"
                  style={{
                    flex: 1,
                    height: 42,
                    borderRadius: 12,
                    fontSize: 14,
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                    color: "#fff",
                  }}
                  className="brand-btn"
                >
                  Open Folder
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleReset}
                  tabIndex={0}
                  aria-label="Start new conversion"
                  className="glass-btn"
                  style={{
                    height: 42,
                    padding: "0 22px",
                    borderRadius: 12,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    color: "inherit",
                  }}
                >
                  New
                </motion.button>
              </div>
            </motion.div>
          ) : isConverting ? (
            <motion.div
              key="converting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    repeat: Infinity,
                    duration: 1,
                    ease: "linear",
                  }}
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 7,
                    border: "2px solid transparent",
                    borderTopColor: "var(--color-accent)",
                  }}
                />
                <span
                  style={{ fontSize: 12 }}
                  className="text-accent font-medium"
                >
                  {doneCount} of {totalFiles} files
                </span>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCancel}
                tabIndex={0}
                aria-label="Cancel conversion"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--color-error)",
                  opacity: 0.7,
                  padding: "4px 12px",
                }}
              >
                Cancel
              </motion.button>
            </motion.div>
          ) : jobs.length === 0 && !warning ? (
            <motion.p
              key="hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              style={{ fontSize: 12, textAlign: "center", padding: "6px 0" }}
            >
              Drag files or folders onto this window
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Drag overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "absolute",
              inset: 16,
              zIndex: 50,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 14,
              border: "2px dashed rgba(4,191,203,0.4)",
              background: "rgba(4,191,203,0.06)",
              backdropFilter: "blur(8px)",
            }}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300 }}
              style={{ textAlign: "center" }}
            >
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                style={{ fontSize: 32, marginBottom: 8 }}
              >
                ↓
              </motion.div>
              <p
                style={{ fontSize: 15, fontWeight: 600 }}
                className="text-accent"
              >
                Drop to convert
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
    </div>
  );
}

export default App;
