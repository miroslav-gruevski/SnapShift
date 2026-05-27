import { motion } from "framer-motion";
import type { OutputFormat } from "../lib/types";
import { getAvailableFormats } from "../lib/types";

interface Props {
  value: OutputFormat;
  onChange: (f: OutputFormat) => void;
}

export function FormatSelector({ value, onChange }: Props) {
  const formats = getAvailableFormats();

  return (
    <div
      role="radiogroup"
      aria-label="Output format"
      className="glass-seg"
      style={{ display: "flex", gap: 6, padding: 5, borderRadius: 14 }}
    >
      {formats.map((fmt) => (
        <motion.button
          key={fmt.value}
          role="radio"
          aria-checked={value === fmt.value}
          aria-label={fmt.label}
          tabIndex={0}
          onClick={() => onChange(fmt.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onChange(fmt.value);
            }
          }}
          whileHover={{
            backgroundColor:
              value !== fmt.value ? "rgba(192,171,237,0.08)" : undefined,
          }}
          whileTap={{ scale: 0.95 }}
          style={{
            flex: 1,
            height: 36,
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 10,
            border: "none",
            background: "none",
            cursor: "pointer",
            position: "relative",
            zIndex: 1,
            color: "inherit",
            outline: "none",
          }}
          className="focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-1"
        >
          {value === fmt.value && (
            <motion.div
              layoutId="seg"
              className="glass-card"
              style={{ position: "absolute", inset: 0, borderRadius: 10 }}
              transition={{ type: "spring", stiffness: 500, damping: 32 }}
            />
          )}
          <motion.span
            animate={{ opacity: value === fmt.value ? 0.95 : 0.35 }}
            transition={{ duration: 0.15 }}
            style={{ position: "relative", zIndex: 2 }}
          >
            {fmt.label}
          </motion.span>
        </motion.button>
      ))}
    </div>
  );
}
