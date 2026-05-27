import { motion, AnimatePresence } from "framer-motion";
import type { Job, OutputFormat } from "../lib/types";
import { FORMATS } from "../lib/types";

function formatExtension(format: OutputFormat): string {
  return FORMATS.find((f) => f.value === format)?.extension ?? "";
}

function FileIcon({ status, id }: { status: Job["status"]; id: string }) {
  const isProcessing = status === "processing";
  const gradId = `fg-${id}`;
  return (
    <motion.div
      animate={
        isProcessing
          ? {
              boxShadow: [
                "0 0 8px rgba(125,44,227,0.2)",
                "0 0 16px rgba(125,44,227,0.4)",
                "0 0 8px rgba(125,44,227,0.2)",
              ],
            }
          : {}
      }
      transition={isProcessing ? { duration: 1.5, repeat: Infinity } : {}}
      className="glass-card"
      style={{
        width: 40,
        height: 40,
        borderRadius: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <defs>
          <linearGradient id={gradId} x1="4" y1="22" x2="20" y2="2">
            <stop stopColor="#04BFCB" />
            <stop offset="1" stopColor="#7D2CE3" />
          </linearGradient>
        </defs>
        <path
          d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z"
          stroke={`url(#${gradId})`}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M14 2V8H20"
          stroke={`url(#${gradId})`}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </motion.div>
  );
}

function StatusLabel({
  status,
  error,
  targetExt,
}: {
  status: Job["status"];
  error?: string;
  targetExt: string;
}) {
  const base: React.CSSProperties = {
    fontSize: 12,
    lineHeight: 1.3,
    marginTop: 4,
  };
  switch (status) {
    case "queued":
      return <p style={{ ...base, opacity: 0.3 }}>Queued</p>;
    case "processing":
      return (
        <motion.p
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{ ...base, color: "#04BFCB" }}
        >
          Converting to {targetExt}...
        </motion.p>
      );
    case "done":
      return (
        <motion.p
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          style={{ ...base, display: "flex", alignItems: "center", gap: 5 }}
          className="text-success"
        >
          <motion.svg
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 20 }}
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
          >
            <path
              d="M2.5 6L5 8.5L9.5 3.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.svg>
          Completed
        </motion.p>
      );
    case "error":
      return (
        <div>
          <p style={base} className="text-error">
            Failed
          </p>
          {error && (
            <p
              style={{
                fontSize: 10,
                opacity: 0.5,
                marginTop: 2,
                lineHeight: 1.3,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={error}
            >
              {error}
            </p>
          )}
        </div>
      );
  }
}

interface Props {
  jobs: Job[];
  targetFormat: OutputFormat;
}

export function JobList({ jobs, targetFormat }: Props) {
  if (!jobs.length) return null;

  const targetExt = formatExtension(targetFormat);

  return (
    <div
      style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}
      role="list"
      aria-label="Conversion files"
    >
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          minHeight: 0,
        }}
      >
        <AnimatePresence initial={false}>
          {jobs.map((job, i) => (
            <motion.div
              key={job.id}
              role="listitem"
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.35,
                delay: Math.min(i * 0.05, 0.5),
                ease: [0.22, 1, 0.36, 1],
              }}
              whileHover={{ backgroundColor: "rgba(255,255,255,0.08)" }}
              className={`glass-card ${job.status === "processing" ? "shimmer" : ""}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 18px",
                borderRadius: 14,
              }}
            >
              <FileIcon status={job.status} id={job.id} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    lineHeight: 1.2,
                  }}
                >
                  {job.fileName}
                </p>
                <StatusLabel
                  status={job.status}
                  error={job.error}
                  targetExt={targetExt}
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
